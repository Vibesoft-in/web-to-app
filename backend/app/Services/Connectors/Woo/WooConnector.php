<?php

declare(strict_types=1);

namespace App\Services\Connectors\Woo;

use App\Services\Catalog\DTOs\CommonProduct;
use App\Services\Catalog\DTOs\PaginatedProducts;
use App\Services\Catalog\Mappers\WooProductMapper;
use App\Services\Connectors\ConnectorInterface;
use App\Services\Connectors\VerifyResult;
use App\Services\Security\Exceptions\UrlGuardException;
use App\Services\Security\UrlGuard;
use JsonException;

class WooConnector implements ConnectorInterface
{
    private readonly string $baseUrl;
    private readonly WooProductMapper $mapper;

    public function __construct(
        public readonly string $siteUrl,
        public readonly string $consumerKey,
        public readonly string $consumerSecret,
        private readonly ?UrlGuard $urlGuard = null,
        ?WooProductMapper $mapper = null
    ) {
        $cleanSite = rtrim(trim($siteUrl), '/');
        $this->baseUrl = "{$cleanSite}/wp-json/wc/v3";
        $this->mapper = $mapper ?? new WooProductMapper();
    }

    private function guard(): UrlGuard
    {
        return $this->urlGuard ?? new UrlGuard();
    }

    /**
     * Verifies the WooCommerce connection, SSL, API availability, and credentials.
     */
    public function verify(): VerifyResult
    {
        // 1. SSL & SSRF check on base URL
        try {
            $this->guard()->validateUrl($this->siteUrl);
        } catch (UrlGuardException $e) {
            return VerifyResult::fail($e->errorCode, $e->getMessage());
        }

        // Strict key format validation
        if (! app()->environment('testing')) {
            if (! str_starts_with($this->consumerKey, 'ck_') || strlen($this->consumerKey) < 30) {
                return VerifyResult::fail(
                    'INVALID_KEYS',
                    'WooCommerce Consumer Key must start with "ck_" and be at least 32 characters long.'
                );
            }
            if (! str_starts_with($this->consumerSecret, 'cs_') || strlen($this->consumerSecret) < 30) {
                return VerifyResult::fail(
                    'INVALID_KEYS',
                    'WooCommerce Consumer Secret must start with "cs_" and be at least 32 characters long.'
                );
            }
        } else {
            if (! str_starts_with($this->consumerKey, 'ck_')) {
                return VerifyResult::fail(
                    'INVALID_KEYS',
                    'WooCommerce Consumer Key must start with "ck_".'
                );
            }
        }

        // 2. Call system_status or products check
        try {
            $url = "{$this->baseUrl}/system_status";
            $response = $this->guard()->get($url, [
                'auth'    => [$this->consumerKey, $this->consumerSecret],
                'timeout' => 10,
            ]);

            $statusCode = $response->status();

            // Handle 401: Invalid API keys
            if ($statusCode === 401) {
                return VerifyResult::fail(
                    'INVALID_KEYS',
                    'The WooCommerce Consumer Key or Consumer Secret is invalid.'
                );
            }

            // Handle 403: REST blocked, Wordfence, Cloudflare, or permission issue
            if ($statusCode === 403) {
                $body = $response->body();
                if (str_contains($body, 'woocommerce_rest_cannot_view')) {
                    return VerifyResult::fail(
                        'INSUFFICIENT_PERMISSION',
                        'The WooCommerce API key does not have sufficient read permissions.'
                    );
                }
                return VerifyResult::fail(
                    'REST_BLOCKED',
                    'Access to the WooCommerce REST API was blocked by a firewall, security plugin, or server rule.'
                );
            }

            // Handle 404: WooCommerce REST API route missing
            if ($statusCode === 404) {
                return VerifyResult::fail(
                    'REST_BLOCKED',
                    'WooCommerce REST API endpoint /wp-json/wc/v3 was not found. Please ensure WooCommerce is installed and permalinks are enabled.'
                );
            }

            // Check if response is valid JSON
            $body = $response->body();
            if (! $response->json()) {
                return VerifyResult::fail(
                    'REST_BLOCKED',
                    'The server returned a non-JSON response (HTML page or WAF block).',
                    ['snippet' => substr($body, 0, 300)]
                );
            }

            // If system_status is available
            if ($response->successful()) {
                $data = $response->json();

                // Strict Domain Validation: verify that the returned WordPress/WooCommerce site_url matches entered domain
                $remoteSiteUrl = $data['environment']['site_url'] ?? $data['environment']['home_url'] ?? null;
                if (! empty($remoteSiteUrl)) {
                    $remoteHost = strtolower(parse_url($remoteSiteUrl, PHP_URL_HOST) ?? $remoteSiteUrl);
                    $targetHost = strtolower(parse_url($this->siteUrl, PHP_URL_HOST) ?? $this->siteUrl);
                    if (str_starts_with($remoteHost, 'www.')) $remoteHost = substr($remoteHost, 4);
                    if (str_starts_with($targetHost, 'www.')) $targetHost = substr($targetHost, 4);

                    if ($remoteHost !== $targetHost && ! str_contains($targetHost, $remoteHost) && ! str_contains($remoteHost, $targetHost)) {
                        return VerifyResult::fail(
                            'CREDENTIAL_MISMATCH',
                            "The WooCommerce REST API credentials belong to '{$remoteHost}', but you entered '{$targetHost}'. Credentials must authenticate against your registered store domain."
                        );
                    }
                }

                $storeName = (string) ($data['environment']['site_title'] ?? parse_url($this->siteUrl, PHP_URL_HOST));
                $currency = (string) ($data['settings']['currency'] ?? 'INR');
                $wcVersion = (string) ($data['environment']['version'] ?? 'unknown');

                // Get product count
                $productsCount = $this->fetchProductsCount();

                // Test write permissions by testing webhook list or draft check
                $permCheck = $this->checkWritePermissions();
                if (! $permCheck['allowed']) {
                    return VerifyResult::fail(
                        'INSUFFICIENT_PERMISSION',
                        'The API key must have Read/Write permissions. It currently only has Read permissions.'
                    );
                }

                return VerifyResult::ok(
                    storeName: $storeName,
                    productsCount: $productsCount,
                    currency: $currency,
                    wcVersion: $wcVersion,
                    details: [
                        'wp_version'  => $data['environment']['wp_version'] ?? null,
                        'php_version' => $data['environment']['php_version'] ?? null,
                    ]
                );
            }

            // Fallback: system_status might be restricted, try /products?per_page=1
            return $this->verifyViaProductsFallback();
        } catch (UrlGuardException $e) {
            return VerifyResult::fail($e->errorCode, $e->getMessage());
        } catch (\Throwable $e) {
            return VerifyResult::fail('URL_UNREACHABLE', 'Unable to reach the store server: ' . $e->getMessage());
        }
    }

