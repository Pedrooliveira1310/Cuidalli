<?php
declare(strict_types=1);
final class PasswordRecovery {
 public function __construct(private PDO $db,private ?Closure $mailer=null) {}
 public function handle(string $path,array $data):array {
  $email=strtolower(trim(is_string($data['email']??null)?$data['email']:''));
  if(strlen($email)>254||!filter_var($email,FILTER_VALIDATE_EMAIL))throw new ApiError(422,'Informe um e-mail válido.');
  if($path==='/auth/forgot-password')return $this->request($email);
  $code=$data['recovery_code']??'';$password=$data['password']??'';if(is_string($password))$password=trim($password);
  if(!is_string($code)||!preg_match('/^\d{6}$/',$code))throw new ApiError(422,'Digite os seis números enviados por e-mail.');
  if(!is_string($password)||strlen($password)<8||strlen($password)>72)throw new ApiError(422,'Use uma senha de 8 a 72 caracteres.');
  $this->db->beginTransaction();
  try {
   $q=$this->db->prepare('SELECT r.*,u.email FROM password_resets r JOIN users u ON u.id=r.user_id WHERE u.email=? FOR UPDATE');$q->execute([$email]);$r=$q->fetch();
   $valid=$r&&$r['attempts']<5&&strtotime($r['expires_at'].' UTC')>time()&&hash_equals($r['code_hash'],hash('sha256',$email.':'.$code));
   if(!$valid){if($r){$q=$this->db->prepare('UPDATE password_resets SET attempts=attempts+1 WHERE user_id=?');$q->execute([$r['user_id']]);}$this->db->commit();throw new ApiError(422,'Código inválido ou expirado. Solicite um novo código se necessário.');}
   $q=$this->db->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($password,PASSWORD_DEFAULT),$r['user_id']]);
   $q=$this->db->prepare('DELETE FROM sessions WHERE user_id=?');$q->execute([$r['user_id']]);
   $q=$this->db->prepare('DELETE FROM password_resets WHERE user_id=?');$q->execute([$r['user_id']]);
   $this->db->commit();return ['message'=>'Senha alterada. Entre com sua nova senha.'];
  }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
 }
 private function request(string $email):array {
  $brevo=getenv('BREVO_API_KEY');$key=$brevo?:getenv('RESEND_API_KEY');$from=getenv('MAIL_FROM');
  if(!$this->mailer&&(!$key||!$from))throw new ApiError(503,'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.');
  $generic=['message'=>'Se este e-mail estiver cadastrado, enviaremos um código válido por 10 minutos.'];
  $q=$this->db->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);$id=$q->fetchColumn();if(!$id)return $generic;
  $code=(string)random_int(100000,999999);
  $q=$this->db->prepare('INSERT INTO password_resets(user_id,code_hash,expires_at,attempts) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE),0) ON DUPLICATE KEY UPDATE code_hash=VALUES(code_hash),expires_at=VALUES(expires_at),attempts=0');$q->execute([$id,hash('sha256',$email.':'.$code)]);
  if($this->mailer){($this->mailer)($email,$code);return $generic;}
  $text="Seu código é $code. Ele vale por 10 minutos. Não compartilhe este código. Se não pediu a alteração, ignore este e-mail.";
  $url=$brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails';
  $headers=$brevo?"api-key: $key\r\nContent-Type: application/json\r\n":"Authorization: Bearer $key\r\nContent-Type: application/json\r\n";
  $payload=$brevo?['sender'=>['name'=>getenv('MAIL_FROM_NAME')?:'Cuidali','email'=>$from],'to'=>[['email'=>$email]],'subject'=>'Seu código de recuperação Cuidali','textContent'=>$text]:['from'=>$from,'to'=>[$email],'subject'=>'Seu código de recuperação Cuidali','text'=>$text];
  $context=stream_context_create(['http'=>['method'=>'POST','timeout'=>15,'ignore_errors'=>true,'header'=>$headers,'content'=>json_encode($payload,JSON_UNESCAPED_UNICODE)]]);
  $result=@file_get_contents($url,false,$context);$status=$http_response_header[0]??'';
  if($result===false||!preg_match('/\s2\d\d\s/',$status)){$q=$this->db->prepare('DELETE FROM password_resets WHERE user_id=? AND code_hash=?');$q->execute([$id,hash('sha256',$email.':'.$code)]);throw new ApiError(503,'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.');}
  return $generic;
 }
}
