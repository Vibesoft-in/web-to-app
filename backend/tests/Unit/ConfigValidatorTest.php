<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Config\ConfigValidator;
use App\Services\Config\Exceptions\ConfigValidationException;
use Tests\TestCase;

class ConfigValidatorTest extends TestCase
{
    private ConfigValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new ConfigValidator();
    }

    private function validConfig(): array
    {
        return [
            'schema_version' => 1,
            'app' => [
                'name'     => 'Glow Beauty',
                'currency' => 'INR',
            ],
            'theme' => [
                'layout' => 'theme_a',
                'colors' => [
                    'primary'    => '#E91E63',
                    'secondary'  => '#222222',
                    'background' => '#FFFFFF',
                    'surface'    => '#FAFAFA',
                    'text'       => '#111111',
                ],
                'radius' => 12,
                'font'   => 'Poppins',
                'nav'    => 'bottom',
            ],
            'features' => [
                'wishlist'      => true,
                'otp_login'     => true,
                'google_login'  => true,
                'notifications' => true,
                'reviews'       => false,
            ],
            'home' => [
                [
                    'type'  => 'banner',
                    'items' => [
                        [
                            'image' => 'https://assets.webintoapp.com/banner.jpg',
                            'link'  => 'category:12',
                        ],
                    ],
                ],
                ['type' => 'categories'],
                [
                    'type'   => 'product_rail',
                    'title'  => 'New Arrivals',
                    'source' => 'recent',
                ],
            ],
            'links' => [
                'privacy'       => 'https://glowbeauty.com/privacy',
                'terms'         => 'https://glowbeauty.com/terms',
                'support_phone' => '+919876543210',
            ],
            'webview_allowed_hosts' => ['glowbeauty.com'],
        ];
    }

    public function test_valid_configuration_passes_validation(): void
    {
        $config = $this->validConfig();
        $validated = $this->validator->validate($config);

        $this->assertEquals('Glow Beauty', $validated['app']['name']);
        $this->assertEquals('#E91E63', $validated['theme']['colors']['primary']);
    }

    public function test_rejects_non_hex_color_values(): void
    {
        $config = $this->validConfig();
        $config['theme']['colors']['primary'] = 'red'; // Named color not allowed

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('theme.colors.primary', $e->errors);
            throw $e;
        }
    }

    public function test_rejects_plain_http_banner_image_urls(): void
    {
        $config = $this->validConfig();
        $config['home'][0]['items'][0]['image'] = 'http://insecure.com/banner.jpg'; // Insecure HTTP

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('home.0.items.0.image', $e->errors);
            throw $e;
        }
    }

    public function test_rejects_javascript_scheme_in_banner_links(): void
    {
        $config = $this->validConfig();
        $config['home'][0]['items'][0]['link'] = 'javascript:alert(1)';

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('home.0.items.0.link', $e->errors);
            throw $e;
        }
    }

    public function test_rejects_non_boolean_feature_flags(): void
    {
        $config = $this->validConfig();
        $config['features']['wishlist'] = 'enabled'; // String instead of bool

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('features.wishlist', $e->errors);
            throw $e;
        }
    }

    public function test_rejects_unknown_section_types(): void
    {
        $config = $this->validConfig();
        $config['home'][] = ['type' => 'malicious_iframe_section'];

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('home.3.type', $e->errors);
            throw $e;
        }
    }

    public function test_rejects_oversized_border_radius(): void
    {
        $config = $this->validConfig();
        $config['theme']['radius'] = 100; // Above 40 max

        $this->expectException(ConfigValidationException::class);

        try {
            $this->validator->validate($config);
        } catch (ConfigValidationException $e) {
            $this->assertArrayHasKey('theme.radius', $e->errors);
            throw $e;
        }
    }

    public function test_accepts_blob_and_data_image_banner_urls(): void
    {
        $config = $this->validConfig();
        $config['home'][0]['items'][0]['image'] = 'blob:http://localhost:3000/1234-5678';
        $validated = $this->validator->validate($config);
        $this->assertEquals('blob:http://localhost:3000/1234-5678', $validated['home'][0]['items'][0]['image']);

        $config['home'][0]['items'][0]['image'] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        $validated2 = $this->validator->validate($config);
        $this->assertStringStartsWith('data:image/png;base64', $validated2['home'][0]['items'][0]['image']);
    }

    public function test_accepts_dynamic_google_fonts_and_layouts(): void
    {
        $config = $this->validConfig();
        $config['theme']['layout'] = 'theme_d';
        $config['theme']['font'] = 'Albert Sans';
        $validated = $this->validator->validate($config);
        $this->assertEquals('theme_d', $validated['theme']['layout']);
        $this->assertEquals('Albert Sans', $validated['theme']['font']);
    }
}
