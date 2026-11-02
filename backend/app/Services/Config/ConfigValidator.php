<?php

declare(strict_types=1);

namespace App\Services\Config;

use App\Services\Config\Exceptions\ConfigValidationException;

class ConfigValidator
{
    private const HEX_COLOR_REGEX = '/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/';
    private const ALLOWED_LAYOUTS = ['theme_a', 'theme_b', 'theme_c', 'theme_d', 'theme_e', 'minimal', 'modern', 'bold'];
    private const ALLOWED_FONTS = ['Poppins', 'Inter', 'Roboto', 'Outfit', 'Montserrat', 'Open Sans', 'Lato'];
    private const ALLOWED_SECTION_TYPES = ['banner', 'categories', 'product_rail', 'featured_grid', 'text_banner'];
    private const ALLOWED_PRODUCT_SOURCES = ['recent', 'featured', 'sale', 'popular', 'category'];

    /**
     * Validates the configuration array against the JSON schema and security rules.
     *
     * @param array<string, mixed> $config
     * @return array<string, mixed> Validated and sanitized config array
     * @throws ConfigValidationException
     */
    public function validate(array $config): array
    {
        $errors = [];

        // 1. Root fields validation
        $schemaVersion = $config['schema_version'] ?? 1;
        if (! is_int($schemaVersion) || $schemaVersion < 1) {
            $errors['schema_version'][] = 'The schema_version must be a positive integer.';
        }

        // 2. Validate App object
        if (isset($config['app'])) {
            if (! is_array($config['app'])) {
                $errors['app'][] = 'The app configuration must be an object.';
            } else {
                if (isset($config['app']['name'])) {
                    $name = $config['app']['name'];
                    if (! is_string($name) || strlen($name) > 100 || trim($name) === '') {
                        $errors['app.name'][] = 'The app name must be a non-empty string under 100 characters.';
                    }
                }
                if (isset($config['app']['currency'])) {
                    $currency = $config['app']['currency'];
                    if (! is_string($currency) || strlen($currency) > 5) {
                        $errors['app.currency'][] = 'The currency code must be a valid string under 5 characters.';
                    }
                }
            }
        }

        // 3. Validate Theme object
        if (! isset($config['theme']) || ! is_array($config['theme'])) {
            $errors['theme'][] = 'The theme configuration object is required.';
        } else {
            $theme = $config['theme'];

            // Layout
            $layout = $theme['layout'] ?? null;
            if (! is_string($layout) || (! in_array($layout, self::ALLOWED_LAYOUTS, true) && ! preg_match('/^[a-zA-Z0-9_-]{2,50}$/', $layout))) {
                $errors['theme.layout'][] = 'The theme layout must be one of: ' . implode(', ', self::ALLOWED_LAYOUTS);
            }

            // Colors validation
            if (! isset($theme['colors']) || ! is_array($theme['colors'])) {
                $errors['theme.colors'][] = 'Theme colors object is required.';
            } else {
                if (empty($theme['colors']['text'])) {
                    $config['theme']['colors']['text'] = '#111111';
                    $theme['colors']['text'] = '#111111';
                }

                $requiredColors = ['primary', 'secondary', 'background', 'surface', 'text'];
                foreach ($requiredColors as $colorKey) {
                    $colorVal = $theme['colors'][$colorKey] ?? null;
                    if (! is_string($colorVal) || ! preg_match(self::HEX_COLOR_REGEX, $colorVal)) {
                        $errors["theme.colors.{$colorKey}"][] = "Color '{$colorKey}' must be a valid hex color code (e.g. #FFFFFF or #E91E63).";
                    }
                }
            }

            // Radius
            if (isset($theme['radius'])) {
                $radius = $theme['radius'];
                if (! is_int($radius) || $radius < 0 || $radius > 40) {
                    $errors['theme.radius'][] = 'The theme border radius must be an integer between 0 and 40.';
                }
            }

            // Font
            if (isset($theme['font'])) {
                $font = $theme['font'];
                if (! is_string($font) || strlen($font) > 60 || (! in_array($font, self::ALLOWED_FONTS, true) && ! preg_match('/^[a-zA-Z0-9\s_-]+$/', $font))) {
                    $errors['theme.font'][] = 'The font must be one of the supported fonts or a valid Google Font name.';
                }
            }

            // Navigation style
            if (isset($theme['nav'])) {
                $nav = $theme['nav'];
                if (! in_array($nav, ['bottom', 'drawer'], true)) {
                    $errors['theme.nav'][] = "The navigation style must be 'bottom' or 'drawer'.";
                }
            }
        }

        // 4. Validate Features
        if (isset($config['features'])) {
            if (! is_array($config['features'])) {
                $errors['features'][] = 'The features must be an object of boolean toggles.';
            } else {
                foreach ($config['features'] as $featKey => $featVal) {
                    if (! is_bool($featVal)) {
                        $errors["features.{$featKey}"][] = "Feature toggle '{$featKey}' must be a boolean (true/false).";
                    }
                }
            }
        }

        // 5. Validate Home Sections
        if (isset($config['home'])) {
            if (! is_array($config['home'])) {
                $errors['home'][] = 'The home sections must be an array.';
            } else {
                if (count($config['home']) > 30) {
                    $errors['home'][] = 'Maximum of 30 home sections allowed.';
                }

                foreach ($config['home'] as $index => $section) {
                    if (! is_array($section) || ! isset($section['type'])) {
                        $errors["home.{$index}"][] = "Section at index {$index} must be an object with a 'type' property.";
                        continue;
                    }

                    $type = (string) $section['type'];
                    if (! in_array($type, self::ALLOWED_SECTION_TYPES, true)) {
                        $errors["home.{$index}.type"][] = "Unknown section type '{$type}'. Allowed: " . implode(', ', self::ALLOWED_SECTION_TYPES);
                    }

                    // Validate banner items
                    if ($type === 'banner' && isset($section['items'])) {
                        if (! is_array($section['items'])) {
                            $errors["home.{$index}.items"][] = 'Banner items must be an array.';
                        } else {
                            foreach ($section['items'] as $itemIndex => $item) {
                                if (! is_array($item)) {
                                    $errors["home.{$index}.items.{$itemIndex}"][] = 'Banner item must be an object.';
                                    continue;
                                }

                                if (isset($item['image'])) {
                                    $imgUrl = (string) $item['image'];
                                    if (! $this->isHttpsUrl($imgUrl)) {
                                        $errors["home.{$index}.items.{$itemIndex}.image"][] = 'Banner image must be a secure HTTPS URL.';
                                    }
                                }

                                if (isset($item['link'])) {
                                    $link = (string) $item['link'];
                                    if (strlen($link) > 200 || str_starts_with(strtolower($link), 'javascript:')) {
                                        $errors["home.{$index}.items.{$itemIndex}.link"][] = 'Banner link must be under 200 characters and cannot use javascript: scheme.';
                                    }
                                }
                            }
                        }
                    }

                    // Validate product rail
                    if ($type === 'product_rail') {
                        if (isset($section['title']) && (strlen((string) $section['title']) > 100)) {
                            $errors["home.{$index}.title"][] = 'Product rail title must be under 100 characters.';
                        }
                        if (isset($section['source']) && ! in_array($section['source'], self::ALLOWED_PRODUCT_SOURCES, true)) {
                            $errors["home.{$index}.source"][] = 'Product rail source must be one of: ' . implode(', ', self::ALLOWED_PRODUCT_SOURCES);
                        }
                    }
                }
            }
        }

        // 6. Validate Links
        if (isset($config['links'])) {
            if (! is_array($config['links'])) {
                $errors['links'][] = 'Links must be an object.';
            } else {
                $urlKeys = ['privacy', 'terms', 'website'];
                foreach ($urlKeys as $key) {
                    if (isset($config['links'][$key]) && ! empty($config['links'][$key])) {
                        $url = (string) $config['links'][$key];
                        if (! $this->isHttpsUrl($url)) {
                            $errors["links.{$key}"][] = "Link '{$key}' must be a valid secure HTTPS URL.";
                        }
                    }
                }
                if (isset($config['links']['support_phone']) && strlen((string) $config['links']['support_phone']) > 20) {
                    $errors['links.support_phone'][] = 'Support phone number cannot exceed 20 characters.';
                }
            }
        }

        // 7. Validate webview_allowed_hosts
        if (isset($config['webview_allowed_hosts'])) {
            if (! is_array($config['webview_allowed_hosts'])) {
                $errors['webview_allowed_hosts'][] = 'Webview allowed hosts must be an array of hostnames.';
            } else {
                foreach ($config['webview_allowed_hosts'] as $hIndex => $host) {
                    if (! is_string($host) || strlen($host) > 255 || str_contains($host, '/')) {
                        $errors["webview_allowed_hosts.{$hIndex}"][] = 'Host must be a valid hostname string without slashes or paths.';
                    }
                }
            }
        }

        if (! empty($errors)) {
            throw new ConfigValidationException(
                message: 'Configuration validation failed.',
                errors: $errors
            );
        }

        return $config;
    }

    /**
     * Checks if a URL is a valid, secure HTTPS URL or valid image data URI.
     */
    private function isHttpsUrl(string $url): bool
    {
        $lower = strtolower(trim($url));

        // Allow data URIs for uploaded banners and icons
        if (str_starts_with($lower, 'data:image/')) {
            return true;
        }

        // Allow blob URLs for client previews during drafting
        if (str_starts_with($lower, 'blob:')) {
            return true;
        }

        // Allow relative asset or storage paths
        if (str_starts_with($lower, '/')) {
            return true;
        }

        // Allow local dev URLs
        if (str_starts_with($lower, 'http://localhost') || str_starts_with($lower, 'http://127.0.0.1')) {
            return true;
        }

        if (strlen($url) > 2048) {
            return false;
        }

        if (! str_starts_with($lower, 'https://')) {
            return false;
        }

        return filter_var($url, FILTER_VALIDATE_URL) !== false || (bool) preg_match('#^https://[^\s/$.?#].[^\s]*$#i', $url);
    }
}
