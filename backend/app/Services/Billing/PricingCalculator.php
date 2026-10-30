<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Plan;
use InvalidArgumentException;

class PricingCalculator
{
    // Base pricing tiers in Paise (INR lowest unit: 1 INR = 100 Paise)
    private const DEFAULT_PRICES = [
        'starter'    => 99900,   // ₹999 / month
        'pro'        => 199900,  // ₹1,999 / month
        'enterprise' => 499900,  // ₹4,999 / month
    ];

    private const ADDON_PRICES = [
        'whatsapp'     => 99900,  // ₹999 / month
        'extra_build'  => 49900,  // ₹499 per build
    ];

    private const THEME_PRICES = [
        'theme_a' => 0,       // ₹0 Minimal / Modern Retail (Admin Free Theme)
        'theme_b' => 99900,   // ₹999 Modern / Luxury Boutique
        'theme_c' => 149900,  // ₹1,499 Trendy / Vibrant Lifestyle
        'theme_d' => 199900,  // ₹1,999 Elite Dark Luxe
    ];

    private const ANNUAL_DISCOUNT_PERCENT = 20;

    /**
     * Calculates the exact server-side subscription or order total.
     * Prevents client-side price tampering by computing all values server-side.
     *
     * @param Plan|string $plan Plan instance or plan slug
     * @param string $interval 'monthly' or 'annual'
     * @param array<string, int> $addons Add-on quantities e.g. ['whatsapp' => 1]
     * @param ?\App\Models\App $app Target app
     * @param ?string $themeKey Selected theme key (e.g. 'theme_b')
     * @return array
     */
    public function calculate(
        Plan|string $plan,
        string $interval = 'monthly',
        array $addons = [],
        ?\App\Models\App $app = null,
        ?string $themeKey = null
    ): array
    {
        $planModel = $plan instanceof Plan ? $plan : Plan::where('name', $plan)->orWhere('slug', strtolower((string)$plan))->first();
        $planName = $planModel ? strtolower($planModel->name) : (is_string($plan) ? strtolower($plan) : 'starter');
        $baseMonthly = $planModel && $planModel->price_monthly > 0
            ? (int) $planModel->price_monthly
            : (self::DEFAULT_PRICES[$planName] ?? 299900);

        $interval = strtolower(trim($interval));
        if (! in_array($interval, ['monthly', 'annual', 'one_time'], true)) {
            throw new InvalidArgumentException("Unsupported billing interval: {$interval}");
        }

        // Check if user has an active plan on this app for upgrade credit calculation
        $currentPlan = $app?->getActivePlan();
        $isUpgrade = false;
        $upgradeCredit = 0;

        if ($currentPlan && $planModel && $currentPlan->id !== $planModel->id) {
            $currentPrice = (int) $currentPlan->price_monthly;
            if ($baseMonthly > $currentPrice) {
                $isUpgrade = true;
                $upgradeCredit = $currentPrice;
            }
        }

        $months = $interval === 'annual' ? 12 : 1;
        $planSubtotal = $baseMonthly * $months;

        // Apply 20% discount on annual subscriptions if not an upgrade
        $discount = 0;
        if ($interval === 'annual' && ! $isUpgrade) {
            $discount = (int) round($planSubtotal * (self::ANNUAL_DISCOUNT_PERCENT / 100));
        }

        // Deduct already paid plan amount for upgrades!
        $effectivePlanCharge = max(0, ($planSubtotal - $discount) - $upgradeCredit);

        // Calculate add-ons
        $addonsTotal = 0;
        foreach ($addons as $key => $val) {
            $identifier = is_numeric($key) && (is_string($val) || is_int($val)) ? $val : $key;
            $qty = is_numeric($key) ? 1 : max(0, (int) $val);

            // Check database AddOn model first
            $dbPrice = null;
            try {
                $dbPrice = \App\Models\AddOn::where('is_active', true)
                    ->where(function ($q) use ($identifier) {
                        if (is_numeric($identifier)) {
                            $q->where('id', (int) $identifier);
                        } else {
                            $q->where('slug', (string) $identifier);
                        }
                    })
                    ->value('price');
            } catch (\Throwable) {
                $dbPrice = null;
            }

            $unitPrice = $dbPrice !== null ? (int) $dbPrice : (self::ADDON_PRICES[$identifier] ?? 0);
            $addonsTotal += ($unitPrice * $qty);
        }

        // Calculate theme charge (if not already included in plan e.g. Premium/Enterprise)
        $themeCharge = 0;
        $themeModel = null;
        $isThemeIncluded = false;

        if (empty($themeKey) && $app) {
            $draft = $app->configs()->where('state', 'draft')->latest()->first();
            $themeKey = $draft?->config['selected_theme_key'] ?? $draft?->config['theme']['key'] ?? null;
        }

        if (! empty($themeKey) && $themeKey !== 'theme_a') {
            $isPremiumTier = in_array(strtolower($planName), ['premium', 'enterprise', 'enterprise suite'], true);
            $themeModel = \App\Models\Theme::where('key', $themeKey)->first();

            if ($isPremiumTier) {
                $isThemeIncluded = true;
                $themeCharge = 0;
            } elseif (! $themeModel || ! $themeModel->is_free_theme) {
                $themeCharge = $themeModel && $themeModel->price > 0
                    ? (int) $themeModel->price
                    : (self::THEME_PRICES[$themeKey] ?? 99900);
            }
        }

        $finalTotal = max(0, $effectivePlanCharge + $addonsTotal + $themeCharge);

        return [
            'plan_name'          => ucfirst($planName),
            'base_monthly'       => $baseMonthly,
            'interval'           => $interval,
            'months'             => $months,
            'subtotal'           => $planSubtotal,
            'discount'           => $discount,
            'is_upgrade'         => $isUpgrade,
            'current_plan'       => $currentPlan ? [
                'id'        => $currentPlan->id,
                'name'      => $currentPlan->name,
                'price'     => $currentPlan->price_monthly,
                'price_fmt' => '₹' . number_format($currentPlan->price_monthly / 100),
            ] : null,
            'upgrade_credit'     => $upgradeCredit,
            'upgrade_credit_fmt' => '₹' . number_format($upgradeCredit / 100),
            'plan_charge'        => $effectivePlanCharge,
            'plan_charge_fmt'    => '₹' . number_format($effectivePlanCharge / 100),
            'addons_total'       => $addonsTotal,
            'theme_key'          => $themeKey,
            'theme_name'         => $themeModel?->name ?? ($themeKey ? ucfirst(str_replace('_', ' ', $themeKey)) : null),
            'theme_charge'       => $themeCharge,
            'theme_charge_fmt'   => '₹' . number_format($themeCharge / 100),
            'is_theme_included'  => $isThemeIncluded,
            'total'              => $finalTotal,
            'currency'           => 'INR',
        ];
    }
}