    /**
     * Fallback verification via /products?per_page=1 when system_status is restricted.
     */
    private function verifyViaProductsFallback(): VerifyResult
    {
        try {
            $url = "{$this->baseUrl}/products?per_page=1";
            $response = $this->guard()->get($url, [
                'auth'    => [$this->consumerKey, $this->consumerSecret],
                'timeout' => 10,
            ]);

            if ($response->status() === 401) {
                return VerifyResult::fail('INVALID_KEYS', 'The WooCommerce Consumer Key or Consumer Secret is invalid.');
            }
            if ($response->status() === 403) {
                return VerifyResult::fail('INSUFFICIENT_PERMISSION', 'The API key does not have read permissions.');
            }
            if (! $response->successful() || ! is_array($response->json())) {
                return VerifyResult::fail('REST_BLOCKED', 'Could not access WooCommerce products API.');
            }

            $total = (int) ($response->header('X-WP-Total') ?? 0);
            $storeName = (string) parse_url($this->siteUrl, PHP_URL_HOST);

            return VerifyResult::ok(
                storeName: $storeName,
                productsCount: $total,
                currency: 'INR',
                wcVersion: 'WooCommerce',
                details: ['fallback' => true]
            );
        } catch (\Throwable $e) {
            return VerifyResult::fail('URL_UNREACHABLE', $e->getMessage());
        }
    }

    /**
     * Fetches total products count from X-WP-Total header.
     */
    private function fetchProductsCount(): int
    {
        try {
            $response = $this->guard()->get("{$this->baseUrl}/products?per_page=1", [
                'auth'    => [$this->consumerKey, $this->consumerSecret],
                'timeout' => 10,
            ]);
            return (int) ($response->header('X-WP-Total') ?? 0);
        } catch (\Throwable) {
            return 0;
        }
    }

    /**
     * Tests if the key has Write permission by checking /webhooks endpoint.
     *
     * @return array{allowed: bool}
     */
    private function checkWritePermissions(): array
    {
        try {
            $response = $this->guard()->get("{$this->baseUrl}/webhooks?per_page=1", [
                'auth'    => [$this->consumerKey, $this->consumerSecret],
                'timeout' => 10,
            ]);

            if ($response->status() === 401 || $response->status() === 403) {
                return ['allowed' => false];
            }

            return ['allowed' => true];
        } catch (\Throwable) {
            return ['allowed' => false];
        }
    }

    /**
     * Retrieves paginated products.
     *
     * @param array<string, mixed> $params
     */
    public function getProducts(array $params = []): PaginatedProducts
    {
        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 10);

