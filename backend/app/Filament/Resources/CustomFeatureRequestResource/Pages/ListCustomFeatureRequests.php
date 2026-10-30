<?php

declare(strict_types=1);

namespace App\Filament\Resources\CustomFeatureRequestResource\Pages;

use App\Filament\Resources\CustomFeatureRequestResource;
use Filament\Resources\Pages\ListRecords;

class ListCustomFeatureRequests extends ListRecords
{
    protected static string $resource = CustomFeatureRequestResource::class;
}
