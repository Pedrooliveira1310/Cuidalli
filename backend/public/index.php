<?php
declare(strict_types=1);
$requestPath=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$apiPath=preg_match('#^/(health|auth|me|links|link-codes|elders|notifications)(/|$)#',$requestPath);
if (!$apiPath && $_SERVER['REQUEST_METHOD']==='GET') {
    $webRoot=realpath(dirname(__DIR__).'/web');
    $relative=$requestPath==='/'?'index.html':ltrim(rawurldecode($requestPath),'/');
    $file=$webRoot?realpath($webRoot.'/'.$relative):false;
    $ext=$file?strtolower(pathinfo($file,PATHINFO_EXTENSION)):'';
    $types=['html'=>'text/html; charset=utf-8','js'=>'application/javascript; charset=utf-8','css'=>'text/css; charset=utf-8','json'=>'application/json','webmanifest'=>'application/manifest+json','svg'=>'image/svg+xml','png'=>'image/png','woff2'=>'font/woff2','ico'=>'image/x-icon'];
    if($file&&str_starts_with($file,$webRoot.DIRECTORY_SEPARATOR)&&is_file($file)&&isset($types[$ext])) {
        header('Content-Type: '.$types[$ext]);header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");header('Cache-Control: '.($ext==='html'||basename($file)==='sw.js'?'no-cache':'public, max-age=86400'));readfile($file);exit;
    }
    http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Página não encontrada.';exit;
}
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
    $authorization=$_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($authorization==='' && isset($_COOKIE['cuidali_session']) && !in_array($requestPath,['/auth/login','/auth/register'],true)) {
        if (!in_array($_SERVER['REQUEST_METHOD'],['GET','OPTIONS'],true)) {
            $originHost=parse_url($_SERVER['HTTP_ORIGIN']??'',PHP_URL_HOST);
            $originPort=parse_url($_SERVER['HTTP_ORIGIN']??'',PHP_URL_PORT);
            $originAuthority=$originHost.($originPort?':'.$originPort:'');
            if($originAuthority!==($_SERVER['HTTP_HOST']??''))throw new ApiError(403,'Origem não permitida.');
        }
        $authorization='Bearer '.$_COOKIE['cuidali_session'];
    }
    $raw = file_get_contents('php://input');
    if (strlen($raw)>16384) throw new ApiError(413,'Requisição muito grande.');
    $input = $raw === '' ? [] : json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($input) || ($input !== [] && array_is_list($input))) throw new ApiError(400,'Envie um objeto JSON.');
    $api = new Api(database());
    $response = $api->dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH), $input, $authorization, $_SERVER['REMOTE_ADDR'] ?? 'local');
    $secure=getenv('COOKIE_SECURE')==='true'||(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off');
    if($requestPath==='/auth/login'&&isset($response['token'])) setcookie('cuidali_session',$response['token'],['expires'=>time()+$response['expires_in_seconds'],'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
    if($requestPath==='/auth/logout')setcookie('cuidali_session','',['expires'=>1,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
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
