<?php

declare(strict_types=1);

namespace App\Enums;

enum AppStatus: string
{
    case Draft      = 'draft';
    case Verified   = 'verified';
    case Configured = 'configured';
    case Paid       = 'paid';
    case Building   = 'building';
    case Completed  = 'completed';
    case Live       = 'live';
    case Active     = 'active';
}
