<?php
declare(strict_types=1);

const DEMO_PROFILES = [
    'maria.cuidali@example.com' => ['role' => 'elder', 'name' => 'Maria Almeida', 'phone' => '0000000001'],
    'ana.cuidali@example.com' => ['role' => 'caregiver', 'name' => 'Ana Silva', 'phone' => '0000000002'],
];

function demoDatabaseConfigured(): bool {
    return str_ends_with(getenv('DB_NAME') ?: '', '_demo_test')
        && in_array(getenv('DB_HOST') ?: '127.0.0.1', ['127.0.0.1', 'localhost', '::1'], true);
}

function demoPassword(): ?string {
    $password = getenv('CUIDALI_DEMO_PASSWORD');
    return is_string($password) && strlen($password) >= 8 && strlen($password) <= 72 ? $password : null;
}

function demoWebEnabled(string $ip): bool {
    return PHP_SAPI === 'cli-server'
        && in_array($ip, ['127.0.0.1', '::1'], true)
        && demoDatabaseConfigured()
        && demoPassword() !== null;
}
