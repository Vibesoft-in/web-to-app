<?php

return [
    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID', 'appify-cloud'),
        'fcm_live'   => env('FIREBASE_FCM_LIVE', false),
    ],

    'whatsapp' => [
        'live'                 => env('WHATSAPP_LIVE', false),
        'phone_number_id'      => env('WHATSAPP_PHONE_NUMBER_ID'),
        'access_token'         => env('WHATSAPP_ACCESS_TOKEN'),
        'app_secret'           => env('WHATSAPP_APP_SECRET', 'appify_whatsapp_app_secret'),
        'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'appify_whatsapp_verify_token'),
    ],

    'razorpay' => [
        'key_id'         => env('RAZORPAY_KEY_ID'),
        'key_secret'     => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        'live'           => env('RAZORPAY_LIVE', true),
    ],
];
