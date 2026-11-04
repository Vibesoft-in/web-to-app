<?php

declare(strict_types=1);

namespace App\Services\Build;

use App\Models\App;
use App\Services\Connectors\ConnectorFactory;

class MobileAppHtmlBuilder
{
    public static function build(App $app): string
    {
        $appName = htmlspecialchars($app->name ?: 'My Mobile Store', ENT_QUOTES, 'UTF-8');
        
        // 1. Fetch real products & categories from store connector
        $products = [];
        $categories = ['All'];

        try {
            $factory = new ConnectorFactory();
            $connector = $factory->make($app);

            // Fetch categories first to build ID-to-Name map
            $catMap = [];
            $catResult = $connector->getCategories();
            if (!empty($catResult)) {
                foreach ($catResult as $c) {
                    $cId = is_array($c) ? ($c['id'] ?? null) : ($c->id ?? null);
                    $cName = is_array($c) ? ($c['name'] ?? '') : ($c->name ?? '');
                    if ($cId && $cName) {
                        $catMap[(int) $cId] = trim((string) $cName);
                    }
                    if ($cName) {
                        $categories[] = trim((string) $cName);
                    }
                }
            }

            $prodResult = $connector->getProducts(['per_page' => 50]);
            
            if ($prodResult && !empty($prodResult->items)) {
                foreach ($prodResult->items as $p) {
                    $images = [];
                    if (!empty($p->images)) {
                        foreach ($p->images as $img) {
                            $images[] = is_array($img) ? ($img['src'] ?? '') : (string) $img;
                        }
                    }

                    $rawPrice = (float) ($p->price ?? 79);
                    $price = $rawPrice > 0 ? $rawPrice : 79;
                    $oldPrice = round($price * 1.35);

                    // Resolve category names from categoryIds
                    $prodCategoryNames = [];
                    if (!empty($p->categoryIds)) {
                        foreach ($p->categoryIds as $catId) {
                            if (isset($catMap[(int) $catId])) {
                                $prodCategoryNames[] = $catMap[(int) $catId];
                            }
                        }
                    }

                    if (empty($prodCategoryNames)) {
                        $prodCategoryNames = ['Uncategorized'];
                    }

                    foreach ($prodCategoryNames as $cn) {
                        $categories[] = $cn;
                    }

                    $cleanDesc = !empty($p->descriptionHtml) ? trim(strip_tags((string) $p->descriptionHtml)) : '';

                    $products[] = [
                        'id'          => (string) ($p->id ?? uniqid()),
                        'title'       => $p->title ?: 'Exclusive Apparel',
                        'price'       => $price,
                        'old_price'   => $oldPrice,
                        'images'      => array_values(array_filter($images)),
                        'category'    => $prodCategoryNames[0],
                        'categories'  => array_values(array_unique($prodCategoryNames)),
                        'rating'      => 4.8,
                        'description' => $cleanDesc ?: 'Premium quality design crafted with fine fabrics for everyday comfort and contemporary elegance.',
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Fallback to sample catalog if connector is offline
        }

        // Default catalog if store has no products
        if (empty($products)) {
            $products = [
                [
                    'id'          => '1',
                    'title'       => 'Classic Cotton Oxford Shirt',
                    'price'       => 79,
                    'old_price'   => 129,
                    'images'      => ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
                    'category'    => 'Clothing',
                    'categories'  => ['Clothing'],
                    'rating'      => 4.9,
                    'description' => 'Breathable 100% organic cotton oxford shirt tailored for both casual outings and professional meetings.',
                ],
                [
                    'id'          => '2',
                    'title'       => 'Slim Fit Indigo Denim Jeans',
                    'price'       => 99,
                    'old_price'   => 149,
                    'images'      => ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80'],
                    'category'    => 'Clothing',
                    'categories'  => ['Clothing'],
                    'rating'      => 4.8,
                    'description' => 'Comfort-stretch premium indigo denim engineered with 5-pocket construction and reinforced stitching.',
                ],
                [
                    'id'          => '3',
                    'title'       => 'Minimalist Chrono Leather Watch',
                    'price'       => 149,
                    'old_price'   => 219,
                    'images'      => ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80'],
                    'category'    => 'Accessories',
                    'categories'  => ['Accessories'],
                    'rating'      => 4.9,
                    'description' => 'Sleek matte stainless steel casing paired with genuine Italian leather strap and Japanese quartz movement.',
                ],
                [
                    'id'          => '4',
                    'title'       => 'Urban Oversized Graphic T-Shirt',
                    'price'       => 49,
                    'old_price'   => 79,
                    'images'      => ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80'],
                    'category'    => 'T-Shirts',
                    'categories'  => ['T-Shirts'],
                    'rating'      => 4.7,
                    'description' => 'Drop-shoulder relaxed streetwear tee made from heavyweight pre-shrunk combed jersey.',
                ],
                [
                    'id'          => '5',
                    'title'       => 'Classic Court White Sneakers',
                    'price'       => 119,
                    'old_price'   => 169,
                    'images'      => ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80'],
                    'category'    => 'Footwear',
                    'categories'  => ['Footwear'],
                    'rating'      => 4.9,
                    'description' => 'Ultra-cushioned rubber cupsole with memory foam insoles for seamless all-day walking comfort.',
                ],
                [
                    'id'          => '6',
                    'title'       => 'Vintage Polarized Sunglasses',
                    'price'       => 69,
                    'old_price'   => 110,
                    'images'      => ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80'],
                    'category'    => 'Accessories',
                    'categories'  => ['Accessories'],
                    'rating'      => 4.8,
                    'description' => '100% UV400 protective polarized lenses in an elegant handcrafted acetate lightweight frame.',
                ],
            ];
        }

        // Fill images for products without images
        $sampleImages = [
            'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
            'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80',
            'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80',
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
            'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
        ];

        foreach ($products as $idx => &$prod) {
            if (empty($prod['images'])) {
                $prod['images'] = [$sampleImages[$idx % count($sampleImages)]];
            }
        }
        unset($prod);

        if (count($categories) <= 1) {
            $categories = ['All', 'Clothing', 'T-Shirts', 'Accessories', 'Footwear', 'Trending'];
        }
        $categories = array_values(array_unique($categories));

        // 2. Fetch Theme Settings (Always prioritize latest published version, fallback to draft)
        $config = $app->configs()->where('state', 'published')->latest('version')->first()?->config
            ?? $app->configs()->where('state', 'draft')->latest()->first()?->config
            ?? [];

        $primaryColor = $config['theme']['colors']['primary'] ?? '#046BD2';
        $secondaryColor = $config['theme']['colors']['secondary'] ?? '#045CB4';
        $bgColor = $config['theme']['colors']['background'] ?? '#FFFFFF';
        $surfaceColor = $config['theme']['colors']['surface'] ?? '#F8FAFC';
        $textColor = $config['theme']['colors']['text'] ?? '#0F172A';
        $radius = (int) ($config['theme']['radius'] ?? 14);
        $accentColor = '#EF4444';

        // Extract Hero Banner from Home sections or app config
        $homeBanner = null;
        if (!empty($config['home']) && is_array($config['home'])) {
            foreach ($config['home'] as $sec) {
                if (($sec['type'] ?? '') === 'banner' && !empty($sec['items'][0])) {
                    $homeBanner = $sec['items'][0];
                    break;
                }
            }
        }

        $bannerImage = $homeBanner['image']
            ?? ($config['app']['banner_url'] ?? ($config['theme']['banner_url'] ?? ''));

        if (
            str_contains((string) $bannerImage, 'photo-1441986300917') ||
            str_contains((string) $bannerImage, 'placeholders/banner') ||
            str_contains((string) $bannerImage, 'Formula-Rally') ||
            str_contains((string) $bannerImage, 'lighting.rishabhtyagi.in') ||
            str_contains((string) $bannerImage, 'photo-1517524008697')
        ) {
            $bannerImage = '';
        }
        if (empty($bannerImage) && !empty($products[0]['images'][0])) {
            $bannerImage = $products[0]['images'][0];
        }

        $rawBadge = $homeBanner['badge'] ?? 'NEW ARRIVALS • 2026';
        if (str_contains($rawBadge, 'SUPER BRIGHT')) {
            $rawBadge = 'NEW ARRIVALS • 2026';
        }
        $bannerBadge = htmlspecialchars($rawBadge, ENT_QUOTES, 'UTF-8');

        $rawTitle = $homeBanner['title'] ?? '';
        if (empty($rawTitle) || $rawTitle === 'High-Performance Lighting & Bulbs' || str_contains($rawTitle, 'Lighting & Bulbs')) {
            $rawTitle = $appName . ' Collection';
        }
        $bannerTitle = htmlspecialchars($rawTitle, ENT_QUOTES, 'UTF-8');

        $rawButton = $homeBanner['button_text'] ?? 'Shop Collection →';
        if (str_contains($rawButton, 'Halogen')) {
            $rawButton = 'Shop Collection →';
        }
        $bannerButton = htmlspecialchars($rawButton, ENT_QUOTES, 'UTF-8');

        $bannerImageHtml = !empty($bannerImage)
            ? "<img src=\"{$bannerImage}\" class=\"hero-bg-img\" alt=\"Banner\" onerror=\"this.style.display='none'\">"
            : '';

        $searchPlaceholder = "Search " . htmlspecialchars($appName, ENT_QUOTES, 'UTF-8') . " catalog, products...";

        // Typography Support (Google Fonts)
        $selectedFont = $config['theme']['font'] ?? 'Poppins';
        $googleFontParam = match ($selectedFont) {
            'Plus Jakarta Sans' => 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
            'Inter'             => 'family=Inter:wght@400;500;600;700;800',
            'Roboto'            => 'family=Roboto:wght@400;500;700;900',
            'Outfit'            => 'family=Outfit:wght@400;500;600;700;800',
            'Playfair Display'  => 'family=Playfair+Display:wght@400;600;700;800',
            'Montserrat'       => 'family=Montserrat:wght@400;500;600;700;800',
            default             => 'family=Poppins:wght@400;500;600;700;800',
        };
        $googleFontLink = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?{$googleFontParam}&display=swap\" rel=\"stylesheet\">";
        $fontFamilyCss = "'{$selectedFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

        $rawLogoUrl = $config['app']['logo_url'] ?? ($config['theme']['logo_url'] ?? '');
        $cleanLogo = self::sanitizeLogo((string) $rawLogoUrl);
        $firstChar = htmlspecialchars(!empty($appName) ? mb_substr($appName, 0, 1) : 'S', ENT_QUOTES, 'UTF-8');

        $logoHeaderHtml = !empty($cleanLogo)
            ? "<img src=\"{$cleanLogo}\" class=\"brand-logo-img\" alt=\"{$appName}\" onerror=\"this.outerHTML='<div class=\\\'brand-logo\\\'>{$firstChar}</div>';\">"
            : "<div class=\"brand-logo\">{$firstChar}</div>";
        $splashLogoHtml = !empty($cleanLogo)
            ? "<img src=\"{$cleanLogo}\" alt=\"{$appName}\" style=\"width: 76px; height: 76px; object-fit: contain; border-radius: 20px; margin: 0 auto 16px auto; display: block; box-shadow: 0 10px 25px rgba(0,0,0,0.15); background: white; padding: 6px;\" onerror=\"this.outerHTML='<div class=\\\'splash-logo\\\'><svg viewBox=\\\'0 0 24 24\\\'><path d=\\\'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\\\'/><line x1=\\\'3\\\' y1=\\\'6\\\' x2=\\\'21\\\' y2=\\\'6\\\'/><path d=\\\'M16 10a4 4 0 0 1-8 0\\\'/></svg></div>';\">"
            : "<div class=\"splash-logo\"><svg viewBox=\"0 0 24 24\"><path d=\"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\"/><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/></svg></div>";

        $storeUrl = $app->connection?->store_url ?: ($app->connection?->site_url ?: '');
        $productsJson = json_encode($products, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $categoriesJson = json_encode($categories, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>{$appName}</title>
  {$googleFontLink}
  <style>
    :root {
      --primary: {$primaryColor};
      --primary-light: {$primaryColor}18;
      --secondary: {$secondaryColor};
      --accent: {$accentColor};
      --bg: {$bgColor};
      --surface: {$surfaceColor};
      --text: {$textColor};
      --text-muted: #64748B;
      --border: #E2E8F0;
      --radius: {$radius}px;
      --app-font: {$fontFamilyCss};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      font-family: inherit;
    }

    body, button, input, select, textarea {
      font-family: var(--app-font);
    }

    body {
      font-family: var(--app-font);
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── SPLASH SCREEN ── */
    #splash-screen {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, var(--secondary) 0%, #1E1B4B 100%);
      color: white;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .splash-logo {
      width: 84px;
      height: 84px;
      background: var(--primary);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      animation: pulseLogo 2s infinite ease-in-out;
    }
    .splash-logo svg {
      width: 44px;
      height: 44px;
      fill: white;
    }
    .splash-title {
      font-size: 24px;
      font-weight: 800;
      margin-top: 18px;
      letter-spacing: -0.5px;
    }
    .splash-tagline {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 6px;
    }
    .splash-progress {
      width: 140px;
      height: 4px;
      background: rgba(255,255,255,0.15);
      border-radius: 99px;
      margin-top: 36px;
      overflow: hidden;
      position: relative;
    }
    .splash-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 0%;
      background: var(--primary);
      border-radius: 99px;
      animation: fillProgress 1.5s forwards ease-in-out;
    }
    @keyframes pulseLogo {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); box-shadow: 0 24px 50px rgba(79,70,229,0.4); }
    }
    @keyframes fillProgress {
      0% { width: 5%; }
      100% { width: 100%; }
    }

    /* ── ONBOARDING INTRO ── */
    #intro-screen {
      position: fixed;
      inset: 0;
      background: var(--surface);
      z-index: 999;
      display: none;
      flex-direction: column;
      justify-content: space-between;
      padding: 32px 24px;
    }
    .intro-slide {
      display: none;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: 40px;
    }
    .intro-slide.active {
      display: flex;
      animation: fadeIn 0.4s ease;
    }
    .intro-icon {
      width: 110px;
      height: 110px;
      border-radius: 32px;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28px;
    }
    .intro-icon svg { width: 56px; height: 56px; }
    .intro-heading {
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
    }
    .intro-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 12px;
      line-height: 1.5;
      max-width: 280px;
    }
    .intro-dots {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 24px;
    }
    .intro-dot {
      width: 8px;
      height: 8px;
      border-radius: 99px;
      background: #CBD5E1;
      transition: all 0.3s;
    }
    .intro-dot.active {
      width: 24px;
      background: var(--primary);
    }
    .intro-actions {
      display: flex;
      gap: 12px;
    }
    .btn-skip {
      flex: 1;
      padding: 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: white;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 14px;
    }
    .btn-next {
      flex: 2;
      padding: 14px;
      border-radius: var(--radius);
      background: var(--primary);
      color: white;
      border: none;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 10px 20px rgba(79,70,229,0.25);
    }

    /* ── APP HEADER ── */
    header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      background: var(--primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 17px;
      box-shadow: 0 4px 12px rgba(4, 107, 210, 0.25);
    }
    .brand-logo-img {
      width: 38px;
      height: 38px;
      object-fit: contain;
      border-radius: 12px;
      background: white;
      padding: 3px;
      border: 1.5px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .brand-name-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .brand-name {
      font-weight: 800;
      font-size: 15px;
      color: var(--text);
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      letter-spacing: -0.3px;
    }
    .verified-badge {
      width: 14px;
      height: 14px;
      fill: var(--primary);
      flex-shrink: 0;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: #10B981;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }
    .header-icons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icon-btn {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #334155;
      transition: transform 0.15s ease;
    }
    .icon-btn:active {
      transform: scale(0.92);
    }
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: linear-gradient(135deg, #EF4444 0%, #E11D48 100%);
      color: white;
      font-size: 9.5px;
      font-weight: 800;
      width: 18px;
      height: 18px;
      border-radius: 99px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }

    /* ── MAIN CONTENT & VIEWS ── */
    main {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 95px;
    }
    .tab-view {
      display: none;
      animation: fadeIn 0.3s ease;
    }
    .tab-view.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── SEARCH BAR ── */
    .search-box {
      margin: 12px 16px 14px 16px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input {
      width: 100%;
      height: 46px;
      padding: 0 44px 0 44px;
      border-radius: 99px;
      border: 1.5px solid #E2E8F0;
      background: #FFFFFF;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      outline: none;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light), 0 4px 16px rgba(4, 107, 210, 0.12);
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
      pointer-events: none;
    }
    .search-filter-icon {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748B;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #F8FAFC;
    }

    /* ── HERO BANNER ── */
    .hero-banner {
      margin: 8px 16px 14px 16px;
      height: 180px;
      border-radius: var(--radius);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 18px 20px;
      box-shadow: 0 12px 28px -6px rgba(4, 107, 210, 0.35);
      cursor: pointer;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
    }
    .hero-bg-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-banner:active .hero-bg-img {
      transform: scale(1.04);
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.45) 45%, rgba(15,23,42,0.92) 100%);
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .banner-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #22C55E;
      display: inline-block;
      box-shadow: 0 0 6px #22C55E;
    }
    .banner-title {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.25;
      color: #FFFFFF;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 90%;
    }
    .banner-btn {
      margin-top: 3px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #FFFFFF;
      color: var(--primary);
      border-radius: 99px;
      font-size: 11px;
      font-weight: 800;
      border: none;
      box-shadow: 0 4px 14px rgba(0,0,0,0.22);
      cursor: pointer;
      transition: all 0.2s;
    }
    .banner-btn:active {
      transform: scale(0.96);
    }
    .banner-dots {
      position: absolute;
      bottom: 12px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 5px;
      z-index: 10;
    }
    .b-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.45);
      transition: all 0.2s ease;
    }
    .b-dot.active {
      width: 16px;
      border-radius: 99px;
      background: #FFFFFF;
    }

    /* ── PERKS / TRUST STRIP ── */
    .perks-strip {
      margin: 0 16px 16px 16px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
    }
    .perk-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
    }
    .perk-divider {
      width: 1px;
      height: 16px;
      background: #E2E8F0;
    }

