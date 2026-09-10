<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Models\SocialAccount;
use App\Models\AuditLog;

class GoogleAccountController extends Controller
{
    private function getGoogleClient()
    {
        $client = new \Google\Client();
        $client->setClientId(env('GOOGLE_CLIENT_ID'));
        $client->setClientSecret(env('GOOGLE_CLIENT_SECRET'));
        $client->setRedirectUri(env('GOOGLE_GMB_REDIRECT_URI', env('APP_URL') . '/api/oauth/google-business/callback'));
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        
        // Disable SSL verification for local Windows development to prevent cURL error 60
        $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);
        $client->setHttpClient($guzzleClient);

        return $client;
    }

    public function oauthGoogleBusinessUrl(Request $request)
    {
        $target = $request->query('target', 'gmb');
        $userId = $request->user() ? $request->user()->id : 1;
        $state = base64_encode(json_encode(['user_id' => $userId, 'target' => $target]));

        $client = $this->getGoogleClient();
        $client->setState($state);
        
        if ($target === 'google_ads') {
            $client->addScope('https://www.googleapis.com/auth/adwords');
        } else {
            $client->addScope('https://www.googleapis.com/auth/business.manage');
        }

        return response()->json(['url' => $client->createAuthUrl()]);
    }
    
    public function oauthGoogleAdsUrl(Request $request)
    {
        $request->merge(['target' => 'google_ads']);
        return $this->oauthGoogleBusinessUrl($request);
    }

    public function oauthGoogleBusinessCallback(Request $request)
    {
        $frontendUrl = rtrim(env('FRONTEND_URL') ?: url('/'), '/');
        if ($request->has('error') || !$request->has('state')) {
            return redirect($frontendUrl . '/accounts?error=oauth_failed');
        }

        try {
            $stateData = json_decode(base64_decode($request->state), true);
        } catch (\Exception $e) {
            $stateData = null;
        }

        if (!$stateData || !isset($stateData['user_id'])) {
            \Log::error('Google callback invalid state error: Failed to decode state');
            return redirect($frontendUrl . '/accounts?error=invalid_state');
        }

        $user = \App\Models\User::find($stateData['user_id']);
        $target = $stateData['target'] ?? 'gmb';

        $client = $this->getGoogleClient();
        
        try {
            $token = $client->fetchAccessTokenWithAuthCode($request->code);
            if (isset($token['error'])) {
                throw new \Exception($token['error_description'] ?? $token['error']);
            }
        } catch (\Exception $e) {
            \Log::error('Google token exchange failed: ' . $e->getMessage());
            return redirect($frontendUrl . '/accounts?error=token_exchange_failed');
        }

        $client->setAccessToken($token);
        $accessToken = $token['access_token'];
        $refreshToken = $token['refresh_token'] ?? null;

        $pendingAccounts = [];

        if ($target === 'google_ads') {
            // Fetch real accessible Google Ads customer accounts
            $developerToken = env('GOOGLE_ADS_DEVELOPER_TOKEN');
            $managerAccountId = env('GOOGLE_ADS_MANAGER_ACCOUNT_ID');

            $customersResponse = Http::withoutVerifying()
                ->withToken($accessToken)
                ->withHeaders([
                    'developer-token' => $developerToken,
                    'login-customer-id' => $managerAccountId,
                ])
                ->get('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers');

            \Log::info('Google Ads accessible customers response', [
                'status' => $customersResponse->status(),
                'body'   => $customersResponse->body(),
            ]);

            if ($customersResponse->ok() && isset($customersResponse->json()['resourceNames'])) {
                foreach ($customersResponse->json()['resourceNames'] as $resourceName) {
                    $customerId = str_replace('customers/', '', $resourceName);
                    
                    // Fetch customer details
                    $detailsResponse = Http::withoutVerifying()
                        ->withToken($accessToken)
                        ->withHeaders(['developer-token' => $developerToken])
                        ->get("https://googleads.googleapis.com/v17/{$resourceName}");

                    $customerName = $detailsResponse->ok()
                        ? ($detailsResponse->json()['descriptiveName'] ?? "Google Ads #$customerId")
                        : "Google Ads #$customerId";

                    $pendingAccounts[] = [
                        'id'                  => 'gads_' . $customerId,
                        'platform'            => 'google_ads',
                        'platform_account_id' => $customerId,
                        'account_name'        => $customerName,
                        'platform_type'       => 'google_ads',
                        'access_token'        => Crypt::encryptString($accessToken),
                        'refresh_token'       => $refreshToken ? Crypt::encryptString($refreshToken) : null,
                    ];
                }
            }

            // Fallback: create a generic account entry if API fails
            if (empty($pendingAccounts)) {
                \Log::info('Google Ads: Could not fetch accounts, creating generic entry.');
                $pendingAccounts[] = [
                    'id'                  => 'gads_' . Str::random(10),
                    'platform'            => 'google_ads',
                    'platform_account_id' => env('GOOGLE_ADS_CUSTOMER_ID', 'PENDING'),
                    'account_name'        => 'Google Ads Account',
                    'platform_type'       => 'google_ads',
                    'access_token'        => Crypt::encryptString($accessToken),
                    'refresh_token'       => $refreshToken ? Crypt::encryptString($refreshToken) : null,
                ];
            }
        } else {
            // Fetch GMB Locations
            $response = Http::withoutVerifying()->withToken($accessToken)
                ->get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
            
            if ($response->ok()) {
                $accounts = $response->json()['accounts'] ?? [];
                
                if (empty($accounts)) {
                    \Log::info('Google My Business: User has no accounts linked to this profile.', ['response' => $response->json()]);
                }

                foreach ($accounts as $acc) {
                    $locationsResponse = Http::withoutVerifying()->withToken($accessToken)
                        ->get("https://mybusinessbusinessinformation.googleapis.com/v1/{$acc['name']}/locations");
                    
                    if ($locationsResponse->ok() && isset($locationsResponse->json()['locations'])) {
                        $locations = $locationsResponse->json()['locations'];
                        foreach ($locations as $loc) {
                            $pendingAccounts[] = [
                                'id'            => 'gmb_' . str_replace('locations/', '', $loc['name']),
                                'platform'      => 'gmb',
                                'platform_account_id' => $loc['name'], // e.g., locations/12345
                                'account_name'  => $loc['title'],
                                'platform_type' => 'gmb_location',
                                'access_token'  => Crypt::encryptString($accessToken),
                                'refresh_token' => $refreshToken ? Crypt::encryptString($refreshToken) : null,
                            ];
                        }
                    } else {
                        \Log::error('Google My Business locations fetch failed for account ' . $acc['name'], [
                            'status' => $locationsResponse->status(),
                            'body' => $locationsResponse->body()
                        ]);
                    }
                }
            } else {
                \Log::error('Google My Business accounts fetch failed.', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        }

        if (empty($pendingAccounts)) {
            return redirect($frontendUrl . '/accounts?error=no_accounts_found');
        }

        $cacheKey = (string) Str::uuid();
        Cache::put("google_pending_{$cacheKey}", $pendingAccounts, now()->addMinutes(15));

        return redirect($frontendUrl . '/accounts?select_google=' . $cacheKey);
    }

    public function getGoogleLocations(Request $request)
    {
        $key = $request->query('key');
        if (!$key || !Cache::has("google_pending_{$key}")) {
            return response()->json(['success' => false, 'error' => 'Session expired or invalid key'], 400);
        }

        $accounts = Cache::get("google_pending_{$key}");
        $safeAccounts = array_map(function ($acc) {
            unset($acc['access_token']);
            unset($acc['refresh_token']);
            return $acc;
        }, $accounts);

        return response()->json(['success' => true, 'accounts' => $safeAccounts]);
    }

    public function confirmGoogleAccounts(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
            'selected_ids' => 'required|array',
        ]);

        $key = $request->input('key');
        $selectedIds = $request->input('selected_ids');

        if (!Cache::has("google_pending_{$key}")) {
            return response()->json(['success' => false, 'error' => 'Session expired'], 400);
        }

        $accounts = Cache::get("google_pending_{$key}");
        $user = $request->user();

        $savedAccounts = [];

        foreach ($accounts as $acc) {
            if (in_array($acc['id'], $selectedIds)) {
                $savedAccounts[] = SocialAccount::withTrashed()->updateOrCreate(
                    ['platform' => $acc['platform'], 'platform_account_id' => $acc['platform_account_id'], 'user_id' => $user->id],
                    [
                        'account_name'  => $acc['account_name'],
                        'platform_type' => $acc['platform_type'],
                        'access_token'  => $acc['access_token'],
                        'refresh_token' => $acc['refresh_token'] ?? null,
                        'status'        => 'active',
                        'connected_at'  => now(),
                        'deleted_at'    => null,
                    ]
                );
            }
        }

        Cache::forget("google_pending_{$key}");

        AuditLog::create([
            'user_id'     => $user->id,
            'action'      => 'account.connect',
            'module'      => 'Accounts',
            'description' => count($savedAccounts) . ' Google accounts connected.',
            'ip_address'  => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Accounts connected successfully',
        ]);
    }
    
    public function confirmGoogleAds(Request $request)
    {
        return $this->confirmGoogleAccounts($request);
    }
}
