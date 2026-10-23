<?php
declare(strict_types=1);
// Valores do processo têm precedência sobre o arquivo local, nunca servido por HTTP.
$env = dirname(__DIR__).'/.env';
if (is_file($env)) {
    foreach (file($env, FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line),'#') || !str_contains($line,'=')) continue;
        [$key,$value] = explode('=', $line, 2);
        if (getenv(trim($key)) === false) putenv(trim($key).'='.trim($value, " \t\n\r\0\x0B\"'"));
    }
}
date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'America/Sao_Paulo');
require_once __DIR__.'/Api.php';
function database(): PDO {
    $pdo = new PDO('mysql:host='.(getenv('DB_HOST') ?: '127.0.0.1').';port='.(getenv('DB_PORT') ?: '3306').';dbname='.(getenv('DB_NAME') ?: 'cuidali').';charset=utf8mb4', getenv('DB_USER') ?: 'cuidali', getenv('DB_PASSWORD') ?: '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}
