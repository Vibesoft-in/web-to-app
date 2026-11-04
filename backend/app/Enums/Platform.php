<?php

declare(strict_types=1);

namespace App\Enums;

enum Platform: string
{
    case WooCommerce = 'woo';
    case Shopify     = 'shopify';
    case WordPress   = 'wordpress';
}
