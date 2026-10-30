<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminAndPlanSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Pricing Plans matching Landing Page
        Plan::updateOrCreate(
            ['id' => 1],
            [
                'name'          => 'Starter App',
                'price_monthly' => 499900, // ₹4,999 one-time (Annual ₹3,999)
                'features'      => [
                    'apk_download'  => true,
                    'aab_download'  => true,
                    'ipa_download'  => false,
                    'admin_panel'   => false,
                    'wishlist'      => true,
                    'otp_login'     => true,
                    'notifications' => true,
                    'reviews'       => false,
                    'whatsapp'      => false,
                ],
                'limits'        => [
                    'builds_per_month' => 3,
                    'max_apps'         => 1,
                ],
                'is_active'     => true,
            ]
        );

        Plan::updateOrCreate(
            ['id' => 2],
            [
                'name'          => 'Pro Combo',
                'price_monthly' => 899900, // ₹8,999 one-time (Annual ₹7,199)
                'features'      => [
                    'apk_download'  => true,
                    'aab_download'  => true,
                    'ipa_download'  => true,
                    'admin_panel'   => false,
                    'wishlist'      => true,
                    'otp_login'     => true,
                    'notifications' => true,
                    'reviews'       => true,
                    'whatsapp'      => true,
                ],
                'limits'        => [
                    'builds_per_month' => 10,
                    'max_apps'         => 3,
                ],
                'is_active'     => true,
            ]
        );

        Plan::updateOrCreate(
            ['id' => 3],
            [
                'name'          => 'Enterprise Suite',
                'price_monthly' => 1499900, // ₹14,999 one-time (Annual ₹11,999)
                'features'      => [
                    'apk_download'  => true,
                    'aab_download'  => true,
                    'ipa_download'  => true,
                    'admin_panel'   => true,
                    'wishlist'      => true,
                    'otp_login'     => true,
                    'notifications' => true,
                    'reviews'       => true,
                    'whatsapp'      => true,
                ],
                'limits'        => [
                    'builds_per_month' => 50,
                    'max_apps'         => 10,
                ],
                'is_active'     => true,
            ]
        );

        // 2. Ensure default HQ tenant
        $tenant = Tenant::first();
        if (! $tenant) {
            $tenant = Tenant::create([
                'ulid'   => (string) Str::ulid(),
                'name'   => 'Appify HQ',
                'status' => 'active',
            ]);
        }

        // 3. Super Admin User
        User::updateOrCreate(
            ['email' => 'admin@webintoapp.com'],
            [
                'tenant_id'         => $tenant->id,
                'name'              => 'Super Admin',
                'password'          => 'Admin@12345',
                'role'              => UserRole::Owner,
                'email_verified_at' => now(),
            ]
        );

        // 4. Standalone Add-ons
        \App\Models\AddOn::updateOrCreate(
            ['slug' => 'ios_bundle'],
            [
                'name'         => 'Apple iOS App Store Package (.IPA)',
                'price'        => 299900,
                'billing_type' => 'one_time',
                'category'     => 'Publishing',
                'description'  => 'Production signed iOS .IPA binary package ready for TestFlight distribution and Apple App Store publishing.',
                'badge'        => 'iOS Package',
                'features'     => [
                    'Production signed iOS .IPA package',
                    'TestFlight distribution ready',
                    'App Store Connect publishing compatible',
                    'Direct .IPA binary download',
                ],
                'is_active'    => true,
                'sort_order'   => 9,
            ]
        );

        \App\Models\AddOn::updateOrCreate(
            ['slug' => 'admin_panel_addon'],
            [
                'name'         => 'Dedicated App Admin Panel Access Module',
                'price'        => 299900,
                'billing_type' => 'one_time',
                'category'     => 'Admin',
                'description'  => 'Web-based dedicated admin portal to manage catalog sync, push broadcasts, and telemetry.',
                'badge'        => 'Admin Panel',
                'features'     => [
                    'Dedicated web management portal',
                    'Push notification composer & history',
                    'Live catalog sync trigger',
                    'Multi-staff role access',
                ],
                'is_active'    => true,
                'sort_order'   => 5,
            ]
        );
    }
}
