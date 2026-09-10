<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
use App\Http\Controllers\API\SocialAccountController;

// Catch the Meta OAuth Callback
Route::get('/auth/meta/callback', [SocialAccountController::class, 'oauthMetaCallback']);

// Privacy Policy Route (For Google OAuth Verification)
Route::get('/privacy-policy', function () {
    return view('privacy-policy');
});

// Catch-all route to serve the React application
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
