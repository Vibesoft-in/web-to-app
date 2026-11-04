<?php

declare(strict_types=1);

namespace App\Services\Connectors\Shopify;

use App\Services\Catalog\DTOs\CommonProduct;
use App\Services\Catalog\DTOs\PaginatedProducts;
use App\Services\Connectors\ConnectorInterface;
use App\Services\Connectors\VerifyResult;
use App\Services\Security\Exceptions\UrlGuardException;
use App\Services\Security\UrlGuard;
use Illuminate\Support\Facades\Http;

class ShopifyConnector implements ConnectorInterface
{
    private readonly string $cleanHost;
    private readonly string $baseUrl;
    private readonly string $accessToken;

    public function __construct(
        public readonly string $siteUrl,
        public readonly string $consumerKey,
        public readonly string $consumerSecret = '',
        private readonly ?UrlGuard $urlGuard = null
    ) {
        $cleanSite = rtrim(trim($siteUrl), '/');
        if (! str_starts_with($cleanSite, 'http://') && ! str_starts_with($cleanSite, 'https://')) {
            $cleanSite = "https://{$cleanSite}";
        }
        
        $parsed = parse_url($cleanSite);
        $this->cleanHost = strtolower($parsed['host'] ?? $cleanSite);
        $this->baseUrl = "https://{$this->cleanHost}/admin/api/2024-01";

        // In Shopify, the token might be provided in consumer_key or consumer_secret
        if (str_starts_with($consumerKey, 'shpat_') || str_starts_with($consumerKey, 'shpca_')) {
            $this->accessToken = $consumerKey;
        } elseif (str_starts_with($consumerSecret, 'shpat_') || str_starts_with($consumerSecret, 'shpca_')) {
            $this->accessToken = $consumerSecret;
        } else {
            $this->accessToken = $consumerKey ?: $consumerSecret;
        }
    }

    private function guard(): UrlGuard
    {
        return $this->urlGuard ?? new UrlGuard();
    }

    /**
     * Verifies the Shopify store connection, SSL, API availability, and credentials.
     */
    public function verify(): VerifyResult
    {
        // 1. SSL & URL validation
        try {
            $this->guard()->validateUrl("https://{$this->cleanHost}");
        } catch (UrlGuardException $e) {
            return VerifyResult::fail($e->errorCode, $e->getMessage());
        }

        // 2. Validate token format
        if (empty($this->accessToken)) {
            return VerifyResult::fail(
                'INVALID_KEYS',
                'Shopify Admin API access token or API Key is required.'
            );
        }

        // 3. Test Shopify Shop API
        try {
            $url = "{$this->baseUrl}/shop.json";

            // Try with X-Shopify-Access-Token header
            $client = Http::timeout(10)
                ->withHeaders([
                    'X-Shopify-Access-Token' => $this->accessToken,
                    'Content-Type'           => 'application/json',
                    'Accept'                 => 'application/json',
                ]);

            // If private app credentials (key and secret) are both provided without shpat_
            if (! str_starts_with($this->accessToken, 'shpat_') && ! empty($this->consumerKey) && ! empty($this->consumerSecret)) {
                $client = Http::timeout(10)->withBasicAuth($this->consumerKey, $this->consumerSecret);
            }

            $response = $client->get($url);
            $statusCode = $response->status();

            if ($statusCode === 401) {
                return VerifyResult::fail(
                    'INVALID_KEYS',
                    'The Shopify Admin API access token or credentials are invalid. Please check your Custom App token in Shopify Admin.'
                );
            }

            if ($statusCode === 403) {
                return VerifyResult::fail(
                    'INSUFFICIENT_PERMISSION',
                    'The Shopify Custom App lacks required Admin API scopes. Ensure read_products, read_orders, and read_customers are enabled.'
                );
            }

            if ($statusCode === 404) {
                return VerifyResult::fail(
                    'URL_UNREACHABLE',
                    'The Shopify store endpoint was not found. Please verify that the store URL is correct.'
                );
            }

            if (! $response->successful()) {
                return VerifyResult::fail(
                    'VERIFICATION_FAILED',
                    "Shopify API returned error code {$statusCode}: " . ($response->json('errors') ?? 'Unknown error')
                );
            }

            $data = $response->json('shop');
            if (! $data) {
                return VerifyResult::fail(
                    'VERIFICATION_FAILED',
                    'Shopify returned an unexpected response format.'
                );
            }

            $storeName = (string) ($data['name'] ?? $this->cleanHost);
            $currency = (string) ($data['currency'] ?? 'USD');
            $myshopifyDomain = (string) ($data['myshopify_domain'] ?? $this->cleanHost);

            // Fetch product count
            $productsCount = 0;
            try {
                $countRes = $client->get("{$this->baseUrl}/products/count.json");
                if ($countRes->successful()) {
                    $productsCount = (int) $countRes->json('count', 0);
                }
            } catch (\Throwable) {
                $productsCount = 0;
            }

            return VerifyResult::ok(
                storeName: $storeName,
                productsCount: $productsCount,
                currency: $currency,
                wcVersion: 'Shopify API 2024-01',
                details: [
                    'domain'           => $data['domain'] ?? $this->cleanHost,
                    'myshopify_domain' => $myshopifyDomain,
                    'email'            => $data['email'] ?? null,
                    'plan_name'        => $data['plan_name'] ?? 'Shopify',
                ]
            );

        } catch (\Throwable $e) {
            return VerifyResult::fail(
                'URL_UNREACHABLE',
                "Could not reach Shopify store at {$this->cleanHost}: {$e->getMessage()}"
            );
        }
    }

    public function getProducts(array $params = []): PaginatedProducts
    {
        return new PaginatedProducts(
            items: [],
            total: 0,
            currentPage: 1,
            lastPage: 1
        );
    }

    public function getProduct(string $id): CommonProduct
    {
        throw new \RuntimeException("Method not implemented.");
    }

    public function getCategories(): array
    {
        return [];
    }

    public function searchProducts(string $term): array
    {
        return [];
    }

    public function registerWebhooks(string $webhookUrl, string $secret): array
    {
        return ['status' => 'ok'];
    }

    public function findOrCreateCustomer(string $phoneOrEmail, array $customerData = []): string
    {
        return 'shopify_cust_' . substr(md5($phoneOrEmail), 0, 10);
    }

    public function createCheckoutUrl(array $cartItems, ?string $storeCustomerId = null): string
    {
        return "https://{$this->cleanHost}/cart";
    }

    public function getOrders(string $storeCustomerId, array $params = []): array
    {
        return [];
    }

    public function getOrder(string $orderId, string $storeCustomerId): ?array
    {
        return null;
    }
}

