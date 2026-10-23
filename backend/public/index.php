<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_filter(array_map('trim',explode(',',getenv('CORS_ORIGINS') ?: 'http://localhost:8081')));
if ($origin && in_array($origin,$allowed,true)) {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
try {
    $raw = file_get_contents('php://input');
    if (strlen($raw)>16384) throw new ApiError(413,'Requisição muito grande.');
    $input = $raw === '' ? [] : json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($input) || ($input !== [] && array_is_list($input))) throw new ApiError(400,'Envie um objeto JSON.');
    $api = new Api(database());
    $response = $api->dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH), $input, $_SERVER['HTTP_AUTHORIZATION'] ?? '', $_SERVER['REMOTE_ADDR'] ?? 'local');
    echo json_encode($response,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    http_response_code(400); echo json_encode(['error'=>'JSON inválido.']);
} catch (ApiError $e) {
    http_response_code($e->status); echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    // Não registrar corpos, tokens, credenciais ou detalhes SQL.
    error_log('Cuidali: falha interna '.get_class($e));
    http_response_code(500); echo json_encode(['error'=>'Não foi possível concluir. Tente novamente.']);
}
