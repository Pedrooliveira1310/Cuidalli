<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli'||!str_ends_with(getenv('DB_NAME')?:'','_test'))exit(1);
$db=database();$db->exec('DELETE FROM rate_limits');$base=getenv('TEST_API_URL')?:'http://127.0.0.1:8011';$count=0;
function checkPush(bool $ok,string $message):void{global $count;if(!$ok)throw new RuntimeException($message);echo 'OK '.(++$count).' '.$message."\n";}
function callPush(string $method,string $path,array $body=[],?string $token=null,int $expected=200):array{global $base;$headers="Content-Type: application/json\r\n".($token?"Authorization: Bearer $token\r\n":'');$raw=file_get_contents($base.$path,false,stream_context_create(['http'=>['method'=>$method,'header'=>$headers,'content'=>$method==='GET'?'':json_encode($body),'ignore_errors'=>true]]));$status=(int)explode(' ',$http_response_header[0])[1];checkPush($status===$expected,"$method $path: $status");return json_decode($raw,true,32,JSON_THROW_ON_ERROR);}
$suffix=(string)random_int(1000000,9999999);$ep='1161'.$suffix;$cp='1162'.$suffix;$password='TestePush123';
foreach([[$ep,'elder'],[$cp,'caregiver']] as [$phone,$role]){$b=['phone'=>$phone,'role'=>$role,'name'=>'Pessoa fictícia push','birth_date'=>'1960-01-01','password'=>$password];if($role==='elder')$b['emergency_contact']=['name'=>'Contato fictício','phone'=>'11900000000','relationship'=>'Família'];$r=callPush('POST','/auth/register',$b,null,201);if($role==='elder')$elder=(int)$r['id'];else$caregiver=(int)$r['id'];}
$et=callPush('POST','/auth/login',['phone'=>$ep,'password'=>$password])['token'];$ct=callPush('POST','/auth/login',['phone'=>$cp,'password'=>$password])['token'];
$device='fake_fcm_token_'.bin2hex(random_bytes(24));
callPush('POST','/push-tokens',['token'=>$device,'platform'=>'android'],null,401);
callPush('POST','/push-tokens',['token'=>'invalid','platform'=>'android'],$ct,422);
callPush('POST','/push-tokens',['token'=>$device,'platform'=>'android'],$ct);
callPush('POST','/push-tokens',['token'=>$device,'platform'=>'android'],$ct);
$q=$db->prepare('SELECT COUNT(*) FROM push_devices WHERE token_hash=? AND session_hash=?');$q->execute([hash('sha256',$device),hash('sha256',$ct)]);checkPush((int)$q->fetchColumn()===1,'Dispositivo deduplicado e vinculado à sessão autenticada');
$code=callPush('POST','/link-codes',[],$et)['code'];callPush('POST','/links/redeem',['code'=>$code],$ct);callPush('POST',"/elders/$elder/sos",[],$et);
$push=new PushService($db);$push->queue();$push->queue();
$q=$db->prepare("SELECT COUNT(*) FROM push_outbox o JOIN push_devices d ON d.id=o.device_id WHERE d.token_hash=? AND o.event_key LIKE 'alert:%'");$q->execute([hash('sha256',$device)]);checkPush((int)$q->fetchColumn()===1,'SOS cria somente uma entrega por dispositivo');
checkPush($push->deliver()===0,'Sem credenciais o teste não transmite mensagens externas');
callPush('DELETE',"/links/$elder",[],$ct);
$q=$db->prepare('SELECT COUNT(*) FROM push_outbox o JOIN push_devices d ON d.id=o.device_id WHERE d.token_hash=? AND (d.user_id=o.elder_id OR EXISTS(SELECT 1 FROM care_links l WHERE l.elder_id=o.elder_id AND l.caregiver_id=d.user_id))');$q->execute([hash('sha256',$device)]);checkPush((int)$q->fetchColumn()===0,'Desvinculação impede entrega de mensagens pendentes');
callPush('POST','/auth/logout',[],$ct);$q=$db->prepare('SELECT COUNT(*) FROM push_devices WHERE token_hash=?');$q->execute([hash('sha256',$device)]);checkPush((int)$q->fetchColumn()===0,'Logout revoga o registro de avisos e sua fila');
echo "$count verificações de push passaram.\n";
