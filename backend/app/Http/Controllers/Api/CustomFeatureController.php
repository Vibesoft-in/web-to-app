<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\CustomFeatureRequest;
use App\Services\Billing\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomFeatureController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    /**
     * Customer submits a new custom feature request.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'feature_name'           => 'required|string|max:120',
            'requirements'           => 'required|string|max:3000',
            'expected_functionality' => 'required|string|max:3000',
            'reference_url'          => 'nullable|url|max:255',
            'additional_notes'       => 'nullable|string|max:1000',
            'app_ulid'               => 'nullable|string',
        ]);

        $user = $request->user();
        $app = ! empty($validated['app_ulid'])
            ? App::withoutTenantScope()->where('ulid', $validated['app_ulid'])->first()
            : null;

        $ticketNumber = 'CUST-' . strtoupper(Str::random(6));

        $featureRequest = CustomFeatureRequest::create([
            'ticket_number'          => $ticketNumber,
            'tenant_id'              => $user->tenant_id,
            'user_id'                => $user->id,
            'app_id'                 => $app?->id,
            'feature_name'           => $validated['feature_name'],
            'requirements'           => $validated['requirements'],
            'expected_functionality' => $validated['expected_functionality'],
            'reference_url'          => $validated['reference_url'] ?? null,
            'additional_notes'       => $validated['additional_notes'] ?? null,
            'status'                 => 'pending_review',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Custom feature request submitted successfully. Our engineering team will review and quote your request.',
            'request' => $featureRequest,
        ], 201);
    }

    /**
     * Lists the customer's custom feature requests.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = CustomFeatureRequest::where('tenant_id', $user->tenant_id)
            ->with(['app'])
            ->latest('id')
            ->get()
            ->map(function (CustomFeatureRequest $item) {
                return [
                    'id'                     => $item->id,
                    'ticket_number'          => $item->ticket_number,
                    'feature_name'           => $item->feature_name,
                    'requirements'           => $item->requirements,
                    'expected_functionality' => $item->expected_functionality,
                    'reference_url'          => $item->reference_url,
                    'additional_notes'       => $item->additional_notes,
                    'status'                 => $item->status,
                    'quoted_price'           => $item->quoted_price,
                    'quoted_price_fmt'       => $item->formatted_price,
                    'admin_notes'            => $item->admin_notes,
                    'quoted_at'              => $item->quoted_at?->toIso8601String(),
                    'created_at'             => $item->created_at->toIso8601String(),
                    'app_name'               => $item->app?->name ?? 'Standalone',
                ];
            });

        return response()->json(['requests' => $requests]);
    }

    /**
     * Customer accepts quote and receives Razorpay checkout order.
     */
    public function acceptQuote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $featureRequest = CustomFeatureRequest::where('tenant_id', $user->tenant_id)
            ->where('id', $id)
            ->firstOrFail();

        try {
            $checkoutData = $this->orderService->createCustomQuoteOrder($user, $featureRequest);
            return response()->json($checkoutData);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'Failed to accept quote.',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Customer rejects quote.
     */
    public function rejectQuote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $featureRequest = CustomFeatureRequest::where('tenant_id', $user->tenant_id)
            ->where('id', $id)
            ->firstOrFail();

        $featureRequest->update([
            'status'             => 'rejected',
            'customer_action_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Quote has been rejected.',
            'request' => $featureRequest,
        ]);
    }
}
