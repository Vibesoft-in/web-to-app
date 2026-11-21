<?php

$sqliteDb = env('DB_DATABASE');

// Detect Windows paths on Linux/cPanel (e.g. c:/... or C:\... on Unix systems)
$isWindowsPathOnUnix = (DIRECTORY_SEPARATOR === '/') && ! empty($sqliteDb) && preg_match('/^[a-zA-Z]:[\\\\\/]/', (string) $sqliteDb);

// If empty, invalid Windows path on Linux, or non-existent file, automatically fallback to database_path('database.sqlite')
if (empty($sqliteDb) || $isWindowsPathOnUnix || (! file_exists($sqliteDb) && ! str_starts_with((string) $sqliteDb, ':memory:'))) {
    $sqliteDb = database_path('database.sqlite');
}

return [

    'default' => env('DB_CONNECTION', 'sqlite'),

    'connections' => [

        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DB_URL'),
            'database' => $sqliteDb,
            'prefix' => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
            'busy_timeout' => null,
            'journal_mode' => null,
            'synchronous' => null,
        ],

        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql') ? array_filter([
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],

    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

];
