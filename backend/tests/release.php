<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli'||!str_ends_with(getenv('DB_NAME')?:'','_test'))exit(1);
$base=getenv('TEST_API_URL')?:'http://127.0.0.1:8011';$count=0;$db=database();
function verify($ok,$message){global $count;if(!$ok)throw new RuntimeException($message);echo 'OK '.(++$count).' '.$message."\n";}
function req($method,$path,$body=[],$token=null,$expected=200){global $base;$h="Content-Type: application/json\r\n".($token?"Authorization: Bearer $token\r\n":'');$raw=file_get_contents($base.$path,false,stream_context_create(['http'=>['method'=>$method,'header'=>$h,'content'=>$method==='GET'?'':json_encode($body),'ignore_errors'=>true]]));$code=(int)explode(' ',$http_response_header[0])[1];verify($code===$expected,"$method $path: $code");return json_decode($raw,true,32,JSON_THROW_ON_ERROR);}
$db->exec('DELETE FROM rate_limits');
$suffix=(string)random_int(1000000,9999999);$ep='1191'.$suffix;$cp='1192'.$suffix;$op='1193'.$suffix;
foreach([[$ep,'elder'],[$cp,'caregiver'],[$op,'caregiver']] as [$phone,$role]){$b=['phone'=>$phone,'role'=>$role,'name'=>'Teste integrado','birth_date'=>'1960-01-01','password'=>'TesteRelease123'];if($role==='elder')$b['emergency_contact']=['name'=>'Contato fictício','phone'=>'11900000000','relationship'=>'Família'];$r=req('POST','/auth/register',$b,null,201);if($role==='elder')$elder=$r['id'];}
$et=req('POST','/auth/login',['phone'=>$ep,'password'=>'TesteRelease123'])['token'];$ct=req('POST','/auth/login',['phone'=>$cp,'password'=>'TesteRelease123'])['token'];$ot=req('POST','/auth/login',['phone'=>$op,'password'=>'TesteRelease123'])['token'];
$code=req('POST','/link-codes',[],$et)['code'];req('POST','/links/redeem',['code'=>$code],$ct);
req('POST',"/elders/$elder/sos",[],$ot,403);req('POST',"/elders/$elder/sos",[],$ct,403);
$r=req('POST',"/elders/$elder/sos",[],$et);verify($r['contact']['name']==='Contato fictício','SOS retorna contato principal');req('POST',"/elders/$elder/sos",[],$et);
$alerts=req('GET',"/elders/$elder/alerts",[],$ct)['items'];verify(count($alerts)===1,'Toques repetidos geram um pedido');$id=$alerts[0]['id'];
req('PATCH',"/elders/$elder/alerts/$id",['status'=>'accepted'],$ot,403);req('PATCH',"/elders/$elder/alerts/$id",['status'=>'accepted'],$ct);
$a=req('GET',"/elders/$elder/alerts",[],$et)['items'][0];verify($a['status']==='accepted'&&$a['accepted_name']==='Teste integrado','Pessoa idosa vê o aceite identificado');
req('PATCH',"/elders/$elder/alerts/$id",['status'=>'resolved'],$ct);verify(count(req('GET','/notifications',[],$ct)['items'])===0,'Alerta resolvido sai dos avisos ativos');
req('PATCH',"/elders/$elder/settings",['inactivity_hours'=>0],$ct,422);req('PATCH',"/elders/$elder/settings",['inactivity_hours'=>1],$ct);
$db->prepare('UPDATE activities SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 HOUR) WHERE elder_id=? AND actor_id=?')->execute([$elder,$elder]);
$one=req('GET','/notifications',[],$ct)['items'];verify(count($one)===1&&$one[0]['kind']==='inactivity','Inatividade gera aviso');$two=req('GET','/notifications',[],$ct)['items'];verify(count($two)===1,'Inatividade deduplicada por episódio');
req('POST',"/elders/$elder/activity",[],$ct,403);req('POST',"/elders/$elder/activity",[],$et);verify(count(req('GET','/notifications',[],$ct)['items'])===0,'Atividade real encerra episódio de inatividade');
$r=req('POST',"/elders/$elder/assistant",['message'=>'Quais meus remédios?'],$et);verify($r['action']==='Medicamentos','Assistente consulta medicação');
$r=req('POST',"/elders/$elder/assistant",['message'=>'Preciso de ajuda'],$et);verify($r['action']==='SOS','Assistente encaminha SOS sem disparar pedido por engano');
req('GET',"/elders/$elder/assistant",[],$ot,403);verify(count(req('GET',"/elders/$elder/assistant",[],$ct)['items'])===2,'Conversa persistente e compartilhada apenas com vínculo');
req('DELETE',"/links/$elder",[],$ct);req('GET',"/elders/$elder/alerts",[],$ct,403);verify(count(req('GET','/notifications',[],$ct)['items'])===0,'Remover vínculo remove acesso aos avisos');
echo "$count verificações de release passaram.\n";
