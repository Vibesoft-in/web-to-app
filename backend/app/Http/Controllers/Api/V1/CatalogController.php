<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Services\Connectors\ConnectorFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function __construct(
        private readonly ConnectorFactory $connectorFactory
    ) {}

    public function products(Request $request): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('resolved_app');

        if (! $app->connection) {
            return response()->json(['data' => []]);
        }

        $connector = $this->connectorFactory->make($app->connection);
        $paginated = $connector->getProducts([
            'page'     => (int) $request->input('page', 1),
            'per_page' => (int) $request->input('per_page', 12),
            'search'   => $request->input('search'),
            'category' => $request->input('category'),
        ]);

        $config = $app->configs()->latest('version')->first()?->config ?? [];
        $overrides = $config['admin_product_status_overrides'] ?? [];
        $deleted = $config['admin_deleted_product_ids'] ?? [];

        $items = [];
        foreach ($paginated->items as $p) {
            $pIdStr = (string) $p->id;
            if (in_array($pIdStr, $deleted, true)) {
                continue;
            }
            $arr = $p->toArray();
            if (isset($overrides[$pIdStr]['stock_status'])) {
                $overrideStatus = $overrides[$pIdStr]['stock_status'];
                $arr['in_stock'] = ($overrideStatus !== 'outofstock');
            }
            $items[] = $arr;
        }

        return response()->json([
            'data'         => $items,
            'total'        => $paginated->total,
            'current_page' => $paginated->currentPage,
            'total_pages'  => $paginated->totalPages,
        ]);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('resolved_app');

        if (! $app->connection) {
            return response()->json([
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Store connection not found.'],
            ], 404);
        }

        $config = $app->configs()->latest('version')->first()?->config ?? [];
        $deleted = $config['admin_deleted_product_ids'] ?? [];
        if (in_array((string) $id, $deleted, true)) {
            return response()->json([
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Product not found.'],
            ], 404);
        }

        try {
            $connector = $this->connectorFactory->make($app->connection);
            $product = $connector->getProduct($id);
            $arr = $product->toArray();

            $overrides = $config['admin_product_status_overrides'] ?? [];
            if (isset($overrides[(string) $id]['stock_status'])) {
                $overrideStatus = $overrides[(string) $id]['stock_status'];
                $arr['in_stock'] = ($overrideStatus !== 'outofstock');
            }

            return response()->json(['data' => $arr]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Product not found.'],
            ], 404);
        }
    }

    public function categories(Request $request): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('resolved_app');

        if (! $app->connection) {
            return response()->json(['data' => []]);
        }

        $connector = $this->connectorFactory->make($app->connection);
        $categories = $connector->getCategories();

        return response()->json(['data' => $categories]);
    }
}
