<?php
require __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Email Logs:\n";
foreach (\App\Models\EmailLog::latest()->take(10)->get() as $log) {
    echo "{$log->id} | {$log->recipient_email} | {$log->type} | {$log->status} | {$log->error_message} | {$log->created_at}\n";
}
