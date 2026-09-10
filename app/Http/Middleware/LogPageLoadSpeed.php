<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LogPageLoadSpeed
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $duration = microtime(true) - $startTime;
        
        // Log the time if it takes more than 100ms or if you want to track everything
        Log::info(sprintf('[Performance] %s %s completed in %.4f seconds', $request->method(), $request->fullUrl(), $duration));
        
        return $response;
    }
}
