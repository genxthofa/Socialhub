<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Campaign;
use App\Models\AdSet;
use App\Models\Ad;
use App\Models\AuditLog;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = Campaign::where('user_id', $request->user()->id)
            ->with(['socialAccount'])
            ->latest()
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $campaigns]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'platforms'         => 'required|array|min:1',
            'platforms.*'       => 'in:facebook,instagram,linkedin',
            'name'              => 'required|string|max:255',
            'objective'         => 'required|string',
            'budget'            => 'required|numeric|min:1',
            'budget_type'       => 'required|in:daily,lifetime',
            'start_date'        => 'required|date',
            'locations'         => 'required|array',
            'primary_text'      => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $platforms = $request->platforms;
        $splitBudget = count($platforms) > 0 ? $request->budget / count($platforms) : $request->budget;

        $createdCampaigns = [];

        foreach ($platforms as $platform) {
            // Find the connected social account for this platform
            $socialAccount = \App\Models\SocialAccount::where('user_id', $request->user()->id)
                ->where('platform', $platform)
                ->first();

            // Auto-link using .env fallback ONLY for owner account (user_id 1)
            if (!$socialAccount && $request->user()->id == 1) {
                $socialAccount = \App\Models\SocialAccount::create([
                    'user_id'             => $request->user()->id,
                    'platform'            => $platform,
                    'account_name'        => $request->user()->name ?? 'Connected Account',
                    'platform_account_id' => env('META_AD_ACCOUNT_ID', '133771114350619'),
                    'access_token'        => env('META_ACCESS_TOKEN'),
                    'status'              => 'active',
                    'connected_at'        => now(),
                ]);
            }

            $campaign = Campaign::create([
                'user_id'           => $request->user()->id,
                'social_account_id' => $socialAccount->id,
                'name'              => $request->name . (count($platforms) > 1 ? ' - ' . ucfirst($platform) : ''),
                'platform'          => $platform,
                'objective'         => $request->objective,
                'budget'            => $splitBudget,
                'budget_type'       => $request->budget_type,
                'start_date'        => $request->start_date,
                'end_date'          => $request->end_date,
                'status'            => 'pending_review',
                
                // Ad details mapped
                'locations'         => $request->locations,
                'age_min'           => $request->age_min ?? 18,
                'age_max'           => $request->age_max ?? 65,
                'gender'            => $request->gender ?? 'all',
                'interests'         => $request->interests,
                
                'primary_text'      => $request->primary_text,
                'headline'          => $request->headline,
                'description'       => $request->description,
                'cta'               => $request->cta ?? 'Learn More',
                'destination_url'   => $request->destination_url,
                'ad_media_path'     => $request->ad_media_path,
            ]);

            // Create initial AdSet & Ad
            $adset = AdSet::create([
                'campaign_id' => $campaign->id,
                'name'        => 'Ad Set 1',
                'status'      => 'active'
            ]);

            Ad::create([
                'ad_set_id' => $adset->id,
                'name'      => 'Ad 1',
                'status'    => 'active'
            ]);

            AuditLog::create([
                'user_id'     => $request->user()->id,
                'action'      => 'campaign.create',
                'module'      => 'Advertising',
                'description' => "Created campaign: {$campaign->name}",
                'ip_address'  => $request->ip(),
            ]);

            // Only push to Meta for Facebook and Instagram synchronously
            if (in_array($platform, ['facebook', 'instagram'])) {
                try {
                    \App\Jobs\PushCampaignToMeta::dispatchSync($campaign);
                } catch (\Throwable $e) {
                    \Log::error("Meta Campaign push error: " . $e->getMessage());
                }
            }
            
            // Push to Google Ads synchronously
            if ($platform === 'google_ads') {
                try {
                    \App\Jobs\PushCampaignToGoogle::dispatchSync($campaign);
                } catch (\Throwable $e) {
                    \Log::error("Google Ads Campaign push error: " . $e->getMessage());
                }
            }

            $createdCampaigns[] = $campaign;
        }

        if (count($createdCampaigns) === 0) {
            return response()->json(['success' => false, 'message' => 'No connected social accounts found for selected platforms'], 400);
        }

        return response()->json(['success' => true, 'data' => $createdCampaigns], 201);
    }

    public function show(Request $request, int $id)
    {
        $campaign = Campaign::where('user_id', $request->user()->id)->findOrFail($id);
        return response()->json(['success' => true, 'campaign' => $campaign]);
    }

    public function pause(Request $request, int $id)
    {
        $campaign = Campaign::where('user_id', $request->user()->id)->findOrFail($id);
        $campaign->update(['status' => 'paused']);
        return response()->json(['success' => true, 'message' => 'Campaign paused.']);
    }

    public function resume(Request $request, int $id)
    {
        $campaign = Campaign::where('user_id', $request->user()->id)->findOrFail($id);
        $campaign->update(['status' => 'active']);
        return response()->json(['success' => true, 'message' => 'Campaign resumed.']);
    }
}
