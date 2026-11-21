<?php
require __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Mail;

try {
    echo "Testing Brevo SMTP delivery to msanskriti1432@gmail.com...\n";
    Mail::raw("Hello! This is a test verification email from WebIntoApp Brevo SMTP.", function ($message) {
        $message->to("msanskriti1432@gmail.com")
                ->from("seo.vibesoft@gmail.com", "WebIntoApp")
                ->subject("WebIntoApp Verification Test");
    });
    echo "SUCCESS: Mail::raw sent successfully!\n";
} catch (\Throwable $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
