<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli'||!str_ends_with(getenv('DB_NAME')?:'','_test'))exit(1);
ob_start();
$db=database();$api=new Api($db);$count=0;$suffix=(string)random_int(10000000,99999999);$password='TesteCuidali123';
function ok(bool $value,string $label):void{global $count;if(!$value)throw new RuntimeException($label);echo 'OK '.(++$count).' '.$label."\n";}
function callApi(string $method,string $path,array $data=[],string $token='',int $expected=200):array{global $api;try{$r=$api->dispatch($method,$path,$data,$token?'Bearer '.$token:'','account-test-'.getmypid());if($expected>=400)throw new RuntimeException('Esperado erro '.$expected);return $r;}catch(ApiError $e){ok($e->status===$expected,$path.' protege operação ('.$expected.')');return [];}}
$email='elder'.$suffix.'@example.com';$phone='119'.$suffix;
foreach (['1999-01-01',(new DateTimeImmutable('+1 year'))->format('Y-m-d')] as $birth) {
 callApi('POST','/auth/register',['role'=>'elder','name'=>'Idoso teste','phone'=>$phone,'email'=>$email,'password'=>$password,'birth_date'=>$birth,
  'emergency_contact'=>['name'=>'Contato','phone'=>'118'.$suffix,'relationship'=>'Teste']],'',422);
}
$elder=callApi('POST','/auth/register',['role'=>'elder','name'=>'Idoso teste','phone'=>$phone,'email'=>$email,'password'=>$password,'birth_date'=>'1960-01-01','emergency_contact'=>['name'=>'Contato','phone'=>'118'.$suffix,'relationship'=>'Teste']])['id'];
$et=callApi('POST','/auth/login',['phone'=>$phone,'password'=>$password])['token'];
ok(callApi('GET','/me',[],$et)['user']['email']===$email,'E-mail persiste no cadastro');
$otherSession=callApi('POST','/auth/login',['email'=>$email,'password'=>$password])['token'];
callApi('POST','/me/password',['current_password'=>$password,'password'=>'senha123','confirm_password'=>'senha123'],$et,422);
$strong='Cuidali-Troca92';
callApi('POST','/me/password',['current_password'=>$password,'password'=>$strong,'confirm_password'=>$strong],$et);
ok(callApi('GET','/me',[],$et)['user']['email']===$email,'Troca de senha mantém a sessão atual');
callApi('GET','/me',[],$otherSession,401);
callApi('POST','/auth/login',['phone'=>$phone,'password'=>$password],'',401);
$password=$strong;
ok(isset(callApi('POST','/auth/login',['email'=>$email,'password'=>$password])['token']),'Senha nova funciona no acesso por e-mail');
$db->prepare('INSERT INTO rate_limits(bucket,attempts,reset_at) VALUES(?,99,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE))')->execute([hash('sha256','assistant:'.$elder)]);
ok(isset(callApi('POST',"/elders/$elder/assistant",['message'=>'Olá'],$et)['reply']),'Assistente ignora bloqueios de 15 minutos gravados pela versão anterior');
$activity="/elders/$elder/activity";
$first=callApi('POST',$activity,[],$et);
$repeat=callApi('POST',$activity,[],$et);
ok($first['check_in_remaining_seconds']===900 && $repeat['check_in_remaining_seconds']>0 && $repeat['message']!==$first['message'],'Reenvio usa a confirmação existente');
$countCheckIns=$db->prepare("SELECT COUNT(*) FROM activities WHERE elder_id=? AND action='check_in'");
$countCheckIns->execute([$elder]);
ok((int)$countCheckIns->fetchColumn()===1 && callApi('GET',"/elders/$elder/dashboard",[],$et)['check_in_remaining_seconds']>0,'Bloqueio persiste no painel sem duplicar o registro');
$db->prepare("UPDATE activities SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 15 MINUTE) WHERE elder_id=? AND action='check_in'")->execute([$elder]);
ok(callApi('POST',$activity,[],$et)['message']===$first['message'],'Novo aviso é aceito ao fim de 15 minutos');
$r=callApi('POST',"/elders/$elder/assistant",['message'=>'Abrir calendário','previous_messages'=>['Como vejo minhas consultas?']],$et);
ok($r['action']==='Calendário','Assistente abre o calendário da pessoa idosa');
$cloudflare=AssistantIntent::provider()==='Cloudflare';
$answer=AssistantIntent::respond('Como deixo a letra maior no celular?', ['Uso um celular Android'], false,
    function(array $payload) use ($cloudflare): array {
        $messages=$cloudflare ? $payload['messages'] : $payload['input'];
        $context=json_decode(end($messages)['content'],true,8,JSON_THROW_ON_ERROR);
        ok($context['perguntas_recentes']===['Uso um celular Android'],'IA recebe a conversa recente para contextualizar perguntas gerais');
        $reply=['intent'=>'other','reply'=>'Abra Configurações, procure Tamanho da fonte e ajuste até ficar confortável para ler.'];
        return $cloudflare ? ['success'=>true,'result'=>['response'=>$reply]]
            : ['output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>json_encode($reply)]]]]];
    });
ok($answer['intent']==='other' && str_contains($answer['reply'],'Tamanho da fonte'),'Resposta geral do provedor é usada como conversa');
$pain=['type'=>'Pontada','intensity'=>4,'onset'=>'Hoje'];
$abdominal=['view'=>'front','region'=>'abdomen'];
$back=['view'=>'back','region'=>'lower_back'];
callApi('POST',"/elders/$elder/pains",$pain+['locations'=>[$abdominal,['view'=>'front','region'=>'anus']]],$et,422);
ok(callApi('GET',"/elders/$elder/pains",[],$et)['items']===[],'Lote inválido não grava regiões parciais');
$result=callApi('POST',"/elders/$elder/pains",$pain+['locations'=>[$abdominal,$back,$abdominal]],$et);
ok(count($result['ids'])===2,'Uma seleção grava duas regiões e elimina duplicatas');
$saved=callApi('GET',"/elders/$elder/pains",[],$et)['items'];
ok(array_column($saved,'region')===['lower_back','abdomen'],'Mapa mantém as vistas e regiões selecionadas');
ok(callApi('GET','/me',[],$et)['user']['sex']===null,'Conta antiga permanece sem sexo presumido');
$profile=['name'=>'Idoso teste','birth_date'=>'1960-01-01','phone'=>$phone,'email'=>$email];
callApi('PATCH','/me',$profile+['sex'=>'inválido'],$et,422);
ok(callApi('PATCH','/me',$profile+['sex'=>'female'],$et)['user']['sex']==='female','Conta existente pode salvar o sexo em Meus dados');
callApi('POST',"/elders/$elder/pains",$pain+['view'=>'front','region'=>'penis'],$et,422);
ok(isset(callApi('POST',"/elders/$elder/pains",$pain+['view'=>'front','region'=>'vulva'],$et)['id']),'Região correspondente pode ser registrada');
callApi('PATCH','/me',['name'=>'Nome editado','birth_date'=>'1960-01-01','phone'=>$phone,'email'=>$email],$et);
ok(callApi('GET','/me',[],$et)['user']['name']==='Nome editado','Nome editado persiste');
ok(callApi('GET','/me',[],$et)['user']['sex']==='female','Atendimento por versão antiga preserva o sexo cadastrado');
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
$recovery->handle('/auth/forgot-password',['email'=>$email]);
$latest=$sent[count($sent)-1][1];
$db->prepare('UPDATE password_resets SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE user_id=?')->execute([$elder]);
try{$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>$latest,'password'=>'OutraSenha123']);throw new RuntimeException('Código expirado aceito');}catch(ApiError $e){ok($e->status===422,'Código expirado não altera senha');}
$recovery->handle('/auth/forgot-password',['email'=>$email]);
$latest=$sent[count($sent)-1][1];
for($attempt=0;$attempt<5;$attempt++){
 try{$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>'000000','password'=>'OutraSenha123']);throw new RuntimeException('Código incorreto aceito');}catch(ApiError $e){ok($e->status===422,'Tentativa incorreta recusada '.($attempt+1));}
}
try{$recovery->handle('/auth/reset-password',['email'=>$email,'recovery_code'=>$latest,'password'=>'OutraSenha123']);throw new RuntimeException('Código bloqueado aceito');}catch(ApiError $e){ok($e->status===422,'Cinco erros bloqueiam o código mesmo com valor correto');}
ok(isset(callApi('POST','/auth/login',['phone'=>$phone,'password'=>'NovaSenha123'])['token']),'Tentativas de recuperação não alteram a senha vigente');
echo "$count verificações aprovadas.\n";