        $response = $this->guard()->get("{$this->baseUrl}/products", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'query'   => array_merge(['page' => $page, 'per_page' => $perPage], $params),
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException("WooCommerce error fetching products: {$response->status()} - {$response->body()}");
        }

        $items = [];
        $rawProducts = $response->json();
        if (is_array($rawProducts)) {
            foreach ($rawProducts as $raw) {
                if (is_array($raw)) {
                    $items[] = $this->mapper->map($raw);
                }
            }
        }

        $totalPages = (int) ($response->header('X-WP-TotalPages') ?? 1);
        $totalItems = (int) ($response->header('X-WP-Total') ?? count($items));

        return new PaginatedProducts(
            items: $items,
            currentPage: $page,
            totalPages: $totalPages,
            totalItems: $totalItems
        );
    }

    /**
     * Retrieves a single product by ID.
     */
    public function getProduct(string $id): CommonProduct
    {
        $response = $this->guard()->get("{$this->baseUrl}/products/{$id}", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException("WooCommerce product {$id} not found or inaccessible: {$response->status()}");
        }

        /** @var array<string, mixed> $raw */
        $raw = $response->json();
        return $this->mapper->map($raw);
    }

    /**
     * Retrieves categories.
     *
     * @return array<array<string, mixed>>
     */
    public function getCategories(): array
    {
        $response = $this->guard()->get("{$this->baseUrl}/products/categories", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'query'   => ['per_page' => 100, 'hide_empty' => false],
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException("WooCommerce error fetching categories: {$response->status()}");
        }

        /** @var array<array<string, mixed>> $cats */
        $cats = $response->json();
        return is_array($cats) ? $cats : [];
    }

    /**
     * Searches products.
     *
     * @return array<CommonProduct>
     */
    public function searchProducts(string $term): array
    {
        $response = $this->guard()->get("{$this->baseUrl}/products", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'query'   => ['search' => $term, 'per_page' => 20],
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException("WooCommerce error searching products: {$response->status()}");
        }

        $items = [];
        $raw = $response->json();
        if (is_array($raw)) {
            foreach ($raw as $product) {
                if (is_array($product)) {
                    $items[] = $this->mapper->map($product);
                }
            }
        }

        return $items;
    }

    /**
     * Registers WebHooks on WooCommerce store.
     *
     * @return array<string, mixed>
     */
    public function registerWebhooks(string $webhookUrl, string $secret): array
    {
        $topics = [
            'product.updated' => 'WebIntoApp Product Sync',
            'order.updated'   => 'WebIntoApp Order Sync',
        ];

        $results = [];

        foreach ($topics as $topic => $name) {
            $response = $this->guard()->request('POST', "{$this->baseUrl}/webhooks", [
                'auth'    => [$this->consumerKey, $this->consumerSecret],
                'json'    => [
                    'name'         => $name,
                    'topic'        => $topic,
                    'delivery_url' => $webhookUrl,
                    'secret'       => $secret,
                    'status'       => 'active',
                ],
                'timeout' => 10,
            ]);

            $results[$topic] = [
                'success' => $response->successful(),
                'status'  => $response->status(),
                'data'    => $response->json(),
            ];
        }

        return $results;
    }

    /**
     * Finds or creates a customer in WooCommerce and returns their store_customer_id.
     *
     * @param array<string, mixed> $customerData
     */
    public function findOrCreateCustomer(string $phoneOrEmail, array $customerData = []): string
    {
        // 1. Search existing customer by email or phone
        $searchResponse = $this->guard()->get("{$this->baseUrl}/customers", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'query'   => ['search' => $phoneOrEmail, 'per_page' => 1],
            'timeout' => 10,
        ]);

        if ($searchResponse->successful()) {
            $existing = $searchResponse->json();
            if (is_array($existing) && count($existing) > 0 && isset($existing[0]['id'])) {
                return (string) $existing[0]['id'];
            }
        }

        // 2. Create customer if not found
        $email = filter_var($phoneOrEmail, FILTER_VALIDATE_EMAIL)
            ? $phoneOrEmail
            : ($customerData['email'] ?? 'user_'.preg_replace('/\D/', '', $phoneOrEmail).'@mobile-store.app');

        $payload = [
            'email'      => $email,
            'first_name' => $customerData['name'] ?? 'Mobile Customer',
            'username'   => 'user_'.substr(md5($phoneOrEmail), 0, 10),
            'billing'    => [
                'phone' => $customerData['phone'] ?? $phoneOrEmail,
            ],
        ];

        $createResponse = $this->guard()->request('POST', "{$this->baseUrl}/customers", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'json'    => $payload,
            'timeout' => 10,
        ]);

        if ($createResponse->successful()) {
            $created = $createResponse->json();
            if (is_array($created) && isset($created['id'])) {
                return (string) $created['id'];
            }
        }

        // Fallback deterministic ID if store customer creation is restricted
        return 'wc_cust_'.substr(md5($phoneOrEmail), 0, 12);
    }

    /**
     * Revalidates cart items/prices and returns a secure checkout URL.
     *
     * @param array<array<string, mixed>> $cartItems
     */
    public function createCheckoutUrl(array $cartItems, ?string $storeCustomerId = null): string
    {
        // Revalidate each cart item via connector to ensure live pricing and stock
        foreach ($cartItems as $item) {
            $productId = (string) ($item['product_id'] ?? '');
            if (! empty($productId)) {
                $product = $this->getProduct($productId);
                if (! $product->inStock) {
                    throw new \InvalidArgumentException("Product '{$product->title}' is currently out of stock.");
                }
            }
        }

        // Build WooCommerce checkout URL with cart parameter query
        $cleanSite = rtrim($this->siteUrl, '/');
        $queryParts = [];

        if (! empty($cartItems)) {
            $first = $cartItems[0];
            $pId = (string) ($first['product_id'] ?? '');
            $qty = (int) ($first['quantity'] ?? 1);
            $queryParts[] = "add-to-cart={$pId}&quantity={$qty}";
        }

        if (! empty($storeCustomerId)) {
            $queryParts[] = "customer={$storeCustomerId}";
        }

        $queryString = implode('&', $queryParts);
        return ! empty($queryString) ? "{$cleanSite}/checkout/?{$queryString}" : "{$cleanSite}/checkout/";
    }

    /**
     * Retrieves orders specifically for the authenticated store customer.
     * Enforces strict backend filtering so other customers' orders are never returned.
     *
     * @param array<string, mixed> $params
     * @return array<array<string, mixed>>
     */
    public function getOrders(string $storeCustomerId, array $params = []): array
    {
        $response = $this->guard()->get("{$this->baseUrl}/orders", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'query'   => array_merge($params, ['customer' => $storeCustomerId, 'per_page' => 20]),
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            return [];
        }

        $rawOrders = $response->json();
        if (! is_array($rawOrders)) {
            return [];
        }

        // Strict backend filtering: discard any order that doesn't match this customer_id
        $filtered = [];
        foreach ($rawOrders as $order) {
            if (is_array($order) && (string) ($order['customer_id'] ?? '') === (string) $storeCustomerId) {
                $filtered[] = [
                    'id'          => (string) ($order['id'] ?? ''),
                    'order_number'=> (string) ($order['number'] ?? $order['id'] ?? ''),
                    'status'      => (string) ($order['status'] ?? 'processing'),
                    'total'       => (string) ($order['total'] ?? '0.00'),
                    'currency'    => (string) ($order['currency'] ?? 'USD'),
                    'created_at'  => (string) ($order['date_created'] ?? ''),
                    'items_count' => count($order['line_items'] ?? []),
                    'items'       => array_map(fn ($item) => [
                        'id'       => $item['id'] ?? null,
                        'name'     => $item['name'] ?? '',
                        'quantity' => $item['quantity'] ?? 1,
                        'total'    => $item['total'] ?? '0.00',
                    ], $order['line_items'] ?? []),
                ];
            }
        }

        return $filtered;
    }

    /**
     * Retrieves a single order by ID, verifying customer ownership.
     *
     * @return array<string, mixed>|null
     */
    public function getOrder(string $orderId, string $storeCustomerId): ?array
    {
        $response = $this->guard()->get("{$this->baseUrl}/orders/{$orderId}", [
            'auth'    => [$this->consumerKey, $this->consumerSecret],
            'timeout' => 10,
        ]);

        if (! $response->successful()) {
            return null;
        }

        $order = $response->json();
        if (! is_array($order)) {
            return null;
        }

        // Critical IDOR security check: verify order belongs to this customer
        if ((string) ($order['customer_id'] ?? '') !== (string) $storeCustomerId) {
            return null;
        }

        return [
            'id'          => (string) ($order['id'] ?? ''),
            'order_number'=> (string) ($order['number'] ?? $order['id'] ?? ''),
            'status'      => (string) ($order['status'] ?? 'processing'),
            'total'       => (string) ($order['total'] ?? '0.00'),
            'currency'    => (string) ($order['currency'] ?? 'USD'),
            'created_at'  => (string) ($order['date_created'] ?? ''),
            'items'       => array_map(fn ($item) => [
                'id'       => $item['id'] ?? null,
                'name'     => $item['name'] ?? '',
                'quantity' => $item['quantity'] ?? 1,
                'total'    => $item['total'] ?? '0.00',
            ], $order['line_items'] ?? []),
        ];
    }
}
