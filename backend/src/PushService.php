<?php
declare(strict_types=1);
final class PushService {
 private static ?string $accessToken=null;
 private static int $tokenExpires=0;
 public function __construct(private PDO $db){}
 private function query(string $sql,array $args=[]):PDOStatement{$q=$this->db->prepare($sql);$q->execute($args);return $q;}
 public function queue():void{
  $this->query("INSERT IGNORE INTO push_outbox(device_id,elder_id,event_key,title,body) SELECT d.id,a.elder_id,CONCAT('alert:',a.id),CASE a.kind WHEN 'sos' THEN 'Cuidali · Pedido de ajuda' WHEN 'pain' THEN 'Cuidali · Novo registro de dor' ELSE 'Cuidali · Ausência de atividade' END,'Abra o Cuidali para acompanhar a situação.' FROM care_alerts a JOIN care_links l ON l.elder_id=a.elder_id JOIN push_devices d ON d.user_id=l.caregiver_id JOIN sessions s ON s.token_hash=d.session_hash AND s.expires_at>UTC_TIMESTAMP() WHERE a.status='open'");
  $today=(new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
  $time=(new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))->format('H:i:s');
  $this->query("INSERT IGNORE INTO push_outbox(device_id,elder_id,event_key,title,body) SELECT d.id,m.elder_id,CONCAT('dose:',t.id,':',?),'Cuidali · Horário do medicamento','Você tem uma dose para conferir. Abra o Cuidali antes de confirmar.' FROM medications m JOIN medication_times t ON t.medication_id=m.id JOIN push_devices d ON d.user_id=m.elder_id JOIN sessions s ON s.token_hash=d.session_hash AND s.expires_at>UTC_TIMESTAMP() LEFT JOIN dose_records r ON r.time_id=t.id AND r.dose_date=? WHERE m.active=1 AND t.active=1 AND ? BETWEEN m.start_date AND m.end_date AND t.time<=? AND COALESCE(r.status,'')<>'taken'",[$today,$today,$today,$time]);
  $this->query("INSERT IGNORE INTO push_outbox(device_id,elder_id,event_key,title,body) SELECT d.id,a.elder_id,CONCAT('appointment:',a.id,':',DATE_FORMAT(a.scheduled_at,'%Y%m%d%H%i')),'Cuidali · Consulta em breve','Você tem uma consulta na próxima hora. Confira os detalhes no Cuidali.' FROM appointments a JOIN push_devices d ON d.user_id=a.elder_id JOIN sessions s ON s.token_hash=d.session_hash AND s.expires_at>UTC_TIMESTAMP() WHERE a.cancelled=0 AND a.scheduled_at BETWEEN UTC_TIMESTAMP() AND DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR)");
 }
 private function http(string $url,array $headers,string $body):array{
  $context=stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",$headers),'content'=>$body,'timeout'=>12,'ignore_errors'=>true]]);
  $response=@file_get_contents($url,false,$context);$status=isset($http_response_header[0])?(int)explode(' ',$http_response_header[0])[1]:0;
  return [$status,json_decode($response?:'{}',true)?:[]];
 }
 private function accessToken(array $account):?string{
  if(self::$accessToken&&self::$tokenExpires>time()+60)return self::$accessToken;
  $base64=fn($s)=>rtrim(strtr(base64_encode($s),'+/','-_'),'=');
  $header=$base64(json_encode(['alg'=>'RS256','typ'=>'JWT']));
  $claims=$base64(json_encode(['iss'=>$account['client_email'],'scope'=>'https://www.googleapis.com/auth/firebase.messaging','aud'=>'https://oauth2.googleapis.com/token','iat'=>time(),'exp'=>time()+3600]));
  $unsigned=$header.'.'.$claims;$signature='';
  if(!openssl_sign($unsigned,$signature,$account['private_key'],OPENSSL_ALGO_SHA256))return null;
  [$status,$data]=$this->http('https://oauth2.googleapis.com/token',['Content-Type: application/x-www-form-urlencoded'],http_build_query(['grant_type'=>'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion'=>$unsigned.'.'.$base64($signature)]));
  if($status!==200||empty($data['access_token'])){error_log('Cuidali push: autenticação do emissor indisponível (HTTP '.$status.').');return null;}
  self::$accessToken=$data['access_token'];self::$tokenExpires=time()+(int)$data['expires_in'];return self::$accessToken;
 }
 public function deliver():int{
  $account=json_decode(getenv('FIREBASE_SERVICE_ACCOUNT_JSON')?:'{}',true);
  if(empty($account['project_id'])||empty($account['client_email'])||empty($account['private_key']))return 0;
  $access=$this->accessToken($account);if(!$access)return 0;
  $sent=0;
  $jobs=$this->query("SELECT o.*,d.token,d.platform,d.user_id FROM push_outbox o JOIN push_devices d ON d.id=o.device_id JOIN sessions s ON s.token_hash=d.session_hash AND s.expires_at>UTC_TIMESTAMP() WHERE o.delivered_at IS NULL AND o.attempts<6 AND o.next_attempt<=UTC_TIMESTAMP() AND (d.user_id=o.elder_id OR EXISTS(SELECT 1 FROM care_links l WHERE l.elder_id=o.elder_id AND l.caregiver_id=d.user_id)) ORDER BY o.id LIMIT 100")->fetchAll();
  foreach($jobs as $job){
   $message=['token'=>$job['token'],'data'=>['event_key'=>$job['event_key'],'title'=>$job['title'],'body'=>$job['body']],'android'=>['priority'=>'high','ttl'=>'300s','collapse_key'=>$job['event_key']],'webpush'=>['notification'=>['title'=>$job['title'],'body'=>$job['body'],'icon'=>'/icon.svg','tag'=>$job['event_key']],'fcm_options'=>['link'=>getenv('APP_PUBLIC_URL')?:'https://cuidali-production.up.railway.app'],'headers'=>['TTL'=>'300','Urgency'=>'high']]];
   [$status,$data]=$this->http('https://fcm.googleapis.com/v1/projects/'.rawurlencode($account['project_id']).'/messages:send',['Content-Type: application/json','Authorization: Bearer '.$access],json_encode(['message'=>$message],JSON_UNESCAPED_UNICODE));
   if($status===200){$this->query('UPDATE push_outbox SET delivered_at=UTC_TIMESTAMP(),attempts=attempts+1 WHERE id=?',[$job['id']]);$sent++;}
   elseif(str_contains(json_encode($data),'UNREGISTERED'))$this->query('DELETE FROM push_devices WHERE id=?',[$job['device_id']]);
   else{error_log('Cuidali push: envio adiado (HTTP '.$status.').');$delay=min(3600,10*(2**(int)$job['attempts']));$this->query('UPDATE push_outbox SET attempts=attempts+1,next_attempt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE id=?',[$delay,$job['id']]);if($status===401){self::$accessToken=null;break;}}
  }
  return $sent;
 }
}
