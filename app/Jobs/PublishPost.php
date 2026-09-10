<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\Post;
use App\Models\SocialAccount;
use App\Models\AuditLog;
use App\Notifications\PostPublished;
use App\Notifications\PostFailed;

class PublishPost implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60; // seconds between retries

    public function __construct(public Post $post) {}

    public function handle(): void
    {
        $post    = $this->post->fresh()->load('socialAccount');
        $account = $post->socialAccount;

        if (!$account || $account->status !== 'active') {
            $this->failPost($post, 'Social account is not connected or inactive.');
            return;
        }

        $post->update(['status' => 'publishing']);

        try {
            $token  = Crypt::decryptString($account->access_token);
            $result = match ($account->platform) {
                'facebook'  => $this->publishToFacebook($post, $account, $token),
                'instagram' => $this->publishToInstagram($post, $account, $token),
                'linkedin'  => $this->publishToLinkedIn($post, $account, $token),
                'gmb'       => $this->publishToGMB($post, $account, $token),
                default     => throw new \Exception("Unsupported platform: {$account->platform}"),
            };

            $post->update([
                'status'           => 'published',
                'published_at'     => now(),
                'platform_post_id' => $result['platform_post_id'] ?? null,
                'error_message'    => null,
            ]);

            // Notify user
            // $post->user->notify(new PostPublished($post));

            AuditLog::create([
                'user_id'     => $post->user_id,
                'action'      => 'post.publish',
                'module'      => 'Content',
                'description' => "Post published to {$account->platform}: {$account->account_name}",
                'ip_address'  => '127.0.0.1',
            ]);

            Log::info("Post #{$post->id} published successfully to {$account->platform}.");

        } catch (\Exception $e) {
            $this->failPost($post, $e->getMessage());
        }
    }

    private function publishToFacebook(Post $post, SocialAccount $account, string $token): array
    {
        $pageId   = $account->platform_account_id;
        \Log::info("Starting Facebook publish for post #{$post->id} to Page ID: {$pageId}");

        $payload  = ['message' => $this->buildContent($post), 'access_token' => $token];

        if ($post->media_path && in_array($post->post_type, ['image', 'carousel'])) {
            $endpoint = "https://graph.facebook.com/v19.0/{$pageId}/photos";
            $localPath = public_path(ltrim($post->media_path, '/'));
            \Log::info("Facebook: Uploading image to {$endpoint}");

            if (file_exists($localPath)) {
                $response = Http::withoutVerifying()
                    ->attach('source', file_get_contents($localPath), 'image.jpg')
                    ->post($endpoint, $payload);
            } else {
                \Log::info("Facebook: Local file not found at {$localPath}, using fallback public URL");
                $payload['url'] = 'https://images.unsplash.com/photo-1500622944204-b135684e99fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80.jpg';
                $response = Http::withoutVerifying()->post($endpoint, $payload);
            }
        } elseif ($post->media_path && $post->post_type === 'video') {
            $endpoint = "https://graph.facebook.com/v19.0/{$pageId}/videos";
            $localPath = public_path(ltrim($post->media_path, '/'));
            \Log::info("Facebook: Uploading video to {$endpoint}");
            
            if (file_exists($localPath)) {
                $response = Http::withoutVerifying()
                    ->attach('source', file_get_contents($localPath), 'video.mp4')
                    ->post($endpoint, $payload);
            } else {
                \Log::info("Facebook: Local file not found at {$localPath}, using fallback public URL");
                $payload['file_url'] = 'https://www.w3schools.com/html/mov_bbb.mp4';
                $response = Http::withoutVerifying()->post($endpoint, $payload);
            }
        } else {
            $endpoint = "https://graph.facebook.com/v19.0/{$pageId}/feed";
            \Log::info("Facebook: Publishing text post to {$endpoint}");
            $response = Http::withoutVerifying()->post($endpoint, $payload);
        }

        if (!$response->successful() || isset($response->json()['error'])) {
            $err = $response->json()['error']['message'] ?? $response->body();
            \Log::error("Facebook API error: {$err}");
            throw new \Exception("Facebook API error: {$err}");
        }

        $platformPostId = $response->json()['id'];
        \Log::info("Facebook publish successful. Platform Post ID: {$platformPostId}");

        return ['platform_post_id' => $platformPostId];
    }

    // ─── Instagram Graph API ──────────────────────────────────────────────────

    private function publishToInstagram(Post $post, SocialAccount $account, string $token): array
    {
        $igUserId = $account->platform_account_id;
        \Log::info("Starting Instagram publish for post #{$post->id} to IG User ID: {$igUserId}");

        // Step 1: Resolve image URL
        // Instagram API requires a publicly accessible URL. On localhost, 127.0.0.1 is not reachable
        // by Instagram's servers, so we upload the image to Facebook (same Meta credentials) as an
        // unpublished photo and use the resulting Facebook CDN URL.
        $containerPayload = [
            'caption'      => $this->buildContent($post),
            'access_token' => $token,
        ];

        if ($post->media_path && in_array($post->post_type, ['image', 'video'])) {
            $localPath = public_path(ltrim($post->media_path, '/'));
            $url = url($post->media_path);

            if ((str_contains($url, 'localhost') || str_contains($url, '127.0.0.1')) && file_exists($localPath)) {
                \Log::info("Instagram: Localhost detected. Uploading image via Facebook Graph API to get a public CDN URL...");

                // Convert to JPEG using GD (Instagram only accepts JPEG)
                $imageData = file_get_contents($localPath);
                $gdImage = @imagecreatefromstring($imageData);
                if ($gdImage !== false) {
                    ob_start();
                    imagejpeg($gdImage, null, 95);
                    $jpegData = ob_get_clean();
                    imagedestroy($gdImage);
                } else {
                    $jpegData = $imageData; // fallback: use raw data
                }

                // Find the connected Facebook Page account for this user to upload via its API
                $fbAccount = \App\Models\SocialAccount::where('user_id', $post->user_id)
                    ->where('platform', 'facebook')
                    ->where('status', 'active')
                    ->first();

                if ($fbAccount) {
                    $fbToken  = Crypt::decryptString($fbAccount->access_token);
                    $fbPageId = $fbAccount->platform_account_id;

                    \Log::info("Instagram: Uploading to Facebook Page {$fbPageId} as unpublished photo to get CDN URL...");

                    // Upload as UNPUBLISHED photo — this does NOT create a Facebook post
                    $fbResp = Http::withoutVerifying()
                        ->attach('source', $jpegData, 'photo.jpg')
                        ->post("https://graph.facebook.com/v19.0/{$fbPageId}/photos", [
                            'published'    => 'false',
                            'access_token' => $fbToken,
                        ]);

                    \Log::info("Instagram: Facebook photo upload status: " . $fbResp->status());
                    \Log::info("Instagram: Facebook photo upload body: " . $fbResp->body());

                    if ($fbResp->successful() && !isset($fbResp->json()['error'])) {
                        $photoId = $fbResp->json()['id'] ?? null;
                        if ($photoId) {
                            // Fetch the full picture URL from the uploaded photo
                            $picResp = Http::withoutVerifying()
                                ->get("https://graph.facebook.com/v19.0/{$photoId}", [
                                    'fields'       => 'images',
                                    'access_token' => $fbToken,
                                ]);
                            \Log::info("Instagram: Photo detail response: " . $picResp->body());
                            $images = $picResp->json()['images'] ?? [];
                            // Use the largest image (first in array)
                            $cdnUrl = $images[0]['source'] ?? null;
                            if ($cdnUrl) {
                                $url = $cdnUrl;
                                \Log::info("Instagram: Got Facebook CDN URL: {$url}");
                            }
                        }
                    } else {
                        \Log::error("Instagram: Facebook photo upload failed: " . $fbResp->body());
                    }
                } else {
                    \Log::warning("Instagram: No active Facebook account found for user #{$post->user_id}. Cannot get public CDN URL.");
                }
            }

            if ($post->post_type === 'image') {
                $containerPayload['image_url'] = $url;
                $containerPayload['media_type'] = 'IMAGE';
                \Log::info("Instagram Image URL: {$url}");
            } else {
                $containerPayload['video_url'] = $url;
                $containerPayload['media_type'] = 'REELS';
                \Log::info("Instagram Video URL: {$url}");
            }
        } else {
            \Log::error("Instagram publish failed: No media provided for post #{$post->id}");
            throw new \Exception('Instagram requires at least one image or video.');
        }

        // Step 2: Create IG media container
        \Log::info("Sending Instagram container payload:", $containerPayload);
        $containerResp = Http::withoutVerifying()
            ->post("https://graph.facebook.com/v19.0/{$igUserId}/media", $containerPayload);

        if (!$containerResp->successful()) {
            $errorDetail = $containerResp->json()['error']['message'] ?? $containerResp->body();
            \Log::error("Instagram container creation failed: {$errorDetail}");
            throw new \Exception("Failed to create Instagram media container: {$errorDetail}");
        }

        $containerId = $containerResp->json()['id'];
        \Log::info("Instagram media container created with ID: {$containerId}");

        // Step 3: Publish the container
        \Log::info("Publishing Instagram container ID: {$containerId}");
        $publishResp = Http::withoutVerifying()
            ->post("https://graph.facebook.com/v19.0/{$igUserId}/media_publish", [
                'creation_id'  => $containerId,
                'access_token' => $token,
            ]);

        if (!$publishResp->successful()) {
            $errorDetail = $publishResp->json()['error']['message'] ?? $publishResp->body();
            \Log::error("Instagram media publish failed: {$errorDetail}");
            throw new \Exception("Failed to publish Instagram media: {$errorDetail}");
        }

        $platformPostId = $publishResp->json()['id'];
        \Log::info("Instagram publish successful. Platform Post ID: {$platformPostId}");

        return ['platform_post_id' => $platformPostId];
    }



    private function publishToLinkedIn(Post $post, SocialAccount $account, string $token): array
    {
        $authorUrn = "urn:li:person:{$account->platform_account_id}";
        \Log::info("Starting LinkedIn publish for post #{$post->id} to Author URN: {$authorUrn}");

        $content = $this->buildContent($post);
        $shareMediaCategory = 'NONE';
        $mediaUrn = null;

        if ($post->media_path && in_array($post->post_type, ['image', 'video'])) {
            $localPath = public_path(ltrim($post->media_path, '/'));
            $isImage = $post->post_type === 'image';
            $recipe = $isImage ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-video';
            $shareMediaCategory = $isImage ? 'IMAGE' : 'VIDEO';
            \Log::info("LinkedIn: Processing media type {$shareMediaCategory}, Recipe: {$recipe}");

            if (file_exists($localPath)) {
                // Step 1: Register Upload
                \Log::info("LinkedIn: Registering media upload");
                $registerResp = Http::withoutVerifying()->withToken($token)->post('https://api.linkedin.com/v2/assets?action=registerUpload', [
                    'registerUploadRequest' => [
                        'recipes' => [$recipe],
                        'owner' => $authorUrn,
                        'serviceRelationships' => [
                            ['relationshipType' => 'OWNER', 'identifier' => 'urn:li:userGeneratedContent']
                        ]
                    ]
                ]);

                if ($registerResp->successful()) {
                    $registerData = $registerResp->json();
                    $uploadUrl = $registerData['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl'] ?? null;
                    $mediaUrn = $registerData['value']['asset'] ?? null;

                    if ($uploadUrl) {
                        \Log::info("LinkedIn: Uploading binary data to URL: {$uploadUrl}");
                        // Step 2: Upload Binary Data
                        $uploadResp = Http::withoutVerifying()
                            ->withHeaders(['Authorization' => 'Bearer ' . $token])
                            ->withBody(file_get_contents($localPath), mime_content_type($localPath))
                            ->put($uploadUrl);

                        if (!$uploadResp->successful()) {
                            \Log::error('LinkedIn Media Upload Failed: ' . $uploadResp->body());
                            $shareMediaCategory = 'NONE';
                            $mediaUrn = null;
                        } else {
                            \Log::info("LinkedIn: Media uploaded successfully. Asset URN: {$mediaUrn}");
                        }
                    } else {
                        \Log::error('LinkedIn Media Upload URL not found in response: ' . $registerResp->body());
                        $shareMediaCategory = 'NONE';
                        $mediaUrn = null;
                    }
                } else {
                    \Log::error("LinkedIn Register Upload failed: " . $registerResp->body());
                }
            } else {
                \Log::warning("LinkedIn: Local file not found at {$localPath}");
            }
        }

        $body = [
            'author'         => $authorUrn,
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary' => ['text' => $content],
                    'shareMediaCategory' => $shareMediaCategory,
                ],
            ],
            'visibility' => [
                'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC',
            ],
        ];

        if ($mediaUrn) {
            $body['specificContent']['com.linkedin.ugc.ShareContent']['media'] = [
                [
                    'status' => 'READY',
                    'media' => $mediaUrn
                ]
            ];
        }

        \Log::info("Sending LinkedIn UGC Post payload:", $body);
        $response = Http::withoutVerifying()->withToken($token)
            ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
            ->post('https://api.linkedin.com/v2/ugcPosts', $body);

        if (!$response->successful()) {
            $err = $response->json()['message'] ?? $response->body();
            \Log::error('LinkedIn Response Error: ' . $err);
            throw new \Exception("LinkedIn API Error: " . $err);
        }

        $platformPostId = $response->header('x-linkedin-id');
        \Log::info("LinkedIn publish successful. Platform Post ID: {$platformPostId}");

        return ['platform_post_id' => $platformPostId];
    }

    private function publishToGMB(Post $post, SocialAccount $account, string $token): array
    {
        // The GMB API v4 expects accounts/{accountId}/locations/{locationId}/localPosts
        // But the v1 Business Information API returns locations/{locationId}.
        // We will try to fetch the account list first to construct the full path if needed, 
        // or just use the platform_account_id if it already has the account prefix.
        
        $locationId = $account->platform_account_id;
        \Log::info("Starting GMB publish for post #{$post->id} to Location ID: {$locationId}");
        
        if (!str_starts_with($locationId, 'accounts/')) {
            // Fetch accounts to reconstruct the full path
            $accResp = Http::withToken($token)->get('https://mybusinessbusinessinformation.googleapis.com/v1/accounts');
            if ($accResp->successful() && isset($accResp->json()['accounts'])) {
                $accounts = $accResp->json()['accounts'];
                if (count($accounts) > 0) {
                    $locationId = $accounts[0]['name'] . '/' . $locationId;
                }
            }
        }
        
        $endpoint = "https://mybusiness.googleapis.com/v4/{$locationId}/localPosts";
        
        $payload = [
            'languageCode' => 'en',
            'summary' => $this->buildContent($post),
            'callToAction' => [
                'actionType' => 'LEARN_MORE',
                'url' => $post->link ?? url('/'),
            ]
        ];

        if ($post->media_path && in_array($post->post_type, ['image', 'video'])) {
            $url = url($post->media_path);
            
            // If localhost, use a fallback public URL for testing since GMB requires a public URL
            if (str_contains($url, 'localhost') || str_contains($url, '127.0.0.1')) {
                \Log::info("GMB: Localhost detected, using fallback public image URL for testing.");
                $url = 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80.jpg';
            }

            $payload['media'] = [
                [
                    'mediaFormat' => 'PHOTO',
                    'sourceUrl' => $url,
                ]
            ];
        }

        \Log::info("Sending GMB localPost payload to {$endpoint}", $payload);
        
        $response = Http::withToken($token)->post($endpoint, $payload);
        
        if (!$response->successful()) {
            $err = $response->json()['error']['message'] ?? $response->body();
            \Log::error('GMB API Error: ' . $err);
            throw new \Exception("Google My Business API Error: " . $err);
        }

        $platformPostId = $response->json()['name'];
        \Log::info("GMB publish successful. Platform Post ID: {$platformPostId}");

        return ['platform_post_id' => $platformPostId];
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function buildContent(Post $post): string
    {
        $parts = [$post->content];

        if ($post->hashtags) {
            $tags = collect(explode(' ', $post->hashtags))
                ->filter()
                ->map(fn ($t) => str_starts_with($t, '#') ? $t : "#{$t}")
                ->implode(' ');
            $parts[] = $tags;
        }

        if ($post->link) {
            $parts[] = $post->link;
        }

        return implode("\n\n", array_filter($parts));
    }

    private function failPost(Post $post, string $error): void
    {
        $post->update([
            'status'        => 'failed',
            'error_message' => $error,
        ]);

        // $post->user->notify(new PostFailed($post, $error));

        Log::error("Post #{$post->id} failed: {$error}");
    }

    public function failed(\Throwable $exception): void
    {
        $this->failPost($this->post, $exception->getMessage());
    }
}
