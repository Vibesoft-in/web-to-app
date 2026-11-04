<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Connection;

use App\Models\App;
use Illuminate\Foundation\Http\FormRequest;

class VerifyConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $ulid = (string) $this->route('ulid');
        $app = App::withoutGlobalScopes()->where('ulid', $ulid)->first();
        $isShopify = $app && strtolower((string) ($app->platform instanceof \BackedEnum ? $app->platform->value : $app->platform)) === 'shopify';

        return [
            'site_url'        => ['required', 'string', 'max:255'],
            'consumer_key'    => ['required', 'string', 'max:255'],
            'consumer_secret' => [$isShopify ? 'nullable' : 'required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'site_url.required'        => 'The store site URL is required.',
            'consumer_key.required'    => 'The API Key or Access Token is required.',
            'consumer_secret.required' => 'The WooCommerce Consumer Secret is required.',
        ];
    }
}
