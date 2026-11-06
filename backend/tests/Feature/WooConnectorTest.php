<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\Connectors\Woo\WooConnector;
use App\Services\Security\UrlGuard;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\WooFixtures;
use Tests\TestCase;

class WooConnectorTest extends TestCase
{
    private WooConnector $connector;
    private string $siteUrl = 'https://acme-organics.com';

    protected function setUp(): void
    {
        parent::setUp();

        UrlGuard::setDnsResolver(fn () => ['93.184.216.34']);

        $this->connector = new WooConnector(
            siteUrl: $this->siteUrl,
            consumerKey: 'ck_test_1234567890abcdef',
            consumerSecret: 'cs_test_0987654321fedcba',
            urlGuard: new UrlGuard()
        );
    }

    protected function tearDown(): void
    {
        UrlGuard::resetDnsResolver();
        parent::tearDown();
    }

    public function test_verify_succeeds_with_valid_credentials_and_system_status(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response(WooFixtures::systemStatus(), 200),
            'https://acme-organics.com/wp-json/wc/v3/products*' => Http::response(
                [WooFixtures::product(101)],
                200,
                ['X-WP-Total' => '42']
            ),
            'https://acme-organics.com/wp-json/wc/v3/webhooks*' => Http::response([], 200),
        ]);

        $result = $this->connector->verify();

        $this->assertTrue($result->success);
        $this->assertEquals('Acme Organic Botanicals', $result->storeName);
        $this->assertEquals(42, $result->productsCount);
        $this->assertEquals('INR', $result->currency);
        $this->assertEquals('8.7.0', $result->wcVersion);
    }

    public function test_verify_returns_invalid_keys_on_401_unauthorized(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response([
                'code'    => 'woocommerce_rest_cannot_view',
                'message' => 'Sorry, you cannot view this resource.',
            ], 401),
        ]);

        $result = $this->connector->verify();

        $this->assertFalse($result->success);
        $this->assertEquals('INVALID_KEYS', $result->errorCode);
    }

    public function test_verify_returns_insufficient_permission_when_read_only(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response(WooFixtures::systemStatus(), 200),
            'https://acme-organics.com/wp-json/wc/v3/products?per_page=1' => Http::response([], 200),
            // webhooks endpoint returns 403 because key lacks write permission
            'https://acme-organics.com/wp-json/wc/v3/webhooks?per_page=1' => Http::response([
                'code'    => 'woocommerce_rest_cannot_create',
                'message' => 'Sorry, you cannot manage webhooks.',
            ], 403),
        ]);

        $result = $this->connector->verify();

        $this->assertFalse($result->success);
        $this->assertEquals('INSUFFICIENT_PERMISSION', $result->errorCode);
    }

    public function test_verify_returns_rest_blocked_on_html_waf_response(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response(
                '<!DOCTYPE html><html><head><title>Cloudflare - Attention Required</title></head><body>WAF Block</body></html>',
                403,
                ['Content-Type' => 'text/html']
            ),
        ]);

        $result = $this->connector->verify();

        $this->assertFalse($result->success);
        $this->assertEquals('REST_BLOCKED', $result->errorCode);
    }

    public function test_verify_returns_rest_blocked_when_route_is_404(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response([
                'code'    => 'rest_no_route',
                'message' => 'No route was found matching the URL and request method.',
            ], 404),
        ]);

        $result = $this->connector->verify();

        $this->assertFalse($result->success);
        $this->assertEquals('REST_BLOCKED', $result->errorCode);
    }

    public function test_get_products_returns_paginated_common_products(): void
    {
        $rawProducts = [
            WooFixtures::product(101, 'Rose Serum'),
            WooFixtures::product(102, 'Lavender Mist'),
        ];

        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/products*' => Http::response(
                $rawProducts,
                200,
                [
                    'X-WP-TotalPages' => '5',
                    'X-WP-Total'      => '10',
                ]
            ),
        ]);

        $paginated = $this->connector->getProducts(['page' => 1, 'per_page' => 2]);

        $this->assertEquals(1, $paginated->currentPage);
        $this->assertEquals(5, $paginated->totalPages);
        $this->assertEquals(10, $paginated->totalItems);
        $this->assertCount(2, $paginated->items);
        $this->assertEquals('101', $paginated->items[0]->id);
        $this->assertEquals('Rose Serum', $paginated->items[0]->title);
    }

    public function test_get_product_by_id(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/products/101' => Http::response(
                WooFixtures::product(101, 'Specific Rose Serum'),
                200
            ),
        ]);

        $product = $this->connector->getProduct('101');

        $this->assertEquals('101', $product->id);
        $this->assertEquals('Specific Rose Serum', $product->title);
    }

    public function test_get_categories(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/products/categories*' => Http::response(
                WooFixtures::categories(),
                200
            ),
        ]);

        $categories = $this->connector->getCategories();

        $this->assertCount(2, $categories);
        $this->assertEquals(12, $categories[0]['id']);
        $this->assertEquals('Skincare', $categories[0]['name']);
    }

    public function test_search_products(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/products?search=Serum*' => Http::response(
                [WooFixtures::product(101, 'Rose Serum')],
                200
            ),
        ]);

        $results = $this->connector->searchProducts('Serum');

        $this->assertCount(1, $results);
        $this->assertEquals('101', $results[0]->id);
    }

    public function test_register_webhooks(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/webhooks' => Http::response([
                'id'     => 77,
                'status' => 'active',
            ], 201),
        ]);

        $results = $this->connector->registerWebhooks(
            'https://api.webintoapp.com/webhooks/woo/app_123',
            'webhook_secret_9988'
        );

        $this->assertArrayHasKey('product.updated', $results);
        $this->assertArrayHasKey('order.updated', $results);
        $this->assertTrue($results['product.updated']['success']);
        $this->assertTrue($results['order.updated']['success']);
    }
}
