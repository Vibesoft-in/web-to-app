<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'    => ['nullable', 'string'],
            'otp'      => ['nullable', 'string', 'min:4', 'max:10'],
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (empty($this->token) && empty($this->otp)) {
                $validator->errors()->add('otp', 'A 6-digit recovery OTP code or reset token is required.');
            }
        });
    }
}
