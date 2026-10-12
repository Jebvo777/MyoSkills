<?php
declare(strict_types=1);
return [
    'base_path' => '/mio',
    'app_url' => 'https://ps1.system404-sites.ru/mio',
    'debug' => false,
    'db' => [
        'driver' => 'mysql',
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'system404_mio',
        'user' => 'system404_mio',
        'password' => getenv('MYO_DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
    ],
    'uploads' => ['video_mb' => 80, 'image_mb' => 12, 'document_mb' => 15],
    'mail' => ['enabled' => false, 'from' => 'noreply@system404-sites.ru'],
    'contact_email' => '',
    'demo_labels' => true,
];
