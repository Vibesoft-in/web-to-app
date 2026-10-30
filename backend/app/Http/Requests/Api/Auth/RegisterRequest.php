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
            'business_name' => ['required', 'string', 'max:150'],
            'email'         => ['required', app()->environment(['testing', 'local']) ? 'email:rfc' : 'email:rfc,dns', 'max:255', 'unique:users,email'],
            // min 10 chars as per doc §4
            'password'      => ['required', 'string', 'min:10', 'confirmed'],
        ];
    }
}
