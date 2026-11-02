<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public endpoint
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:100'],
            'business_name' => ['nullable', 'string', 'max:150'],
            'email'         => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:6'],
            'phone'         => ['nullable', 'string', 'max:50'],
            'website_url'   => ['nullable', 'string', 'max:255'],
            'platform'      => ['nullable', 'string', 'max:50'],
            'website_name'  => ['nullable', 'string', 'max:150'],
        ];
    }
}
