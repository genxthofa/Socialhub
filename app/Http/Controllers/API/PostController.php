<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Models\Post;
use App\Models\SocialAccount;
use App\Jobs\PublishPost;
use App\Models\AuditLog;
use Carbon\Carbon;

class PostController extends Controller
{
    /**
     * List posts with optional filters.
     */
    public function index(Request $request)
    {
        $query = Post::where('user_id', $request->user()->id)
            ->with('socialAccount')
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('platform')) {
            $query->whereHas('socialAccount', fn ($q) => $q->where('platform', $request->platform));
        }
        if ($request->has('search')) {
            $query->where('content', 'like', "%{$request->search}%");
        }

        $posts = $query->paginate($request->get('per_page', 20));

        return response()->json(['success' => true, 'data' => $posts]);
    }

    /**
     * Create/draft a post.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'posts'                   => 'required|array|min:1',
            'posts.*.social_account_id' => 'required|exists:social_accounts,id',
            'posts.*.content'         => 'nullable|string|max:63206',
            'posts.*.hashtags'        => 'nullable|string',
            'posts.*.link'            => 'nullable|url',
            'posts.*.status'          => 'required|in:draft,scheduled,publish_now',
            'posts.*.scheduled_at'    => 'required_if:posts.*.status,scheduled|nullable|date',
            'scheduled_at'            => 'required_if:status,scheduled|nullable|date',
            'post_type'               => 'required|in:text,image,video,carousel',
            'media_base64'            => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $accountIds = collect($request->posts)->pluck('social_account_id')->unique()->toArray();
        
        // Check account ownership for all requested accounts
        $accounts = SocialAccount::where('user_id', $request->user()->id)
            ->whereIn('id', $accountIds)
            ->where('status', 'active')
            ->get();

        if ($accounts->isEmpty() || $accounts->count() !== count($accountIds)) {
            return response()->json(['success' => false, 'message' => 'One or more social accounts not found or inactive.'], 404);
        }

        $mediaPath = null;
        if ($request->has('media_base64') && $request->media_base64) {
            $base64Data = $request->media_base64;
            // Example format: data:image/png;base64,iVBORw0KGgo...
            if (strpos($base64Data, ';base64,') !== false) {
                list($type, $data) = explode(';', $base64Data);
                list(, $data)      = explode(',', $data);
                $data = base64_decode($data);
                
                $mimeType = explode(':', $type)[1] ?? 'image/jpeg';
                $extension = explode('/', $mimeType)[1] ?? 'jpg';
                if ($extension === 'jpeg') $extension = 'jpg';
                
                $filename = uniqid('media_', true) . '.' . $extension;
                $uploadPath = public_path('uploads/posts');
                if (!\File::exists($uploadPath)) {
                    \File::makeDirectory($uploadPath, 0755, true);
                }
                \File::put($uploadPath . '/' . $filename, $data);
                $mediaPath = '/uploads/posts/' . $filename;
            } else {
                $mediaPath = $base64Data;
            }
        }

        $createdPosts = [];

        foreach ($request->posts as $postData) {
            $account = $accounts->firstWhere('id', $postData['social_account_id']);
            
            $post = Post::create([
                'user_id'           => $request->user()->id,
                'social_account_id' => $account->id,
                'content'           => $postData['content'] ?? null,
                'hashtags'          => $postData['hashtags'] ?? null,
                'link'              => $postData['link'] ?? null,
                'post_type'         => $request->post_type,
                'media_path'        => $mediaPath,
                'status'            => $postData['status'] === 'publish_now' ? 'queued' : ($postData['status'] ?? 'draft'),
                'scheduled_at'      => $postData['status'] === 'scheduled' ? Carbon::parse($postData['scheduled_at'])->setTimezone(config('app.timezone')) : null,
            ]);

            if ($postData['status'] === 'publish_now') {
                PublishPost::dispatchSync($post);
                $post->refresh();
            } elseif ($postData['status'] === 'scheduled') {
                PublishPost::dispatch($post)->delay(Carbon::parse($postData['scheduled_at'])->setTimezone(config('app.timezone')));
            }

            AuditLog::create([
                'user_id'     => $request->user()->id,
                'action'      => 'post.create',
                'module'      => 'Content',
                'description' => "Post created for {$account->platform}: {$account->account_name}",
                'ip_address'  => $request->ip(),
            ]);

            $createdPosts[] = $post->load('socialAccount');
        }

        return response()->json(['success' => true, 'posts' => $createdPosts], 201);
    }

    /**
     * Show single post.
     */
    public function show(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)
            ->with(['socialAccount'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'post' => $post]);
    }

    /**
     * Update draft or scheduled post.
     */
    public function update(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)
            ->whereIn('status', ['draft', 'scheduled', 'failed', 'rejected', 'paused'])
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'social_account_id' => 'required|exists:social_accounts,id',
            'content'           => 'required_without:media|nullable|string|max:63206',
            'hashtags'          => 'nullable|string',
            'link'              => 'nullable|url',
            'post_type'         => 'required|in:text,image,video,carousel',
            'media_base64'      => 'nullable|string',
            'status'            => 'required|in:draft,scheduled,publish_now',
            'scheduled_at'      => 'required_if:status,scheduled|nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $account = SocialAccount::where('user_id', $request->user()->id)
            ->where('id', $request->social_account_id)
            ->where('status', 'active')
            ->first();

        if (!$account) {
            return response()->json(['success' => false, 'message' => 'Social account not found or inactive.'], 404);
        }

        $mediaPath = $post->media_path;
        if ($request->has('media_base64') && $request->media_base64) {
            $base64Data = $request->media_base64;
            if (strpos($base64Data, ';base64,') !== false) {
                list($type, $data) = explode(';', $base64Data);
                list(, $data)      = explode(',', $data);
                $data = base64_decode($data);
                
                $mimeType = explode(':', $type)[1] ?? 'image/jpeg';
                $extension = explode('/', $mimeType)[1] ?? 'jpg';
                if ($extension === 'jpeg') $extension = 'jpg';
                
                $filename = uniqid('media_', true) . '.' . $extension;
                $uploadPath = public_path('uploads/posts');
                if (!\File::exists($uploadPath)) {
                    \File::makeDirectory($uploadPath, 0755, true);
                }
                \File::put($uploadPath . '/' . $filename, $data);
                $mediaPath = '/uploads/posts/' . $filename;
            }
        }

        $post->update([
            'social_account_id' => $request->social_account_id,
            'content'           => $request->content,
            'hashtags'          => $request->hashtags,
            'link'              => $request->link,
            'post_type'         => $request->post_type,
            'media_path'        => $mediaPath,
            'status'            => $request->status === 'publish_now' ? 'queued' : ($request->status ?? 'draft'),
            'scheduled_at'      => $request->status === 'scheduled' ? Carbon::parse($request->scheduled_at)->setTimezone(config('app.timezone')) : null,
        ]);

        if ($request->status === 'publish_now') {
            PublishPost::dispatchSync($post);
        } elseif ($request->status === 'scheduled') {
            PublishPost::dispatch($post)->delay(Carbon::parse($request->scheduled_at)->setTimezone(config('app.timezone')));
        }

        return response()->json(['success' => true, 'post' => $post->fresh()]);
    }

    /**
     * Delete post.
     */
    public function destroy(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)->with('socialAccount')->findOrFail($id);
        
        // Attempt to delete from social platform if it was published
        if ($post->status === 'published' && $post->platform_post_id && $post->socialAccount) {
            $platformPostId = $post->platform_post_id;
            $account = $post->socialAccount;
            $token = \Illuminate\Support\Facades\Crypt::decryptString($account->access_token);

            dispatch(function () use ($platformPostId, $account, $token) {
                try {
                    if ($account->platform === 'facebook') {
                        \Illuminate\Support\Facades\Http::withoutVerifying()
                            ->delete("https://graph.facebook.com/v19.0/{$platformPostId}?access_token={$token}");
                    } elseif ($account->platform === 'linkedin') {
                        \Illuminate\Support\Facades\Http::withoutVerifying()
                            ->withToken($token)
                            ->withHeaders(['X-Restli-Protocol-Version' => '2.0.0'])
                            ->delete("https://api.linkedin.com/v2/ugcPosts/{$platformPostId}");
                    }
                    // Note: Instagram Graph API does not officially support deleting media via API.
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Failed to delete social post {$platformPostId}: " . $e->getMessage());
                }
            })->afterResponse();
        }

        $post->delete();

        return response()->json(['success' => true, 'message' => 'Post deleted.']);
    }

    /**
     * Immediately publish post.
     */
    public function publish(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)
            ->whereIn('status', ['draft', 'failed', 'cancelled'])
            ->findOrFail($id);

        $post->update(['status' => 'queued', 'scheduled_at' => null]);
        PublishPost::dispatchSync($post);

        return response()->json(['success' => true, 'message' => 'Post queued for publishing.', 'post' => $post->fresh()]);
    }

    /**
     * Schedule a post.
     */
    public function schedule(Request $request, int $id)
    {
        $validator = Validator::make($request->all(), [
            'scheduled_at' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $post = Post::where('user_id', $request->user()->id)
            ->whereIn('status', ['draft'])
            ->findOrFail($id);

        $post->update([
            'status'       => 'scheduled',
            'scheduled_at' => Carbon::parse($request->scheduled_at)->setTimezone(config('app.timezone')),
        ]);

        PublishPost::dispatch($post)->delay(Carbon::parse($request->scheduled_at)->setTimezone(config('app.timezone')));

        return response()->json(['success' => true, 'post' => $post->fresh()]);
    }

    /**
     * Cancel a scheduled post.
     */
    public function cancel(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)
            ->where('status', 'scheduled')
            ->findOrFail($id);

        $post->update(['status' => 'cancelled']);

        return response()->json(['success' => true, 'message' => 'Post cancelled.']);
    }

    /**
     * Retry a failed post.
     */
    public function retry(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)
            ->where('status', 'failed')
            ->findOrFail($id);

        $post->update(['status' => 'queued', 'error_message' => null, 'retry_count' => $post->retry_count + 1]);
        PublishPost::dispatchSync($post);

        return response()->json(['success' => true, 'message' => 'Retry queued.', 'post' => $post->fresh()]);
    }

    /**
     * Get post publishing status.
     */
    public function status(Request $request, int $id)
    {
        $post = Post::where('user_id', $request->user()->id)->findOrFail($id);

        return response()->json([
            'success'       => true,
            'status'        => $post->status,
            'published_at'  => $post->published_at,
            'error_message' => $post->error_message,
            'platform_id'   => $post->platform_post_id,
        ]);
    }

    /**
     * Calendar view: posts grouped by date.
     */
    public function calendar(Request $request)
    {
        $month  = $request->get('month', now()->month);
        $year   = $request->get('year', now()->year);

        $start = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        $posts = Post::where('user_id', $request->user()->id)
            ->with('socialAccount')
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('scheduled_at', [$start, $end])
                  ->orWhereBetween('published_at', [$start, $end]);
            })
            ->get()
            ->groupBy(fn ($p) => ($p->scheduled_at ?? $p->published_at)?->format('Y-m-d'));

        return response()->json(['success' => true, 'calendar' => $posts]);
    }
}
