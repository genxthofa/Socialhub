<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\SocialAccountController;
use App\Http\Controllers\API\PostController;
use App\Http\Controllers\API\MediaController;
use App\Http\Controllers\API\CampaignController;
use App\Http\Controllers\API\AnalyticsController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\WebhookController;
use App\Http\Controllers\API\GoogleAccountController;

/*
|--------------------------------------------------------------------------
| API Routes — SocialHub
|--------------------------------------------------------------------------
*/

// ─── Public Routes ─────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/verify-email/{token}', [AuthController::class, 'verifyEmail']);
});

// ─── OAuth Callbacks (no auth required) ────────────────────────────────────
Route::prefix('oauth')->group(function () {
    Route::get('/facebook/callback', [SocialAccountController::class, 'oauthMetaCallback']);
    Route::get('/instagram', [SocialAccountController::class, 'oauthInstagram']);
    Route::get('/instagram/callback', [SocialAccountController::class, 'oauthInstagramCallback']);
    Route::get('/linkedin/callback', [SocialAccountController::class, 'oauthLinkedInCallback']);
    Route::get('/google-business/callback', [GoogleAccountController::class, 'oauthGoogleBusinessCallback']);
});

// ─── Google SSO (matching Google Console config) ───────────────────────────
Route::prefix('auth')->group(function () {
    Route::get('/google', [AuthController::class, 'oauthGoogle']);
    Route::get('/google/callback', [AuthController::class, 'oauthGoogleCallback']);
});

// ─── Webhooks (signature verified, no JWT) ─────────────────────────────────
Route::prefix('webhooks')->group(function () {
    Route::post('/facebook', [WebhookController::class, 'facebook']);
    Route::get('/facebook', [WebhookController::class, 'facebookVerify']); // Meta challenge
    Route::post('/instagram', [WebhookController::class, 'instagram']);
    Route::post('/linkedin', [WebhookController::class, 'linkedin']);
});

// ─── Protected Routes (JWT) ─────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);
    Route::get('/auth/sessions', [AuthController::class, 'sessions']);
    Route::delete('/auth/sessions/{id}', [AuthController::class, 'revokeSession']);

    // Social Accounts
    Route::prefix('social')->group(function () {
        Route::get('/accounts', [SocialAccountController::class, 'index']);
        Route::post('/accounts/{id}/reconnect', [SocialAccountController::class, 'reconnect']);
        Route::delete('/accounts/{id}', [SocialAccountController::class, 'disconnect']);
        
        // Meta OAuth Initialization
        Route::get('/meta/url', [SocialAccountController::class, 'oauthMetaUrl']);
        Route::get('/meta/pending', [SocialAccountController::class, 'getPendingMetaAccounts']);
        Route::post('/meta/confirm', [SocialAccountController::class, 'confirmMetaAccounts']);
        
        // LinkedIn OAuth Initialization
        Route::get('/oauth/linkedin', [SocialAccountController::class, 'oauthLinkedIn']);
        
        // Google Business & Ads
        Route::get('/google-business/url', [GoogleAccountController::class, 'oauthGoogleBusinessUrl']);
        Route::get('/google-business/locations', [GoogleAccountController::class, 'getGoogleLocations']);
        Route::post('/google-business/confirm', [GoogleAccountController::class, 'confirmGoogleAccounts']);
        Route::get('/google-ads/url', [GoogleAccountController::class, 'oauthGoogleAdsUrl']);
        Route::post('/google-ads/confirm', [GoogleAccountController::class, 'confirmGoogleAds']);
        
        Route::get('/accounts/{id}', [SocialAccountController::class, 'show']);
        Route::get('/accounts/{id}/status', [SocialAccountController::class, 'checkStatus']);
    });

    // Posts
    Route::prefix('posts')->group(function () {
        Route::get('/', [PostController::class, 'index']);
        Route::post('/', [PostController::class, 'store']);
        Route::get('/{id}', [PostController::class, 'show']);
        Route::put('/{id}', [PostController::class, 'update']);
        Route::delete('/{id}', [PostController::class, 'destroy']);
        Route::post('/{id}/publish', [PostController::class, 'publish']);
        Route::post('/{id}/schedule', [PostController::class, 'schedule']);
        Route::post('/{id}/cancel', [PostController::class, 'cancel']);
        Route::post('/{id}/retry', [PostController::class, 'retry']);
        Route::get('/{id}/status', [PostController::class, 'status']);
    });

    // Calendar
    Route::get('/calendar', [PostController::class, 'calendar']);

    // Media
    Route::prefix('media')->group(function () {
        Route::get('/', [MediaController::class, 'index']);
        Route::post('/upload', [MediaController::class, 'upload']);
        Route::delete('/{id}', [MediaController::class, 'destroy']);
        Route::delete('/bulk', [MediaController::class, 'bulkDelete']);
    });

    // Campaigns
    Route::prefix('campaigns')->group(function () {
        Route::get('/', [CampaignController::class, 'index']);
        Route::post('/', [CampaignController::class, 'store']);
        Route::get('/{id}', [CampaignController::class, 'show']);
        Route::put('/{id}', [CampaignController::class, 'update']);
        Route::delete('/{id}', [CampaignController::class, 'destroy']);
        Route::post('/{id}/pause', [CampaignController::class, 'pause']);
        Route::post('/{id}/resume', [CampaignController::class, 'resume']);
        Route::post('/{id}/duplicate', [CampaignController::class, 'duplicate']);
        Route::get('/{id}/analytics', [CampaignController::class, 'analytics']);
    });

    // Analytics
    Route::prefix('analytics')->group(function () {
        Route::get('/overview', [AnalyticsController::class, 'index']);
        Route::get('/organic', [AnalyticsController::class, 'index']);
        Route::get('/advertising', [AnalyticsController::class, 'index']);
        Route::get('/posts/{postId}', [AnalyticsController::class, 'postAnalytics']);
        Route::get('/accounts/{accountId}', [AnalyticsController::class, 'accountAnalytics']);
        Route::post('/sync', [AnalyticsController::class, 'syncNow']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::put('/{id}/read', [NotificationController::class, 'markRead']);
        Route::put('/read-all', [NotificationController::class, 'markAllRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    // Admin routes removed
});
