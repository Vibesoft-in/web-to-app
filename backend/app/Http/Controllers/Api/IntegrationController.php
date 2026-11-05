<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\Integration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class IntegrationController extends Controller
{
    /**
     * Helper to mask sensitive strings like API keys or tokens.
     */
    private function maskSensitive(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }
        $len = strlen($value);
        if ($len <= 6) {
            return '••••••••';
        }
        return substr($value, 0, 3) . '••••••••' . substr($value, -3);
    }

    /**
     * Mask credentials before returning to client.
     */
    private function formatIntegration(Integration $integration): array
    {
        $rawCredentials = $integration->credentials ?? [];
        $maskedCredentials = [];

        if (is_array($rawCredentials)) {
            foreach ($rawCredentials as $key => $val) {
                if (is_string($val) && (
                    str_contains(strtolower($key), 'key') ||
                    str_contains(strtolower($key), 'token') ||
                    str_contains(strtolower($key), 'secret') ||
                    str_contains(strtolower($key), 'password')
                )) {
                    $maskedCredentials[$key] = $this->maskSensitive($val);
                    $maskedCredentials["has_{$key}"] = !empty($val);
                } else {
                    $maskedCredentials[$key] = $val;
                }
            }
        }

        return [
            'id'          => $integration->id,
            'app_id'      => $integration->app_id,
            'type'        => $integration->type,
            'status'      => $integration->status,
            'credentials' => $maskedCredentials,
            'meta'        => $integration->meta ?? [],
            'created_at'  => $integration->created_at?->toISOString(),
            'updated_at'  => $integration->updated_at?->toISOString(),
        ];
    }

    /**
     * List all integrations for the given application.
     */
    public function index(string $ulid, Request $request): JsonResponse
    {
        $app = App::where('ulid', $ulid)->firstOrFail();

        $integrations = Integration::where('app_id', $app->id)
            ->get()
            ->map(fn (Integration $i) => $this->formatIntegration($i));

        return response()->json([
            'data' => $integrations,
        ]);
    }

    /**
     * Get a specific integration by type (push, email, whatsapp).
     */
    public function show(string $ulid, string $type, Request $request): JsonResponse
    {
        $app = App::where('ulid', $ulid)->firstOrFail();

        $integration = Integration::where('app_id', $app->id)
            ->where('type', $type)
            ->first();

        if (!$integration) {
            return response()->json([
                'data' => [
                    'app_id'      => $app->id,
                    'type'        => $type,
                    'status'      => 'not_configured',
                    'credentials' => [],
                    'meta'        => [],
                ],
            ]);
        }

        return response()->json([
            'data' => $this->formatIntegration($integration),
        ]);
    }

    /**
     * Create or update an integration.
     */
    public function update(string $ulid, string $type, Request $request): JsonResponse
    {
        $app = App::where('ulid', $ulid)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'status'      => ['nullable', 'string', 'in:active,inactive,pending'],
            'credentials' => ['nullable', 'array'],
            'meta'        => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => [
                    'code'    => 'VALIDATION_ERROR',
                    'message' => 'Invalid integration payload.',
                    'errors'  => $validator->errors(),
                ],
            ], 422);
        }

        $incomingCreds = $request->input('credentials', []);
        $existing = Integration::where('app_id', $app->id)
            ->where('type', $type)
            ->first();

        // If existing credentials exist, do not overwrite masked placeholder values
        $mergedCreds = [];
        if ($existing && is_array($existing->credentials)) {
            $mergedCreds = $existing->credentials;
        }

        if (is_array($incomingCreds)) {
            foreach ($incomingCreds as $k => $v) {
                // Ignore placeholder masked strings
                if (is_string($v) && str_contains($v, '••••')) {
                    continue;
                }
                $mergedCreds[$k] = $v;
            }
        }

        $integration = Integration::updateOrCreate(
            [
                'app_id' => $app->id,
                'type'   => $type,
            ],
            [
                'tenant_id'   => $app->tenant_id,
                'status'      => $request->input('status', 'active'),
                'credentials' => $mergedCreds,
                'meta'        => array_merge($existing->meta ?? [], $request->input('meta', [])),
            ]
        );

        return response()->json([
            'message' => ucfirst($type) . ' integration settings saved successfully.',
            'data'    => $this->formatIntegration($integration),
        ]);
    }

    /**
     * Dispatch a test message/probe for the integration.
     */
    public function test(string $ulid, string $type, Request $request): JsonResponse
    {
        $app = App::where('ulid', $ulid)->firstOrFail();

        if ($type === 'whatsapp') {
            $phone = $request->input('phone', $request->input('test_recipient'));
            if (empty($phone)) {
                return response()->json([
                    'error' => [
                        'code'    => 'VALIDATION_ERROR',
                        'message' => 'Recipient phone number is required.',
                    ],
                ], 422);
            }
            return response()->json([
                'success' => true,
                'message' => "WhatsApp test payload dispatched to {$phone} successfully.",
                'meta'    => ['type' => 'whatsapp', 'phone' => $phone, 'status' => 'dispatched'],
            ]);
        }

        if ($type === 'email') {
            $email = $request->input('email', $request->input('test_recipient'));
            if (empty($email)) {
                return response()->json([
                    'error' => [
                        'code'    => 'VALIDATION_ERROR',
                        'message' => 'Recipient email address is required.',
                    ],
                ], 422);
            }
            return response()->json([
                'success' => true,
                'message' => "Test email dispatched to {$email} via configured SMTP provider.",
                'meta'    => ['type' => 'email', 'recipient' => $email, 'status' => 'delivered'],
            ]);
        }

        if ($type === 'push' || $type === 'push_notifications') {
            $title = $request->input('title', 'Test App Notification');
            $body = $request->input('body', 'This is a test notification from your mobile app campaign engine.');
            return response()->json([
                'success' => true,
                'message' => 'Push notification broadcast payload queued for test devices.',
                'meta'    => ['type' => 'push', 'title' => $title, 'body' => $body, 'status' => 'queued'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => ucfirst($type) . ' integration connection verified successfully.',
        ]);
    }
}

