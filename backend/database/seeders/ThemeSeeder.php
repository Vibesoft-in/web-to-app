<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Theme;
use Illuminate\Database\Seeder;

class ThemeSeeder extends Seeder
{
    public function run(): void
    {
        $themes = [
            // 1. Modern Minimal (also aliases theme_a)
            [
                'key'            => 'modern_minimal',
                'name'           => 'Modern Minimal',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_minimal.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'modern_minimal',
                    'style_title' => 'Minimalist Card Flow',
                    'tagline'     => 'Clean, whitespace-focused minimalist store layout with focused typography',
                    'colors'      => [
                        'primary'    => '#18181B',
                        'secondary'  => '#71717A',
                        'background' => '#FFFFFF',
                        'surface'    => '#F4F4F5',
                        'text'       => '#09090B',
                    ],
                    'radius'      => 8,
                    'font'        => 'Inter',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => true,
                'price'          => 0,
            ],
            // 2. Premium (also aliases theme_b)
            [
                'key'            => 'premium',
                'name'           => 'Premium',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_premium.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'premium',
                    'style_title' => 'Editorial Showcase',
                    'tagline'     => 'Warm bronze & gold luxury styling with editorial card layout and elevated product frames',
                    'colors'      => [
                        'primary'    => '#78593D',
                        'secondary'  => '#C2A88F',
                        'background' => '#FAF7F2',
                        'surface'    => '#FFFFFF',
                        'text'       => '#1C1917',
                    ],
                    'radius'      => 16,
                    'font'        => 'Outfit',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            // 3. E-commerce Classic (also aliases theme_c)
            [
                'key'            => 'ecommerce_classic',
                'name'           => 'E-commerce Classic',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_classic.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'ecommerce_classic',
                    'style_title' => 'Retail Grid Showcase',
                    'tagline'     => 'Familiar, high-converting retail layout with grid product cards, badges, and quick cart buttons',
                    'colors'      => [
                        'primary'    => '#2563EB',
                        'secondary'  => '#F59E0B',
                        'background' => '#FFFFFF',
                        'surface'    => '#F8FAFC',
                        'text'       => '#1E293B',
                    ],
                    'radius'      => 12,
                    'font'        => 'Poppins',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            // 4. Bold & Colorful
            [
                'key'            => 'bold_colorful',
                'name'           => 'Bold & Colorful',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_bold.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'bold_colorful',
                    'style_title' => 'Dynamic Mosaic Highlights',
                    'tagline'     => 'Dynamic gradient accents, vibrant CTA buttons, and modern rounded aesthetic',
                    'colors'      => [
                        'primary'    => '#EC4899',
                        'secondary'  => '#8B5CF6',
                        'background' => '#FFFFFF',
                        'surface'    => '#FDF2F8',
                        'text'       => '#18181B',
                    ],
                    'radius'      => 20,
                    'font'        => 'Plus Jakarta Sans',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            // 5. Elegant
            [
                'key'            => 'elegant',
                'name'           => 'Elegant',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_elegant.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'elegant',
                    'style_title' => 'Soft Horizon Balance',
                    'tagline'     => 'Soft neutral tones, subtle drop shadows, refined serifs/sans mix, and graceful spacing',
                    'colors'      => [
                        'primary'    => '#0D9488',
                        'secondary'  => '#F43F5E',
                        'background' => '#F0FDFA',
                        'surface'    => '#FFFFFF',
                        'text'       => '#134E4A',
                    ],
                    'radius'      => 14,
                    'font'        => 'Outfit',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            // 6. Dark Mode (also aliases theme_d)
            [
                'key'            => 'dark_mode',
                'name'           => 'Dark Mode',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_dark.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'dark_mode',
                    'style_title' => 'Obsidian Cyber Theme',
                    'tagline'     => 'Sleek obsidian dark backdrop, neon amber & emerald accents, optimized for OLED displays',
                    'colors'      => [
                        'primary'    => '#D97706',
                        'secondary'  => '#10B981',
                        'background' => '#0B0F19',
                        'surface'    => '#151C2C',
                        'text'       => '#F8FAFC',
                    ],
                    'radius'      => 14,
                    'font'        => 'Outfit',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            // Backward-compatibility legacy keys
            [
                'key'            => 'theme_a',
                'name'           => 'Modern Retail',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_minimal.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'modern_minimal',
                    'style_title' => 'Minimalist Card Flow',
                    'tagline'     => 'Clean, whitespace-focused minimalist store layout',
                    'colors'      => [
                        'primary'    => '#18181B',
                        'secondary'  => '#71717A',
                        'background' => '#FFFFFF',
                        'surface'    => '#F4F4F5',
                        'text'       => '#09090B',
                    ],
                    'radius'      => 8,
                    'font'        => 'Inter',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => true,
                'price'          => 0,
            ],
            [
                'key'            => 'theme_b',
                'name'           => 'Luxury Boutique',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_premium.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'premium',
                    'style_title' => 'Editorial Showcase',
                    'tagline'     => 'Warm bronze & gold luxury styling with editorial card layout',
                    'colors'      => [
                        'primary'    => '#78593D',
                        'secondary'  => '#C2A88F',
                        'background' => '#FAF7F2',
                        'surface'    => '#FFFFFF',
                        'text'       => '#1C1917',
                    ],
                    'radius'      => 16,
                    'font'        => 'Outfit',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            [
                'key'            => 'theme_c',
                'name'           => 'Vibrant Lifestyle',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_classic.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'ecommerce_classic',
                    'style_title' => 'Retail Grid Showcase',
                    'tagline'     => 'High-converting retail layout with grid product cards',
                    'colors'      => [
                        'primary'    => '#2563EB',
                        'secondary'  => '#F59E0B',
                        'background' => '#FFFFFF',
                        'surface'    => '#F8FAFC',
                        'text'       => '#1E293B',
                    ],
                    'radius'      => 12,
                    'font'        => 'Poppins',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
            [
                'key'            => 'theme_d',
                'name'           => 'Elite Dark Luxe',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_dark.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'      => 'dark_mode',
                    'style_title' => 'Obsidian Cyber Theme',
                    'tagline'     => 'Sleek obsidian dark backdrop with neon accents',
                    'colors'      => [
                        'primary'    => '#D97706',
                        'secondary'  => '#10B981',
                        'background' => '#0B0F19',
                        'surface'    => '#151C2C',
                        'text'       => '#F8FAFC',
                    ],
                    'radius'      => 14,
                    'font'        => 'Outfit',
                    'nav'         => 'bottom',
                ],
                'is_active'      => true,
                'is_free_theme'  => false,
                'price'          => 0,
            ],
        ];

        foreach ($themes as $theme) {
            Theme::updateOrCreate(
                ['key' => $theme['key']],
                $theme
            );
        }
    }
}
