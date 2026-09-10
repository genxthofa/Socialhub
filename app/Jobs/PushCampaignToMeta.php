<?php

namespace App\Jobs;

use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushCampaignToMeta implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $campaign;

    public function __construct(Campaign $campaign)
    {
        $this->campaign = $campaign;
    }

    public function handle()
    {
        // Load relationships
        $this->campaign->load('socialAccount');
        $account = $this->campaign->socialAccount;

        if (!$account || !$account->access_token) {
            $this->campaign->update(['status' => 'rejected']);
            Log::error("Campaign {$this->campaign->id} failed: No valid social account access token.");
            return;
        }

        // Multi-tenant protection: .env fallback is strictly isolated to owner (user_id 1)
        $isOwner = ($this->campaign->user_id == 1);

        $adAccountId = $account->platform_account_id;
        if (!$adAccountId && $isOwner) {
            $adAccountId = env('META_AD_ACCOUNT_ID');
        }

        if (!$adAccountId) {
            $this->campaign->update(['status' => 'rejected']);
            Log::error("Campaign {$this->campaign->id} failed: User has not connected a Meta Ad Account.");
            return;
        }

        $formattedAdAccountId = str_starts_with($adAccountId, 'act_') ? $adAccountId : "act_{$adAccountId}";
        $baseUrl = "https://graph.facebook.com/v19.0/{$formattedAdAccountId}";

        $accessToken = $account->access_token;
        if (!$accessToken && $isOwner) {
            $accessToken = env('META_ACCESS_TOKEN');
        }

        try {
            // 1. Create Campaign
            $campaignResponse = Http::withoutVerifying()->post("{$baseUrl}/campaigns", [
                'name' => $this->campaign->name,
                'objective' => 'OUTCOME_ENGAGEMENT', // Defaulting to engagement for MVP
                'status' => 'PAUSED', // Start paused to allow manual review if needed
                'special_ad_categories' => ['NONE'],
                'access_token' => $accessToken,
            ]);

            if (!$campaignResponse->successful()) {
                throw new \Exception('Failed to create Meta Campaign: ' . $campaignResponse->body());
            }
            $metaCampaignId = $campaignResponse->json('id');
            $this->campaign->update(['platform_campaign_id' => $metaCampaignId]);

            // 2. Create Ad Set
            $budgetInCents = intval($this->campaign->budget * 100);
            $adSetResponse = Http::withoutVerifying()->post("{$baseUrl}/adsets", [
                'name' => "{$this->campaign->name} - AdSet",
                'campaign_id' => $metaCampaignId,
                'daily_budget' => $budgetInCents,
                'billing_event' => 'IMPRESSIONS',
                'optimization_goal' => 'POST_ENGAGEMENT',
                'bid_amount' => 2,
                'targeting' => [
                    'geo_locations' => ['countries' => ['US']], // Simplified targeting for MVP
                ],
                'status' => 'PAUSED',
                'access_token' => $accessToken,
            ]);

            if (!$adSetResponse->successful()) {
                throw new \Exception('Failed to create Meta Ad Set: ' . $adSetResponse->body());
            }
            $metaAdSetId = $adSetResponse->json('id');

            // 3. Create Ad Creative
            // Since we don't have a reliable page_id from the user's connection yet, 
            // and require a valid page to run ads, this step will often fail in a pure test env 
            // without a real page. We'll pass a mock/test structure.
            $pageId = $account->platform_account_id; 

            $creativeResponse = Http::withoutVerifying()->post("{$baseUrl}/adcreatives", [
                'name' => "{$this->campaign->name} - Creative",
                'object_story_spec' => [
                    'page_id' => $pageId,
                    'link_data' => [
                        'message' => $this->campaign->primary_text ?? 'Check this out!',
                        'link' => $this->campaign->destination_url ?? 'https://example.com',
                        'name' => $this->campaign->headline ?? 'Learn More',
                    ]
                ],
                'access_token' => $accessToken,
            ]);

            if (!$creativeResponse->successful()) {
                throw new \Exception('Failed to create Meta Ad Creative: ' . $creativeResponse->body());
            }
            $metaCreativeId = $creativeResponse->json('id');

            // 4. Create Ad
            $adResponse = Http::withoutVerifying()->post("{$baseUrl}/ads", [
                'name' => "{$this->campaign->name} - Ad",
                'adset_id' => $metaAdSetId,
                'creative' => ['creative_id' => $metaCreativeId],
                'status' => 'PAUSED',
                'access_token' => $accessToken,
            ]);

            if (!$adResponse->successful()) {
                throw new \Exception('Failed to create Meta Ad: ' . $adResponse->body());
            }

            // Success!
            $this->campaign->update(['status' => 'active']);
            Log::info("Successfully pushed Campaign {$this->campaign->id} to Meta.");

        } catch (\Exception $e) {
            $this->campaign->update(['status' => 'rejected']);
            Log::error($e->getMessage());
        }
    }
}
