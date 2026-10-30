<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AddOn;
use App\Models\CustomFeatureRequest;
use App\Models\Order;
use App\Models\Plan;
use App\Services\Billing\EmailNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CommercialAdminController extends Controller
{
    public function __construct(
        private readonly EmailNotificationService $emailService
    ) {}

    private function assertAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }
    }

    /**
     * Commercial sales overview metrics.
     */
    public function overview(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $totalRevenuePaise = (int) Order::where('status', 'paid')->sum('total_amount');
        $paidOrdersCount = Order::where('status', 'paid')->count();
        $pendingOrdersCount = Order::where('status', 'pending_payment')->count();
        $pendingQuotesCount = CustomFeatureRequest::where('status', 'pending_review')->count();

        return response()->json([
            'metrics' => [
                'total_revenue'         => $totalRevenuePaise,
                'total_revenue_fmt'     => '₹' . number_format($totalRevenuePaise / 100),
                'paid_orders_count'     => $paidOrdersCount,
                'pending_orders_count'  => $pendingOrdersCount,
                'pending_quotes_count'  => $pendingQuotesCount,
                'total_packages'        => Plan::count(),
                'active_addons'         => AddOn::where('is_active', true)->count(),
            ],
            'recent_orders' => Order::with(['items', 'package', 'user', 'app'])
                ->latest('id')
                ->take(8)
                ->get()
                ->map(fn (Order $o) => [
                    'id'              => $o->id,
                    'order_number'    => $o->order_number,
                    'customer_name'   => $o->billing_name ?: ($o->user?->name ?? 'Customer'),
                    'customer_email'  => $o->billing_email ?: ($o->user?->email ?? ''),
                    'package_name'    => $o->package?->name ?? 'Custom',
                    'order_type'      => $o->order_type,
                    'status'          => $o->status,
                    'total_amount'    => $o->total_amount,
                    'total_formatted' => $o->formatted_total,
                    'created_at'      => $o->created_at->toIso8601String(),
                ]),
        ]);
    }

    /**
     * List packages for admin management.
     */
    public function getPackages(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $packages = Plan::orderBy('sort_order')->orderBy('id')->get();
        return response()->json(['packages' => $packages]);
    }

    /**
     * Update package price, name, features, or availability.
     */
    public function updatePackage(Request $request, int $id): JsonResponse
    {
        $this->assertAdmin($request);

        $plan = Plan::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:100',
            'price_in_rupees' => 'sometimes|numeric|min:0',
            'description'     => 'sometimes|nullable|string|max:500',
            'badge'           => 'sometimes|nullable|string|max:50',
            'can_apk'         => 'sometimes|boolean',
            'can_aab'         => 'sometimes|boolean',
            'has_admin_panel' => 'sometimes|boolean',
            'is_active'       => 'sometimes|boolean',
            'features_list'   => 'sometimes|array',
        ]);

        if (isset($validated['price_in_rupees'])) {
            $plan->price_monthly = (int) round($validated['price_in_rupees'] * 100);
        }

        if (isset($validated['name'])) {
            $plan->name = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $plan->description = $validated['description'];
        }
        if (array_key_exists('badge', $validated)) {
            $plan->badge = $validated['badge'];
        }
        if (isset($validated['can_apk'])) {
            $plan->can_apk = $validated['can_apk'];
        }
        if (isset($validated['can_aab'])) {
            $plan->can_aab = $validated['can_aab'];
        }
        if (isset($validated['has_admin_panel'])) {
            $plan->has_admin_panel = $validated['has_admin_panel'];
        }
        if (isset($validated['is_active'])) {
            $plan->is_active = $validated['is_active'];
        }
        if (isset($validated['features_list'])) {
            $plan->features_list = $validated['features_list'];
        }

        $plan->save();

        return response()->json([
            'success' => true,
            'message' => "Package {$plan->name} updated successfully.",
            'package' => $plan->fresh(),
        ]);
    }

    /**
     * List all add-ons.
     */
    public function getAddOns(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $addons = AddOn::orderBy('sort_order')->orderBy('id')->get();
        return response()->json(['addons' => $addons]);
    }

    /**
     * Create a new add-on.
     */
    public function createAddOn(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $validated = $request->validate([
            'name'            => 'required|string|max:120',
            'price_in_rupees' => 'required|numeric|min:0',
            'category'        => 'required|string|max:50',
            'description'     => 'required|string|max:500',
            'badge'           => 'nullable|string|max:50',
            'features'        => 'nullable|array',
        ]);

        $slug = Str::slug($validated['name']);
        $pricePaise = (int) round($validated['price_in_rupees'] * 100);

        $addon = AddOn::create([
            'name'         => $validated['name'],
            'slug'         => $slug,
            'price'        => $pricePaise,
            'billing_type' => 'one_time',
            'category'     => $validated['category'],
            'description'  => $validated['description'],
            'badge'        => $validated['badge'] ?? null,
            'features'     => $validated['features'] ?? [],
            'is_active'    => true,
            'sort_order'   => AddOn::count() + 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Add-on {$addon->name} created successfully.",
            'addon'   => $addon,
        ], 201);
    }

    /**
     * Update an add-on.
     */
    public function updateAddOn(Request $request, int $id): JsonResponse
    {
        $this->assertAdmin($request);

        $addon = AddOn::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:120',
            'price_in_rupees' => 'sometimes|numeric|min:0',
            'category'        => 'sometimes|string|max:50',
            'description'     => 'sometimes|string|max:500',
            'badge'           => 'sometimes|nullable|string|max:50',
            'is_active'       => 'sometimes|boolean',
            'features'        => 'sometimes|array',
        ]);

        if (isset($validated['price_in_rupees'])) {
            $addon->price = (int) round($validated['price_in_rupees'] * 100);
        }
        if (isset($validated['name'])) {
            $addon->name = $validated['name'];
        }
        if (isset($validated['category'])) {
            $addon->category = $validated['category'];
        }
        if (isset($validated['description'])) {
            $addon->description = $validated['description'];
        }
        if (array_key_exists('badge', $validated)) {
            $addon->badge = $validated['badge'];
        }
        if (isset($validated['is_active'])) {
            $addon->is_active = $validated['is_active'];
        }
        if (isset($validated['features'])) {
            $addon->features = $validated['features'];
        }

        $addon->save();

        return response()->json([
            'success' => true,
            'message' => "Add-on {$addon->name} updated successfully.",
            'addon'   => $addon->fresh(),
        ]);
    }

    /**
     * View all customer orders.
     */
    public function getOrders(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $status = $request->query('status');

        $query = Order::with(['items', 'package', 'user', 'app', 'transactions'])
            ->latest('id');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $orders = $query->paginate(25);

        return response()->json($orders);
    }

    /**
     * View all custom feature requests.
     */
    public function getCustomFeatures(Request $request): JsonResponse
    {
        $this->assertAdmin($request);

        $requests = CustomFeatureRequest::with(['user', 'app', 'order'])
            ->latest('id')
            ->get();

        return response()->json(['requests' => $requests]);
    }

    /**
     * Admin submits quote and sends email to customer.
     */
    public function quoteCustomFeature(Request $request, int $id): JsonResponse
    {
        $this->assertAdmin($request);

        $featureRequest = CustomFeatureRequest::with(['user'])->findOrFail($id);

        $validated = $request->validate([
            'quoted_price_in_rupees' => 'required|numeric|min:1',
            'admin_notes'            => 'required|string|max:2000',
        ]);

        $pricePaise = (int) round($validated['quoted_price_in_rupees'] * 100);

        $featureRequest->update([
            'quoted_price' => $pricePaise,
            'admin_notes'  => $validated['admin_notes'],
            'status'       => 'quoted',
            'quoted_at'    => now(),
        ]);

        // Dispatch Email Notification to customer
        $this->emailService->sendCustomQuoteEmail($featureRequest);

        return response()->json([
            'success' => true,
            'message' => "Quote of ₹" . number_format($validated['quoted_price_in_rupees']) . " sent to {$featureRequest->user?->email}.",
            'request' => $featureRequest->fresh(),
        ]);
    }

    /**
     * Admin updates custom feature status.
     */
    public function updateCustomFeatureStatus(Request $request, int $id): JsonResponse
    {
        $this->assertAdmin($request);

        $featureRequest = CustomFeatureRequest::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending_review,quoted,accepted,in_progress,completed,rejected',
        ]);

        $featureRequest->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => "Ticket {$featureRequest->ticket_number} status updated to {$validated['status']}.",
            'request' => $featureRequest->fresh(),
        ]);
    }
}