    /* ── CATEGORIES ── */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px 10px 16px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.2px;
    }
    .section-link {
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
    }

    .category-scroll {
      display: flex;
      gap: 9px;
      padding: 0 16px 16px 16px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .category-scroll::-webkit-scrollbar { display: none; }
    .cat-chip {
      padding: 8px 16px;
      border-radius: 99px;
      background: #FFFFFF;
      border: 1.5px solid #E2E8F0;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      color: #334155;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cat-chip:active {
      transform: scale(0.95);
    }
    .cat-chip.active {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: #FFFFFF;
      border-color: transparent;
      box-shadow: 0 4px 14px rgba(4, 107, 210, 0.35);
      transform: translateY(-1px);
    }

    /* ── PRODUCT GRID (Strict 2-Column Responsive) ── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 0 16px 24px 16px;
    }
    .product-card {
      background: #FFFFFF;
      border-radius: var(--radius);
      border: 1px solid rgba(226, 232, 240, 0.85);
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
      min-width: 0;
      overflow: hidden;
    }
    .product-card:active {
      transform: scale(0.97);
    }
    .card-img-wrap {
      width: 100%;
      height: 140px;
      border-radius: calc(var(--radius) - 4px);
      overflow: hidden;
      background: #F8FAFC;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transition: transform 0.35s ease;
    }
    .product-card:active .card-img {
      transform: scale(1.06);
    }
    .wish-btn {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      color: #94A3B8;
      transition: all 0.2s;
      z-index: 5;
    }
    .wish-btn:active {
      transform: scale(0.9);
    }
    .wish-btn.active {
      color: #EF4444;
      background: #FFFFFF;
      border-color: #FECDD3;
    }
    .discount-badge {
      position: absolute;
      bottom: 7px;
      left: 7px;
      background: linear-gradient(135deg, #EF4444 0%, #E11D48 100%);
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.4px;
      padding: 3px 7px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
      z-index: 5;
    }
    .card-info {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex-grow: 1;
      min-width: 0;
    }
    .card-rating {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 700;
      color: #D97706;
      margin-bottom: 2px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      min-height: 32px;
    }
    .card-meta {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .price-current {
      font-size: 15px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -0.3px;
    }
    .price-old {
      font-size: 11px;
      color: #94A3B8;
      text-decoration: line-through;
      font-weight: 500;
    }
    .btn-add-cart {
      margin-top: 10px;
      width: 100%;
      height: 36px;
      border-radius: 10px;
      background: var(--primary);
      color: #FFFFFF !important;
      border: none;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(4, 107, 210, 0.25);
      transition: all 0.2s ease;
      line-height: 1;
      -webkit-appearance: none;
      appearance: none;
    }
    .btn-add-cart span {
      color: #FFFFFF !important;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
      display: inline-block;
    }
    .btn-add-cart svg {
      width: 14px;
      height: 14px;
      stroke: #FFFFFF !important;
      fill: none;
      flex-shrink: 0;
    }
    .btn-add-cart:active {
      transform: scale(0.96);
      filter: brightness(0.92);
    }
    .btn-add-cart.in-cart {
      background: #059669;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }

    /* ── CART VIEW ── */
    .cart-container {
      padding: 16px 18px;
    }
    .cart-item {
      display: flex;
      gap: 12px;
      background: white;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 12px;
      margin-bottom: 12px;
      align-items: center;
    }
    .cart-item-img {
      width: 60px;
      height: 60px;
      border-radius: 10px;
      object-fit: cover;
    }
    .cart-item-info {
      flex: 1;
      min-width: 0;
    }
    .qty-control {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F1F5F9;
      padding: 4px 8px;
      border-radius: 8px;
    }
    .qty-btn {
      background: none;
      border: none;
      font-weight: 900;
      font-size: 14px;
      cursor: pointer;
      color: #334155;
    }

    /* ── BOTTOM NAV ── */
    /* ── FLOATING QUICK-CART BAR ── */
    #floating-cart-bar {
      position: fixed;
      bottom: 74px;
      left: 14px;
      right: 14px;
      background: #0F172A;
      color: #FFFFFF;
      border-radius: 14px;
      padding: 10px 16px;
      display: none;
      align-items: center;
      justify-content: space-between;
      z-index: 99;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.35);
      cursor: pointer;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    #floating-cart-bar.active {
      display: flex;
    }
    .fc-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .fc-badge {
      background: rgba(255, 255, 255, 0.16);
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
    }
    .fc-total {
      font-size: 13.5px;
      font-weight: 800;
      color: #10B981;
    }
    .fc-right {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 800;
      color: #FFFFFF;
    }

    /* ── BOTTOM NAV ── */
    nav.bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(226, 232, 240, 0.85);
      display: flex;
      align-items: center;
      justify-content: space-around;
      z-index: 100;
      padding-bottom: 4px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      color: #64748B;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      padding: 5px 12px;
      border-radius: 99px;
    }
    .nav-item.active {
      color: var(--primary);
      background: var(--primary-light);
    }
    .nav-item svg {
      width: 20px;
      height: 20px;
      transition: transform 0.2s ease;
    }
    .nav-item.active svg {
      transform: translateY(-1px);
    }

    /* ── TOAST NOTIFICATION ── */
    #toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-60px);
      background: #0F172A;
      color: white;
      padding: 10px 18px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 700;
      z-index: 10000;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #toast.show {
      transform: translateX(-50%) translateY(0);
    }

    /* ── MODALS (Product & Checkout) ── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 1000;
      display: none;
      align-items: flex-end;
    }
    .modal-backdrop.active {
      display: flex;
    }
    .modal-card {
      background: white;
      width: 100%;
      border-radius: 24px 24px 0 0;
      padding: 24px 20px;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- 1. SPLASH SCREEN -->
  <div id="splash-screen">
    {$splashLogoHtml}
    <div class="splash-title">{$appName}</div>
    <div class="splash-tagline">Official Mobile Shopping Experience</div>
    <div class="splash-progress"><div class="splash-bar"></div></div>
  </div>

  <!-- 2. ONBOARDING INTRO SLIDES -->
  <div id="intro-screen">
    <div class="intro-slide active" id="slide-1">
      <div class="intro-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <h2 class="intro-heading">Welcome to {$appName}</h2>
      <p class="intro-desc">Explore thousands of curated items, modern catalog collections & exclusive daily discounts.</p>
    </div>

    <div class="intro-slide" id="slide-2">
      <div class="intro-icon" style="background:#FFF1F2; color:#E11D48;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>
      <h2 class="intro-heading">Interactive Wishlist & Cart</h2>
      <p class="intro-desc">Save your favorite pieces with one tap, track seasonal deals, and checkout within seconds.</p>
    </div>

    <div class="intro-slide" id="slide-3">
      <div class="intro-icon" style="background:#ECFDF5; color:#059669;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
      <h2 class="intro-heading">Express Tracked Delivery</h2>
      <p class="intro-desc">Real-time status tracking, 100% genuine products, and hassle-free returns right on your phone.</p>
    </div>

    <div>
      <div class="intro-dots">
        <div class="intro-dot active" id="dot-1"></div>
        <div class="intro-dot" id="dot-2"></div>
        <div class="intro-dot" id="dot-3"></div>
      </div>
      <div class="intro-actions">
        <button class="btn-skip" onclick="finishIntro()">Skip</button>
        <button class="btn-next" id="intro-next-btn" onclick="nextIntroSlide()">Next</button>
      </div>
    </div>
  </div>

  <!-- 3. MAIN APP HEADER -->
  <header>
    <div class="brand">
      {$logoHeaderHtml}
      <div class="brand-text">
        <div class="brand-name-wrap">
          <span class="brand-name">{$appName}</span>
          <svg class="verified-badge" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div class="brand-sub"><span class="status-dot"></span>Official Store • Verified</div>
      </div>
    </div>
    <div class="header-icons">
      <div class="icon-btn" onclick="switchTab('wishlist')" title="Wishlist">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span class="badge" id="wishlist-count" style="display:none;">0</span>
      </div>
      <div class="icon-btn" onclick="switchTab('cart')" title="Cart">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span class="badge" id="cart-count" style="display:none;">0</span>
      </div>
    </div>
  </header>

  <!-- 4. MAIN VIEWS -->
  <main>
    <!-- TAB 1: HOME -->
    <div id="view-home" class="tab-view active">
      <div class="search-box">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" placeholder="{$searchPlaceholder}" oninput="handleSearch(this.value)">
        <div class="search-filter-icon" onclick="filterCategory('All')" title="Filter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
        </div>
      </div>

      <!-- Hero Banner -->
      <div class="hero-banner" onclick="filterCategory('All')">
        {$bannerImageHtml}
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <span class="banner-badge"><span class="badge-dot"></span>{$bannerBadge}</span>
          <div class="banner-title">{$bannerTitle}</div>
          <button class="banner-btn" type="button">
            <span>{$bannerButton}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
        <div class="banner-dots">
          <span class="b-dot active"></span>
          <span class="b-dot"></span>
          <span class="b-dot"></span>
        </div>
      </div>

      <!-- Perks Strip -->
      <div class="perks-strip">
        <div class="perk-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Free Delivery</span>
        </div>
        <div class="perk-divider"></div>
        <div class="perk-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>100% Genuine</span>
        </div>
        <div class="perk-divider"></div>
        <div class="perk-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Fast Dispatch</span>
        </div>
      </div>

      <!-- Category Filter Carousel -->
      <div class="section-header">
        <span class="section-title">Categories</span>
      </div>
      <div class="category-scroll" id="categories-container"></div>

      <!-- Products Grid -->
      <div class="section-header">
        <span class="section-title">Trending Catalog</span>
        <span class="section-link" id="product-total-label"></span>
      </div>
      <div class="product-grid" id="product-grid"></div>
    </div>

    <!-- TAB 2: EXPLORE / SEARCH -->
    <div id="view-explore" class="tab-view">
      <div style="padding: 16px 18px;">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 12px;">Explore All Products</h2>
        <div class="search-box" style="margin: 0 0 16px 0;">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="search-input" placeholder="Filter by product name..." oninput="handleSearch(this.value)">
        </div>
        <div class="product-grid" id="explore-grid"></div>
      </div>
    </div>

    <!-- TAB 3: WISHLIST -->
    <div id="view-wishlist" class="tab-view">
      <div style="padding: 16px 18px;">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 14px;">My Saved Wishlist</h2>
        <div id="wishlist-empty" style="text-align: center; padding: 60px 20px; display: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" style="margin: 0 auto 12px auto;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <p style="font-weight: 700; color: #475569;">Your wishlist is empty</p>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 4px;">Tap the heart on any item to save it for later.</p>
          <button onclick="switchTab('home')" style="margin-top: 18px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: var(--radius); font-weight: 700; font-size: 13px;">Browse Products</button>
        </div>
        <div class="product-grid" id="wishlist-grid"></div>
      </div>
    </div>

    <!-- TAB 4: CART -->
    <div id="view-cart" class="tab-view">
      <div class="cart-container">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 14px;">Shopping Bag</h2>
        <div id="cart-empty" style="text-align: center; padding: 60px 20px; display: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" style="margin: 0 auto 12px auto;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <p style="font-weight: 700; color: #475569;">Your cart is empty</p>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 4px;">Add items to your cart to enjoy express shipping.</p>
          <button onclick="switchTab('home')" style="margin-top: 18px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: var(--radius); font-weight: 700; font-size: 13px;">Shop Trending Items</button>
        </div>

        <div id="cart-list"></div>

        <div id="cart-summary" style="margin-top: 20px; background: white; padding: 16px; border-radius: var(--radius); border: 1px solid var(--border); display: none;">
          <h3 style="font-size: 14px; font-weight: 800; margin-bottom: 10px;">Order Summary</h3>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748B; margin-bottom: 6px;">
            <span>Subtotal</span><span id="summary-subtotal">₹0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #059669; margin-bottom: 6px;">
            <span>Special App Discount (10%)</span><span id="summary-discount">-₹0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748B; margin-bottom: 10px;">
            <span>Delivery</span><span style="color: #059669; font-weight: 700;">FREE</span>
          </div>
          <div style="border-top: 1px solid var(--border); padding-top: 10px; display: flex; justify-content: space-between; font-size: 15px; font-weight: 900;">
            <span>Total Payable</span><span id="summary-total" style="color: var(--primary);">₹0</span>
          </div>
          <button onclick="openCheckoutModal()" style="width: 100%; margin-top: 16px; padding: 14px; background: var(--primary); color: white; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 800; box-shadow: 0 10px 20px rgba(79,70,229,0.3); cursor: pointer;">Proceed to Checkout &rarr;</button>
        </div>
      </div>
    </div>

    <!-- TAB 5: ACCOUNT -->
    <div id="view-account" class="tab-view">
      <div style="padding: 20px 18px;">
        <div style="background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 18px; display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800;">
            {$firstChar}
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800;">Welcome Shopper</h3>
            <p style="font-size: 12px; color: #64748B; margin-top: 2px;">Guest Account &bull; Mobile Member</p>
          </div>
        </div>

        <div style="background: white; border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; margin-bottom: 16px;">
          <div onclick="switchTab('cart')" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 13px; font-weight: 700;">My Orders &amp; Tracking</span>
            <span style="color: #94A3B8;">&rsaquo;</span>
          </div>
          <div onclick="switchTab('wishlist')" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 13px; font-weight: 700;">Saved Items (Wishlist)</span>
            <span style="color: #94A3B8;">&rsaquo;</span>
          </div>
          <div onclick="alert('Notification push preferences are active.')" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 13px; font-weight: 700;">Push Notifications</span>
            <span style="color: #059669; font-size: 12px; font-weight: 700;">Enabled</span>
          </div>
          <div onclick="restartIntro()" style="padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 13px; font-weight: 700;">Replay App Introduction</span>
            <span style="color: #94A3B8;">&rsaquo;</span>
          </div>
        </div>

        <div style="text-align: center; color: #94A3B8; font-size: 11px; margin-top: 24px;">
          {$appName} &bull; Native Release v1.0.0<br>Designed &amp; Powered by Appify Engine
        </div>
      </div>
    </div>
  </main>

  <!-- FLOATING QUICK-CART BAR -->
  <div id="floating-cart-bar" onclick="switchTab('cart')">
    <div class="fc-left">
      <div class="fc-badge"><span id="fc-count">0</span> items</div>
      <div class="fc-total" id="fc-total">₹0</div>
    </div>
    <div class="fc-right">
      <span>View Cart</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </div>
  </div>

  <!-- 5. BOTTOM NAVIGATION BAR -->
  <nav class="bottom-nav">
    <div class="nav-item active" id="nav-home" onclick="switchTab('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Home</span>
    </div>
    <div class="nav-item" id="nav-explore" onclick="switchTab('explore')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Explore</span>
    </div>
    <div class="nav-item" id="nav-wishlist" onclick="switchTab('wishlist')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <span>Wishlist</span>
    </div>
    <div class="nav-item" id="nav-cart" onclick="switchTab('cart')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <span>Cart</span>
    </div>
    <div class="nav-item" id="nav-account" onclick="switchTab('account')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>Account</span>
    </div>
  </nav>

  <!-- 6. PRODUCT DETAILS MODAL -->
  <div id="product-modal" class="modal-backdrop" onclick="closeProductModal(event)">
    <div class="modal-card" id="modal-card-content" onclick="event.stopPropagation()">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
        <button onclick="closeProductModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">&times;</button>
      </div>
      <img id="modal-img" src="" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius); margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2 id="modal-title" style="font-size: 18px; font-weight: 800; color: var(--text);"></h2>
          <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
            <span id="modal-price" style="font-size: 20px; font-weight: 900; color: var(--primary);"></span>
            <span id="modal-old-price" style="font-size: 13px; color: #94A3B8; text-decoration: line-through;"></span>
          </div>
        </div>
        <button id="modal-wish-btn" class="wish-btn" style="position:static;" onclick="toggleModalWishlist()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <p id="modal-desc" style="font-size: 13px; color: #64748B; margin-top: 12px; line-height: 1.5;"></p>
      
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button id="modal-add-btn" style="flex: 1; padding: 14px; background: var(--primary); color: white; border: none; border-radius: var(--radius); font-weight: 800; font-size: 14px; cursor: pointer;">Add to Cart</button>
      </div>
    </div>
  </div>

  <!-- 7. CHECKOUT MODAL -->
  <div id="checkout-modal" class="modal-backdrop" onclick="closeCheckoutModal(event)">
    <div class="modal-card" onclick="event.stopPropagation()">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 800;">Fast Express Checkout</h2>
        <button onclick="closeCheckoutModal()" style="background:#F1F5F9; border:none; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">&times;</button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="font-size: 11px; font-weight: 700; color: #64748B;">FULL NAME</label>
        <input type="text" id="cust-name" value="Customer" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-top: 4px; font-size: 13px;">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="font-size: 11px; font-weight: 700; color: #64748B;">PHONE NUMBER</label>
        <input type="tel" id="cust-phone" value="+91 98765 43210" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-top: 4px; font-size: 13px;">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="font-size: 11px; font-weight: 700; color: #64748B;">DELIVERY ADDRESS</label>
        <input type="text" id="cust-addr" value="Sector 18, City Center" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; margin-top: 4px; font-size: 13px;">
      </div>

      <div style="margin-bottom: 18px;">
        <label style="font-size: 11px; font-weight: 700; color: #64748B;">PAYMENT METHOD</label>
        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <label style="flex:1; border: 1px solid var(--primary); background: var(--primary-light); padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; color: var(--primary);">
            <input type="radio" name="pay_mode" checked style="display:none;"> Cash on Delivery
          </label>
          <label style="flex:1; border: 1px solid var(--border); padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; color: #64748B;">
            <input type="radio" name="pay_mode" style="display:none;"> UPI / Net Banking
          </label>
        </div>
      </div>

      <button onclick="placeOrder()" style="width: 100%; padding: 14px; background: #059669; color: white; border: none; border-radius: var(--radius); font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 10px 20px rgba(5,150,105,0.3);">Place Order Now</button>
    </div>
  </div>

  <!-- TOAST POPUP -->
  <div id="toast">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    <span id="toast-msg">Item added to cart!</span>
  </div>

  <script>
    // ── DATA STATE ──
    const ALL_PRODUCTS = {$productsJson};
    const CATEGORIES = {$categoriesJson};

    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('appify_cart') || '[]');
      if (!Array.isArray(cart)) cart = [];
    } catch (e) {
      cart = [];
    }
    // Normalize IDs to strings
    cart = cart.map(item => ({ ...item, id: String(item.id) }));

    let wishlist = [];
    try {
      wishlist = JSON.parse(localStorage.getItem('appify_wishlist') || '[]');
      if (!Array.isArray(wishlist)) wishlist = [];
    } catch (e) {
      wishlist = [];
    }
    // Normalize IDs to strings
    wishlist = wishlist.map(id => String(id));

    let activeCategory = 'All';
    let searchQuery = '';
    let currentSlide = 1;
    let selectedModalProduct = null;

    function isWishlisted(prodId) {
      const sId = String(prodId);
      return wishlist.some(id => String(id) === sId);
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // ── INITIALIZATION ──
    window.addEventListener('DOMContentLoaded', () => {
      // 1. Render Categories & Products
      renderCategories();
      renderProducts();
      updateBadgeCounts();

      // 2. Splash Screen dismiss
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.style.opacity = '0';
          splash.style.transform = 'scale(1.05)';
          setTimeout(() => {
            splash.style.display = 'none';
            checkFirstTimeIntro();
          }, 500);
        }
      }, 1600);
    });

    function checkFirstTimeIntro() {
      const hasSeenIntro = localStorage.getItem('appify_seen_intro');
      if (!hasSeenIntro) {
        const intro = document.getElementById('intro-screen');
        if (intro) intro.style.display = 'flex';
      }
    }

    function nextIntroSlide() {
      currentSlide++;
      if (currentSlide > 3) {
        finishIntro();
        return;
      }
      for (let i = 1; i <= 3; i++) {
        const slide = document.getElementById('slide-' + i);
        const dot = document.getElementById('dot-' + i);
        if (slide) slide.classList.remove('active');
        if (dot) dot.classList.remove('active');
      }
      const curSlide = document.getElementById('slide-' + currentSlide);
      const curDot = document.getElementById('dot-' + currentSlide);
      if (curSlide) curSlide.classList.add('active');
      if (curDot) curDot.classList.add('active');
      if (currentSlide === 3) {
        const nextBtn = document.getElementById('intro-next-btn');
        if (nextBtn) nextBtn.innerText = 'Get Started';
      }
    }

    function finishIntro() {
      localStorage.setItem('appify_seen_intro', 'true');
      const intro = document.getElementById('intro-screen');
      if (intro) intro.style.display = 'none';
    }

    function restartIntro() {
      currentSlide = 1;
      for (let i = 1; i <= 3; i++) {
        const slide = document.getElementById('slide-' + i);
        const dot = document.getElementById('dot-' + i);
        if (slide) slide.classList.remove('active');
        if (dot) dot.classList.remove('active');
      }
      const s1 = document.getElementById('slide-1');
      const d1 = document.getElementById('dot-1');
      if (s1) s1.classList.add('active');
      if (d1) d1.classList.add('active');
      const nextBtn = document.getElementById('intro-next-btn');
      if (nextBtn) nextBtn.innerText = 'Next';
      const intro = document.getElementById('intro-screen');
      if (intro) intro.style.display = 'flex';
    }

    // ── RENDERING FUNCTIONS ──
    function renderCategories() {
      const container = document.getElementById('categories-container');
      if (!container) return;
      container.innerHTML = CATEGORIES.map(cat => `
        <div class="cat-chip \${cat === activeCategory ? 'active' : ''}" onclick="filterCategory('\${escapeHtml(cat)}')">
          \${escapeHtml(cat)}
        </div>
      `).join('');
    }

    function filterCategory(cat) {
      activeCategory = cat;
      renderCategories();
      renderProducts();
    }

    function handleSearch(query) {
      searchQuery = query.toLowerCase().trim();
      renderProducts();
    }

    function renderProducts() {
      const filtered = ALL_PRODUCTS.filter(p => {
        let matchesCategory = false;
        if (activeCategory === 'All') {
          matchesCategory = true;
        } else if (Array.isArray(p.categories) && p.categories.length > 0) {
          matchesCategory = p.categories.some(c => String(c).trim().toLowerCase() === activeCategory.trim().toLowerCase());
        } else {
          matchesCategory = String(p.category || '').trim().toLowerCase() === activeCategory.trim().toLowerCase();
        }

        const matchesSearch = !searchQuery || String(p.title || '').toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });

      const totalLabel = document.getElementById('product-total-label');
      if (totalLabel) {
        totalLabel.innerText = 'Showing ' + filtered.length + ' items';
      }

      const html = filtered.map(prod => {
        const sId = String(prod.id);
        const isWish = isWishlisted(sId);
        const inCart = cart.some(item => String(item.id) === sId);
        const img = (prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80';
        return `
          <div class="product-card" onclick="openProductModal('\${sId}')">
            <div class="card-img-wrap">
              <img src="\${img}" class="card-img" alt="\${escapeHtml(prod.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'">
              <button class="wish-btn \${isWish ? 'active' : ''}" onclick="toggleWishlist(event, '\${sId}')" title="Wishlist">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="\${isWish ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
              <span class="discount-badge">SAVE 30%</span>
            </div>
            <div class="card-info">
              <div class="card-rating">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>4.8</span>
                <span style="color:#94A3B8; font-weight:500;">(24)</span>
              </div>
              <div class="card-title">\${escapeHtml(prod.title)}</div>
              <div class="card-meta">
                <span class="price-current">₹\${prod.price}</span>
                <span class="price-old">₹\${prod.old_price}</span>
              </div>
            </div>
            <button class="btn-add-cart \${inCart ? 'in-cart' : ''}" onclick="addToCart(event, '\${sId}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>\${inCart ? 'In Bag ✓' : 'Add to Cart'}</span>
            </button>
          </div>
        `;
      }).join('');

      const pGrid = document.getElementById('product-grid');
      if (pGrid) {
        pGrid.innerHTML = html || '<div style="grid-column: span 2; text-align: center; padding: 40px; color: #94A3B8;">No products found in this category.</div>';
      }
      const expGrid = document.getElementById('explore-grid');
      if (expGrid) {
        expGrid.innerHTML = html;
      }
    }

    // ── WISHLIST LOGIC ──
    function toggleWishlist(e, prodId) {
      if (e) e.stopPropagation();
      const sId = String(prodId);
      const idx = wishlist.findIndex(id => String(id) === sId);
      if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast('Removed from wishlist');
      } else {
        wishlist.push(sId);
        showToast('Saved to wishlist!');
      }
      localStorage.setItem('appify_wishlist', JSON.stringify(wishlist));
      updateBadgeCounts();
      renderProducts();
      renderWishlistTab();
    }

    function renderWishlistTab() {
      const wishItems = ALL_PRODUCTS.filter(p => isWishlisted(p.id));
      const emptyEl = document.getElementById('wishlist-empty');
      const gridEl = document.getElementById('wishlist-grid');

      if (!gridEl || !emptyEl) return;

      if (wishItems.length === 0) {
        emptyEl.style.display = 'block';
        gridEl.innerHTML = '';
      } else {
        emptyEl.style.display = 'none';
        gridEl.innerHTML = wishItems.map(prod => {
          const sId = String(prod.id);
          const img = (prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80';
          return `
            <div class="product-card" onclick="openProductModal('\${sId}')">
              <div class="card-img-wrap">
                <img src="\${img}" class="card-img" alt="\${escapeHtml(prod.title)}">
                <button class="wish-btn active" onclick="toggleWishlist(event, '\${sId}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
              <div class="card-info">
                <div class="card-title">\${escapeHtml(prod.title)}</div>
                <div class="card-meta">
                  <span class="price-current">₹\${prod.price}</span>
                </div>
              </div>
              <button class="btn-add-cart" onclick="addToCart(event, '\${sId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Move to Cart</span>
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // ── CART LOGIC ──
    function addToCart(e, prodId) {
      if (e) e.stopPropagation();
      const sId = String(prodId);
      const existing = cart.find(item => String(item.id) === sId);
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        const prod = ALL_PRODUCTS.find(p => String(p.id) === sId);
        if (prod) {
          cart.push({ ...prod, id: sId, qty: 1 });
        }
      }
      localStorage.setItem('appify_cart', JSON.stringify(cart));
      updateBadgeCounts();
      showToast('Item added to cart!');
      renderProducts();
      renderCartTab();
    }

    function updateCartQty(prodId, delta) {
      const sId = String(prodId);
      const item = cart.find(i => String(i.id) === sId);
      if (item) {
        item.qty = (item.qty || 1) + delta;
        if (item.qty <= 0) {
          cart = cart.filter(i => String(i.id) !== sId);
        }
      }
      localStorage.setItem('appify_cart', JSON.stringify(cart));
      updateBadgeCounts();
      renderCartTab();
    }

    function renderCartTab() {
      const emptyEl = document.getElementById('cart-empty');
      const listEl = document.getElementById('cart-list');
      const summaryEl = document.getElementById('cart-summary');

      if (!emptyEl || !listEl || !summaryEl) return;

      if (!cart || cart.length === 0) {
        emptyEl.style.display = 'block';
        listEl.innerHTML = '';
        summaryEl.style.display = 'none';
        return;
      }

      emptyEl.style.display = 'none';
      summaryEl.style.display = 'block';

      let subtotal = 0;
      listEl.innerHTML = cart.map(item => {
        const sId = String(item.id);
        const itemQty = item.qty || 1;
        const itemPrice = item.price || 0;
        subtotal += itemPrice * itemQty;
        const img = (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80';
        return `
          <div class="cart-item">
            <img src="\${img}" class="cart-item-img" alt="\${escapeHtml(item.title)}">
            <div class="cart-item-info">
              <div style="font-weight: 800; font-size: 13px; margin-bottom: 2px;">\${escapeHtml(item.title)}</div>
              <div style="font-weight: 900; color: var(--primary); font-size: 13px;">₹\${itemPrice}</div>
            </div>
            <div class="qty-control">
              <button class="qty-btn" onclick="updateCartQty('\${sId}', -1)">&minus;</button>
              <span style="font-weight: 800; font-size: 13px;">\${itemQty}</span>
              <button class="qty-btn" onclick="updateCartQty('\${sId}', 1)">&plus;</button>
            </div>
          </div>
        `;
      }).join('');

      const discount = Math.round(subtotal * 0.1);
      const total = Math.max(0, subtotal - discount);

      document.getElementById('summary-subtotal').innerText = '₹' + subtotal;
      document.getElementById('summary-discount').innerText = '-₹' + discount;
      document.getElementById('summary-total').innerText = '₹' + total;
    }

    function updateBadgeCounts() {
      const wishBadge = document.getElementById('wishlist-count');
      const cartBadge = document.getElementById('cart-count');

      if (wishBadge) {
        wishBadge.innerText = wishlist.length;
        wishBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
      }

      const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
      const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);

      if (cartBadge) {
        cartBadge.innerText = totalQty;
        cartBadge.style.display = totalQty > 0 ? 'flex' : 'none';
      }

      // Update floating cart bar
      const fcBar = document.getElementById('floating-cart-bar');
      const fcCount = document.getElementById('fc-count');
      const fcTotal = document.getElementById('fc-total');
      if (fcBar) {
        const curTab = getCurrentActiveTab();
        const shouldShow = totalQty > 0 && (curTab === 'home' || curTab === 'explore');
        fcBar.classList.toggle('active', shouldShow);
        if (fcCount) fcCount.innerText = totalQty;
        if (fcTotal) fcTotal.innerText = '₹' + subtotal;
      }
    }

    function getCurrentActiveTab() {
      const activeNav = document.querySelector('.nav-item.active');
      if (!activeNav) return 'home';
      return activeNav.id.replace('nav-', '');
    }

    // ── NAVIGATION TABS ──
    function switchTab(tabId) {
      const tabs = ['home', 'explore', 'wishlist', 'cart', 'account'];
      tabs.forEach(t => {
        const viewEl = document.getElementById('view-' + t);
        if (viewEl) viewEl.classList.remove('active');
        const navEl = document.getElementById('nav-' + t);
        if (navEl) navEl.classList.remove('active');
      });

      const targetView = document.getElementById('view-' + tabId);
      if (targetView) targetView.classList.add('active');
      const activeNav = document.getElementById('nav-' + tabId);
      if (activeNav) activeNav.classList.add('active');

      if (tabId === 'cart') renderCartTab();
      if (tabId === 'wishlist') renderWishlistTab();

      updateBadgeCounts();
    }

    // ── PRODUCT MODAL ──
    function openProductModal(prodId) {
      const sId = String(prodId);
      const prod = ALL_PRODUCTS.find(p => String(p.id) === sId);
      if (!prod) return;
      selectedModalProduct = prod;

      const img = (prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80';
      const mImg = document.getElementById('modal-img');
      if (mImg) mImg.src = img;
      const mTitle = document.getElementById('modal-title');
      if (mTitle) mTitle.innerText = prod.title || '';
      const mPrice = document.getElementById('modal-price');
      if (mPrice) mPrice.innerText = '₹' + prod.price;
      const mOldPrice = document.getElementById('modal-old-price');
      if (mOldPrice) mOldPrice.innerText = '₹' + prod.old_price;
      const mDesc = document.getElementById('modal-desc');
      if (mDesc) mDesc.innerText = prod.description || '';

      const isWish = isWishlisted(sId);
      const wishBtn = document.getElementById('modal-wish-btn');
      if (wishBtn) {
        wishBtn.classList.toggle('active', isWish);
        const svg = wishBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isWish ? 'currentColor' : 'none');
      }

      const addBtn = document.getElementById('modal-add-btn');
      if (addBtn) {
        addBtn.onclick = () => {
          addToCart(null, sId);
          closeProductModal();
        };
      }

      const pModal = document.getElementById('product-modal');
      if (pModal) pModal.classList.add('active');
    }

    function toggleModalWishlist() {
      if (!selectedModalProduct) return;
      const sId = String(selectedModalProduct.id);
      toggleWishlist(null, sId);
      const isWish = isWishlisted(sId);
      const wishBtn = document.getElementById('modal-wish-btn');
      if (wishBtn) {
        wishBtn.classList.toggle('active', isWish);
        const svg = wishBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isWish ? 'currentColor' : 'none');
      }
    }

    function closeProductModal() {
      const pModal = document.getElementById('product-modal');
      if (pModal) pModal.classList.remove('active');
    }

    // ── CHECKOUT MODAL ──
    function openCheckoutModal() {
      const cModal = document.getElementById('checkout-modal');
      if (cModal) cModal.classList.add('active');
    }

    function closeCheckoutModal() {
      const cModal = document.getElementById('checkout-modal');
      if (cModal) cModal.classList.remove('active');
    }

    function placeOrder() {
      const name = (document.getElementById('cust-name') && document.getElementById('cust-name').value) || 'Customer';
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      closeCheckoutModal();
      cart = [];
      localStorage.setItem('appify_cart', JSON.stringify(cart));
      updateBadgeCounts();
      renderCartTab();
      showToast('Order #' + orderId + ' placed successfully! 🎉');
      setTimeout(() => {
        alert('Thank you, ' + name + '! Your order #' + orderId + ' has been confirmed with express delivery.');
        switchTab('home');
      }, 300);
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      const tMsg = document.getElementById('toast-msg');
      if (tMsg) tMsg.innerText = msg;
      t.classList.add('show');
      setTimeout(() => {
        t.classList.remove('show');
      }, 2000);
    }
  </script>
</body>
</html>
HTML;
    }

    public static function sanitizeLogo(string $url): string
    {
        $url = trim($url);
        if (empty($url)) {
            return '';
        }

        if (str_starts_with($url, 'data:image/svg+xml')) {
            if (str_contains($url, 'base64,')) {
                return $url;
            }
            $commaPos = strpos($url, ',');
            if ($commaPos !== false) {
                $svgContent = substr($url, $commaPos + 1);
                $svgContent = rawurldecode($svgContent);
                return 'data:image/svg+xml;base64,' . base64_encode($svgContent);
            }
        } elseif (str_starts_with($url, '<svg')) {
            return 'data:image/svg+xml;base64,' . base64_encode($url);
        }

        return htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
    }
}
