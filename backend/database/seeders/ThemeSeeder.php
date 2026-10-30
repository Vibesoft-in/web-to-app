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
            [
                'key'            => 'theme_a',
                'name'           => 'Modern Retail',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_a_preview.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'  => 'theme_a',
                    'colors'  => [
                        'primary'    => '#E91E63',
                        'secondary'  => '#222222',
                        'background' => '#FFFFFF',
                        'surface'    => '#FAFAFA',
                        'text'       => '#111111',
                    ],
                    'radius'  => 12,
                    'font'    => 'Poppins',
                    'nav'     => 'bottom',
                ],
                'is_active'      => true,
            ],
            [
                'key'            => 'theme_b',
                'name'           => 'Luxury Boutique',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_b_preview.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'  => 'theme_b',
                    'colors'  => [
                        'primary'    => '#0F172A',
                        'secondary'  => '#C5A880',
                        'background' => '#F8FAFC',
                        'surface'    => '#FFFFFF',
                        'text'       => '#0F172A',
                    ],
                    'radius'  => 8,
                    'font'    => 'Outfit',
                    'nav'     => 'bottom',
                ],
                'is_active'      => true,
            ],
            [
                'key'            => 'theme_c',
                'name'           => 'Vibrant Lifestyle',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_c_preview.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'  => 'theme_c',
                    'colors'  => [
                        'primary'    => '#4F46E5',
                        'secondary'  => '#F59E0B',
                        'background' => '#FFFFFF',
                        'surface'    => '#F3F4F6',
                        'text'       => '#1F2937',
                    ],
                    'radius'  => 16,
                    'font'    => 'Inter',
                    'nav'     => 'bottom',
                ],
                'is_active'      => true,
            ],
            [
                'key'            => 'theme_d',
                'name'           => 'Elite Dark Luxe',
                'preview_url'    => 'https://assets.webintoapp.com/themes/theme_d_preview.png',
                'schema_version' => 1,
                'defaults'       => [
                    'layout'  => 'theme_d',
                    'colors'  => [
                        'primary'    => '#D97706',
                        'secondary'  => '#F59E0B',
                        'background' => '#0B0F19',
                        'surface'    => '#151C2C',
                        'text'       => '#F8FAFC',
                    ],
                    'radius'  => 14,
                    'font'    => 'Outfit',
                    'nav'     => 'bottom',
                ],
                'is_active'      => true,
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
