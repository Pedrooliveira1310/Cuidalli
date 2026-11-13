<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli'||!str_ends_with(getenv('DB_NAME')?:'','_test'))exit(1);
ob_start();
$db=database();$api=new Api($db);$count=0;$suffix=(string)random_int(10000000,99999999);$password='TesteCuidali123';
function ok(bool $value,string $label):void{global $count;if(!$value)throw new RuntimeException($label);echo 'OK '.(++$count).' '.$label."\n";}
function callApi(string $method,string $path,array $data=[],string $token='',int $expected=200):array{global $api;try{$r=$api->dispatch($method,$path,$data,$token?'Bearer '.$token:'','account-test-'.getmypid());if($expected>=400)throw new RuntimeException('Esperado erro '.$expected);return $r;}catch(ApiError $e){ok($e->status===$expected,$path.' protege operação ('.$expected.')');return [];}}
$email='elder'.$suffix.'@example.com';$phone='119'.$suffix;
$elder=callApi('POST','/auth/register',['role'=>'elder','name'=>'Idoso teste','phone'=>$phone,'email'=>$email,'password'=>$password,'birth_date'=>'1960-01-01','emergency_contact'=>['name'=>'Contato','phone'=>'118'.$suffix,'relationship'=>'Teste']])['id'];
$et=callApi('POST','/auth/login',['phone'=>$phone,'password'=>$password])['token'];
ok(callApi('GET','/me',[],$et)['user']['email']===$email,'E-mail persiste no cadastro');
callApi('PATCH','/me',['name'=>'Nome editado','birth_date'=>'1960-01-01','phone'=>$phone,'email'=>$email],$et);
ok(callApi('GET','/me',[],$et)['user']['name']==='Nome editado','Nome editado persiste');
callApi('PATCH','/me',['name'=>'Nome editado','birth_date'=>'1960-01-01','phone'=>$phone,'email'=>'novo'.$email,'current_password'=>'incorreta'],$et,403);
$med=callApi('POST',"/elders/$elder/medications",['name'=>'Medicação prescrita','dosage'=>'1 comprimido','start_date'=>date('Y-m-d'),'end_date'=>date('Y-m-d',strtotime('+7 days')),'times'=>['08:00']],$et);
ok(isset($med['id']),'Idoso cadastra medicamento próprio');
callApi('PATCH',"/elders/$elder/medications/".$med['id'],['name'=>'Nome corrigido','dosage'=>'1 comprimido','start_date'=>date('Y-m-d'),'end_date'=>date('Y-m-d',strtotime('+7 days')),'times'=>['09:00']],$et);
ok(callApi('GET',"/elders/$elder/medications",[],$et)['items'][0]['name']==='Nome corrigido','Idoso edita seu medicamento');
$consult=callApi('POST',"/elders/$elder/appointments",['doctor'=>'Dra. Teste','specialty'=>'Clínica geral','location'=>'Clínica','scheduled_at'=>date('Y-m-d',strtotime('+2 days')).'T14:00'],$et);
ok(isset($consult['id']),'Idoso cadastra consulta própria');
$r=callApi('POST',"/elders/$elder/assistant",['message'=>'Que horas é a novela da Globo?'],$et);ok(!str_contains($r['reply'],'Agora são'),'Pergunta externa não vira hora atual');
$r=callApi('POST',"/elders/$elder/assistant",['message'=>'Que horas são?'],$et);ok(str_contains($r['reply'],'Agora são'),'Pergunta explícita retorna hora atual');
$r=callApi('POST',"/elders/$elder/assistant",['message'=>'Qual o horário da minha consulta?'],$et);ok($r['action']==='Consultas','Horário de consulta consulta agenda');
$sent=[];$recovery=new PasswordRecovery($db,function($to,$code)use(&$sent){$sent[]=[$to,$code];});
$recovery->handle('/auth/forgot-password',['email'=>$email]);ok(count($sent)===1,'Recuperação envia apenas ao e-mail cadastrado');
$generic=$recovery->handle('/auth/forgot-password',['email'=>'unknown'.$suffix.'@example.com']);ok(count($sent)===1&&!str_contains($generic['message'],'não cadastrado'),'Resposta não revela existência da conta');
try{$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>'000000','password'=>'NovaSenha123']);throw new RuntimeException('Código incorreto aceito');}catch(ApiError $e){ok($e->status===422,'Código incorreto recusado');}
$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>$sent[0][1],'password'=>'NovaSenha123']);
callApi('GET','/me',[],$et,401);
callApi('POST','/auth/login',['phone'=>$phone,'password'=>$password],'',401);
ok(isset(callApi('POST','/auth/login',['phone'=>$phone,'password'=>'NovaSenha123'])['token']),'Nova senha permite entrada');
try{$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>$sent[0][1],'password'=>'OutraSenha123']);throw new RuntimeException('Código reutilizado');}catch(ApiError $e){ok($e->status===422,'Código consumido não pode ser reutilizado');}
echo "$count verificações aprovadas.\n";
