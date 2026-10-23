<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if (PHP_SAPI!=='cli' || !str_ends_with(getenv('DB_NAME')?:'','_test') || getenv('TEST_ALLOW_RESET')!=='1') {fwrite(STDERR,"Use um banco terminado em _test e TEST_ALLOW_RESET=1. O teste apaga dados desse banco.\n");exit(1);}
$db=database();
foreach(['pain_views','activities','pains','contacts','appointments','dose_records','medication_times','medications','link_codes','care_links','sessions','rate_limits','users'] as $table) $db->exec("DELETE FROM $table");
$base=rtrim(getenv('TEST_API_URL')?:'http://127.0.0.1:8001','/');$count=0;
function check(bool $condition,string $message): void {global $count;$count++;if(!$condition)throw new RuntimeException("FALHOU: $message");echo "OK $count · $message\n";}
function request(string $method,string $path,array $body=[],?string $token=null,int $expected=200): array {
 global $base;
 $headers="Content-Type: application/json\r\n".($token?"Authorization: Bearer $token\r\n":'');
 $ctx=stream_context_create(['http'=>['method'=>$method,'header'=>$headers,'content'=>$method==='GET'?'':json_encode($body),'ignore_errors'=>true,'timeout'=>10]]);
 $raw=file_get_contents($base.$path,false,$ctx); $status=(int)explode(' ',$http_response_header[0])[1];
 $response=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
 check($status===$expected,"$method $path retorna $expected (recebido $status)");
 return $response;
}
function registerUser(string $phone,string $role): int {
 $data=['role'=>$role,'name'=>'Pessoa de teste','birth_date'=>'1960-05-01','phone'=>$phone,'password'=>'TesteCuidali123'];
 if($role==='elder')$data['emergency_contact']=['name'=>'Contato fictício','phone'=>'11999990000','relationship'=>'Filho'];
 return (int)request('POST','/auth/register',$data,null,201)['id'];
}
function loginUser(string $phone): string {return request('POST','/auth/login',['phone'=>$phone,'password'=>'TesteCuidali123'])['token'];}
try {
 request('GET','/health');
 $e=registerUser('11910000001','elder');$e2=registerUser('11910000002','elder');$c=registerUser('11910000003','caregiver');$c2=registerUser('11910000004','caregiver');
 request('POST','/auth/register',['role'=>'caregiver','name'=>'Duplicado','birth_date'=>'1990-01-01','phone'=>'11910000003','password'=>'TesteCuidali123'],null,409);
 request('POST','/auth/register',['role'=>'caregiver','name'=>'Inválido','birth_date'=>'2020-02-30','phone'=>'11910000009','password'=>'TesteCuidali123'],null,422);
 request('POST','/auth/login',['phone'=>'11910000003','password'=>'incorreta'],null,401);
 $et=loginUser('11910000001');$e2t=loginUser('11910000002');$ct=loginUser('11910000003');$c2t=loginUser('11910000004');
 check((int)request('GET','/me',[],$et)['user']['id']===$e,'Sessão identifica idoso');
 check(request('GET','/me',[],$ct)['user']['role']==='caregiver','Sessão identifica cuidador');
 request('GET',"/elders/$e/dashboard",[],$ct,403);request('GET',"/elders/$e2/dashboard",[],$et,403);request('GET',"/elders/$e/dashboard",[],null,401);
 $initial=request('GET',"/elders/$e/dashboard",[],$et); check($initial['doses']===[]&&$initial['appointments']===[]&&$initial['last_activity']===null,'Estados vazios são dados reais, atividade ausente é null');
 $code=request('POST','/link-codes',[],$et);
 request('POST','/links/redeem',['code'=>'INVALIDO'],$ct,422);
 request('POST','/links/redeem',['code'=>$code['code']],$ct);
 request('POST','/links/redeem',['code'=>$code['code']],$c2t,422);
 request('GET',"/elders/$e/dashboard",[],$ct);
 request('GET',"/elders/$e2/contacts",[],$ct,403);
 $code=request('POST','/link-codes',[],$et);request('DELETE','/link-codes/'.$code['id'],[],$et);request('POST','/links/redeem',['code'=>$code['code']],$c2t,422);
 $code=request('POST','/link-codes',[],$et);$db->prepare('UPDATE link_codes SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE id=?')->execute([$code['id']]);request('POST','/links/redeem',['code'=>$code['code']],$c2t,422);
 $old=request('POST','/link-codes',[],$et);$code=request('POST','/link-codes',[],$et);request('POST','/links/redeem',['code'=>$old['code']],$c2t,422);request('POST','/links/redeem',['code'=>$code['code']],$c2t);
 check(count(request('GET','/links',[],$et)['items'])===2,'Idoso pode ter dois cuidadores');
 $code=request('POST','/link-codes',[],$e2t);request('POST','/links/redeem',['code'=>$code['code']],$ct);check(count(request('GET','/links',[],$ct)['items'])===2,'Cuidador pode ter dois idosos');
 $med=['name'=>'Losartana teste','dosage'=>'50 mg','times'=>['08:00','20:00'],'start_date'=>date('Y-m-d'),'end_date'=>date('Y-m-d',strtotime('+5 day'))];
 request('POST',"/elders/$e/medications",$med,$et,403);
 $mid=request('POST',"/elders/$e/medications",$med,$ct,201)['id'];
 $meds=request('GET',"/elders/$e/medications",[],$et)['items'];check(count($meds[0]['times'])===2,'Dois horários persistidos');$time=(int)$meds[0]['times'][0]['id'];
 request('PATCH',"/elders/$e2/medications/$mid",$med,$ct,404);
 request('POST',"/elders/$e/medications",[...$med,'times'=>['25:00']],$ct,422);
 request('POST',"/elders/$e/medications",[...$med,'times'=>['08:00','08:00']],$ct,422);
 request('PATCH',"/elders/$e/medications/$mid",[...$med,'dosage'=>'25 mg'],$ct);
 request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d'),'status'=>'taken'],$ct,403);
 request('POST',"/elders/$e2/doses/$time",['date'=>date('Y-m-d'),'status'=>'taken'],$e2t,404);
 request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d',strtotime('-1 day')),'status'=>'taken'],$et,422);
 request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d'),'status'=>'pending'],$et);
 $result=request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d'),'status'=>'taken'],$et);check($result['dose']['status']==='taken','Ainda não pode virar Já tomei');
 request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d'),'status'=>'taken'],$et);
 $result=request('POST',"/elders/$e/doses/$time",['date'=>date('Y-m-d'),'status'=>'pending'],$et);check($result['dose']['status']==='taken','Dose já tomada não regride');
 check((int)$db->query('SELECT COUNT(*) FROM dose_records')->fetchColumn()===1,'Confirmação sem duplicidade');
 $a=['doctor'=>'Dra. Teste','specialty'=>'Cardiologia','scheduled_at'=>date('Y-m-d').'T14:00','location'=>'Clínica fictícia'];
 request('POST',"/elders/$e/appointments",$a,$et,403);
 $aid=request('POST',"/elders/$e/appointments",$a,$ct,201)['id'];
 $appointments=request('GET',"/elders/$e/appointments",[],$et)['items'];check(str_ends_with($appointments[0]['scheduled_at'],'17:00:00'),'Consulta 14h São Paulo persiste 17h UTC');
 request('PATCH',"/elders/$e/appointments/$aid",[...$a,'location'=>'Sala 2'],$ct);
 request('DELETE',"/elders/$e/appointments/$aid",[],$ct);check((int)request('GET',"/elders/$e/appointments/$aid",[],$et)['items'][0]['cancelled']===1,'Consulta cancelada preservada');
 $contact=['name'=>'Contato de teste','phone'=>'11999990001','relationship'=>'Filha','is_primary'=>true];
 $cid=request('POST',"/elders/$e/contacts",$contact,$et,201)['id'];
 $contacts=request('GET',"/elders/$e/contacts",[],$ct)['items'];check(count(array_filter($contacts,fn($r)=>(int)$r['is_primary']===1))===1,'Somente um contato principal');
 request('PATCH',"/elders/$e/contacts/$cid",[...$contact,'name'=>'Contato atualizado'],$ct);
 request('PATCH',"/elders/$e2/contacts/$cid",$contact,$ct,404);
 request('DELETE',"/elders/$e/contacts/$cid",[],$ct);request('GET',"/elders/$e/contacts/$cid",[],$et,404);
 $pain=['view'=>'front','region'=>'left_knee','type'=>'Pontada','intensity'=>8,'onset'=>'Hoje','notes'=>'Dados fictícios de teste'];
 request('POST',"/elders/$e/pains",$pain,$ct,403);request('POST',"/elders/$e/pains",[...$pain,'intensity'=>11],$et,422);
 $pid=request('POST',"/elders/$e/pains",$pain,$et,201)['id'];
 check(request('GET',"/elders/$e/pains",[],$ct)['items'][0]['region']==='left_knee','Dor aparece ao cuidador vinculado');
 request('POST',"/elders/$e/pains/$pid/seen",[],$ct);request('POST',"/elders/$e/pains/$pid/seen",[],$ct);
 $p=request('GET',"/elders/$e/pains/$pid",[],$ct)['items'][0];check(count($p['views'])===1&&(int)$p['views'][0]['caregiver_id']===$c&&!empty($p['views'][0]['viewed_at']),'Visualização tem cuidador, data e unicidade');
 request('DELETE',"/elders/$e/medications/$mid",[],$ct);check(count(request('GET',"/elders/$e/dashboard",[],$ct)['dose_history'])===1,'Desativar medicamento preserva histórico');
 request('DELETE',"/links/$c2",[],$et);request('GET',"/elders/$e/pains",[],$c2t,403);
 $expired=loginUser('11910000004');$db->prepare('UPDATE sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE token_hash=?')->execute([hash('sha256',$expired)]);request('GET','/me',[],$expired,401);
 check($db->query('SELECT token_hash FROM sessions LIMIT 1')->fetchColumn()!==$et,'Banco não armazena token puro');
 request('POST','/auth/logout',[],$et);request('GET','/me',[],$et,401);
 for($i=0;$i<10;$i++)request('POST','/links/redeem',['code'=>'BADCODE'],$ct,$i<7?422:429);
 for($i=0;$i<11;$i++) request('POST','/auth/login',['phone'=>'11988887777','password'=>'incorreta'],null,$i<10?401:429);
 echo "\n$count verificações passaram.\n";
} catch(Throwable $e) {fwrite(STDERR,$e->getMessage()."\n");exit(1);}
