<?php
declare(strict_types=1);
final class ApiError extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
final class Api {
    private array $user;
    public function __construct(private PDO $db) {}
    private function query(string $sql, array $params=[]): PDOStatement {
        $q=$this->db->prepare($sql); $q->execute($params); return $q;
    }
    private function fail(int $status,string $message): never { throw new ApiError($status,$message); }
    private function text(array $data,string $key,int $max=100): string {
        $value=$data[$key] ?? null;
        if (!is_string($value) || trim($value)==='' || strlen(trim($value))>$max) $this->fail(422,"Preencha corretamente: $key.");
        return trim($value);
    }
    private function phone(array $data,string $key='phone'): string {
        $v=preg_replace('/[\s()+.-]/','',$this->text($data,$key,30));
        if (!preg_match('/^[0-9]{10,15}$/',$v)) $this->fail(422,'Informe telefone com DDD (10 a 15 dígitos).');
        return $v;
    }
    private function date(array $data,string $key): string {
        $v=$this->text($data,$key,10); $d=DateTimeImmutable::createFromFormat('!Y-m-d',$v);
        if (!$d || $d->format('Y-m-d')!==$v) $this->fail(422,"Data inválida: $key. Use AAAA-MM-DD.");
        return $v;
    }
    private function enum(array $data,string $key,array $values): string {
        $v=$this->text($data,$key,100);
        if (!in_array($v,$values,true)) $this->fail(422,"Opção inválida: $key.");
        return $v;
    }
    private function role(string $role): void { if ($this->user['role']!==$role) $this->fail(403,'Seu perfil não pode realizar esta operação.'); }
    private function rate(string $key,int $max): void {
        $bucket=hash('sha256',$key);
        $this->query('INSERT INTO rate_limits(bucket,attempts,reset_at) VALUES(?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(reset_at<=UTC_TIMESTAMP(),1,attempts+1),reset_at=IF(reset_at<=UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),reset_at)',[$bucket]);
        if ((int)$this->query('SELECT attempts FROM rate_limits WHERE bucket=?',[$bucket])->fetchColumn()>$max) $this->fail(429,'Muitas tentativas. Aguarde 15 minutos.');
    }
    private function activity(int $elder,string $action): void {
        $this->query('INSERT INTO activities(elder_id,actor_id,action) VALUES(?,?,?)',[$elder,$this->user['id'],$action]);
    }
    private function authorize(int $elder): void {
        $valid=$this->user['role']==='elder' ? (int)$this->user['id']===$elder : (bool)$this->query('SELECT 1 FROM care_links WHERE elder_id=? AND caregiver_id=?',[$elder,$this->user['id']])->fetchColumn();
        if (!$valid) $this->fail(403,'Você não tem vínculo ativo com esta pessoa.');
    }
    private function item(string $table,int $id,int $elder): array {
        $row=$this->query("SELECT * FROM $table WHERE id=? AND elder_id=?",[$id,$elder])->fetch();
        if (!$row) $this->fail(404,'Registro não encontrado.');
        return $row;
    }
    private function transaction(callable $action): mixed {
        $this->db->beginTransaction();
        try { $result=$action(); $this->db->commit(); return $result; }
        catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function dispatch(string $method,string $path,array $data,string $authorization,string $ip): array {
        if ($method==='GET' && $path==='/health') { $this->query('SELECT 1'); return ['status'=>'ok','timezone'=>date_default_timezone_get()]; }
        if ($method==='POST' && $path==='/auth/register') return $this->register($data,$ip);
        if ($method==='POST' && $path==='/auth/login') return $this->login($data,$ip);
        if (!preg_match('/^Bearer ([a-f0-9]{64})$/',$authorization,$m)) $this->fail(401,'Entre novamente para continuar.');
        $hash=hash('sha256',$m[1]);
        $this->user=$this->query('SELECT u.id,u.role,u.name,u.birth_date,u.phone FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()',[$hash])->fetch() ?: [];
        if (!$this->user) $this->fail(401,'Sessão expirada. Entre novamente.');
        if ($method==='GET' && $path==='/me') return ['user'=>$this->user];
        if ($method==='POST' && $path==='/auth/logout') { $this->query('DELETE FROM sessions WHERE token_hash=?',[$hash]); return ['message'=>'Você saiu da conta.']; }
        if ($path==='/links' && $method==='GET') {
            $elder=$this->user['role']==='elder';
            return ['items'=>$this->query('SELECT u.id,u.name,u.phone FROM care_links l JOIN users u ON u.id=l.'.($elder?'caregiver_id':'elder_id').' WHERE l.'.($elder?'elder_id':'caregiver_id').'=?',[$this->user['id']])->fetchAll()];
        }
        if (preg_match('#^/links/(\d+)$#',$path,$m) && $method==='DELETE') {
            $elder=$this->user['role']==='elder';
            $this->query('DELETE FROM care_links WHERE '.($elder?'elder_id=? AND caregiver_id=?':'caregiver_id=? AND elder_id=?'),[$this->user['id'],(int)$m[1]]);
            return ['message'=>'Vínculo removido.'];
        }
        if ($path==='/link-codes' && $method==='POST') {
            $this->role('elder'); $this->rate('generate:'.$this->user['id'],20);
            return $this->transaction(function () {
                $this->query('SELECT id FROM users WHERE id=? FOR UPDATE',[$this->user['id']]);
                $this->query('UPDATE link_codes SET revoked_at=UTC_TIMESTAMP() WHERE elder_id=? AND used_at IS NULL AND revoked_at IS NULL',[$this->user['id']]);
                $code=strtoupper(bin2hex(random_bytes(6)));
                $this->query('INSERT INTO link_codes(elder_id,code_hash,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))',[$this->user['id'],hash('sha256',$code)]);
                return ['id'=>(int)$this->db->lastInsertId(),'code'=>$code,'expires_in_seconds'=>600,'message'=>'Compartilhe apenas com um cuidador de confiança. O código permite um vínculo e expira em 10 minutos.'];
            });
        }
        if (preg_match('#^/link-codes/(\d+)$#',$path,$m) && $method==='DELETE') {
            $this->role('elder'); $this->query('UPDATE link_codes SET revoked_at=UTC_TIMESTAMP() WHERE id=? AND elder_id=?',[(int)$m[1],$this->user['id']]); return ['message'=>'Código revogado.'];
        }
        if ($path==='/links/redeem' && $method==='POST') {
            $this->role('caregiver'); $this->rate('redeem:user:'.$this->user['id'],10); $this->rate('redeem:ip:'.$ip,30);
            $code=strtoupper($this->text($data,'code',12));
            return $this->transaction(function () use ($code) {
                $row=$this->query('SELECT * FROM link_codes WHERE code_hash=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[hash('sha256',$code)])->fetch();
                if (!$row) $this->fail(422,'Código inválido, expirado, revogado ou já utilizado.');
                $this->query('INSERT IGNORE INTO care_links(elder_id,caregiver_id) VALUES(?,?)',[$row['elder_id'],$this->user['id']]);
                $this->query('UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE id=?',[$row['id']]);
                $this->activity((int)$row['elder_id'],'link_created');
                return ['elder_id'=>(int)$row['elder_id'],'message'=>'Vinculação concluída.'];
            });
        }
        if (!preg_match('#^/elders/(\d+)/(dashboard|medications|doses|appointments|contacts|pains)(?:/(\d+))?(?:/(seen))?$#',$path,$m)) $this->fail(404,'Rota não encontrada.');
        $elder=(int)$m[1]; $resource=$m[2]; $id=isset($m[3])?(int)$m[3]:0; $seen=($m[4]??'')==='seen';
        $this->authorize($elder);
        if ($resource==='dashboard' && $method==='GET' && !$id) return $this->dashboard($elder);
        if ($resource==='medications') return $this->medications($method,$elder,$id,$data);
        if ($resource==='doses' && $method==='POST' && $id) return $this->dose($elder,$id,$data);
        if ($resource==='appointments') return $this->appointments($method,$elder,$id,$data);
        if ($resource==='contacts') return $this->contacts($method,$elder,$id,$data);
        if ($resource==='pains') return $this->pains($method,$elder,$id,$data,$seen);
        $this->fail(405,'Método não permitido.');
    }
    private function register(array $data,string $ip): array {
        $this->rate('register:'.$ip,20);
        $role=$this->enum($data,'role',['elder','caregiver']); $name=$this->text($data,'name'); $birth=$this->date($data,'birth_date');
        if ($birth>date('Y-m-d') || $birth<'1900-01-01') $this->fail(422,'Data de nascimento inválida.');
        $phone=$this->phone($data); $password=$this->text($data,'password',72);
        if (strlen($password)<8) $this->fail(422,'A senha deve ter de 8 a 72 caracteres.');
        $contact=null;
        if ($role==='elder') {
            if (!isset($data['emergency_contact']) || !is_array($data['emergency_contact'])) $this->fail(422,'Informe o contato de emergência.');
            $c=$data['emergency_contact']; $contact=[$this->text($c,'name'),$this->phone($c),$this->text($c,'relationship',60)];
        }
        try {
            return $this->transaction(function () use($role,$name,$birth,$phone,$password,$contact) {
                $this->query('INSERT INTO users(role,name,birth_date,phone,password_hash) VALUES(?,?,?,?,?)',[$role,$name,$birth,$phone,password_hash($password,PASSWORD_DEFAULT)]);
                $id=(int)$this->db->lastInsertId();
                if ($contact) $this->query('INSERT INTO contacts(elder_id,name,phone,relationship,is_primary) VALUES(?,?,?,?,1)',[$id,...$contact]);
                http_response_code(201); return ['id'=>$id,'message'=>'Conta criada. Entre com telefone e senha.'];
            });
        } catch(PDOException $e) { if (($e->errorInfo[1]??0)===1062) $this->fail(409,'Este telefone já possui uma conta.'); throw $e; }
    }
    private function login(array $data,string $ip): array {
        $phone=$this->phone($data); $password=$this->text($data,'password',72);
        $this->rate('login:ip:'.$ip,40); $this->rate('login:phone:'.$phone,10);
        $u=$this->query('SELECT * FROM users WHERE phone=?',[$phone])->fetch();
        $valid=password_verify($password,$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$u || !$valid) $this->fail(401,'Telefone ou senha incorretos.');
        $token=bin2hex(random_bytes(32)); $hours=max(1,min(720,(int)(getenv('SESSION_HOURS')?:168)));
        $this->query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',[hash('sha256',$token),$u['id'],gmdate('Y-m-d H:i:s',time()+$hours*3600)]);
        unset($u['password_hash']); return ['token'=>$token,'user'=>$u,'expires_in_seconds'=>$hours*3600];
    }
    private function medications(string $method,int $elder,int $id,array $data): array {
        if ($method==='GET') {
            $items=$id?[$this->item('medications',$id,$elder)]:$this->query('SELECT * FROM medications WHERE elder_id=? ORDER BY active DESC,id DESC',[$elder])->fetchAll();
            foreach($items as &$item) $item['times']=$this->query('SELECT id,TIME_FORMAT(time,"%H:%i") AS time FROM medication_times WHERE medication_id=? AND active=1 ORDER BY time',[$item['id']])->fetchAll();
            return ['items'=>$items];
        }
        $this->role('caregiver');
        if ($id) $this->item('medications',$id,$elder);
        if ($method==='DELETE' && $id) {
            $this->query('UPDATE medications SET active=0 WHERE id=?',[$id]); $this->activity($elder,'medication_deactivated'); return ['message'=>'Medicamento desativado; histórico preservado.'];
        }
        if (!(($method==='POST'&&!$id)||($method==='PATCH'&&$id))) $this->fail(405,'Método não permitido.');
        $name=$this->text($data,'name'); $dosage=$this->text($data,'dosage',60); $start=$this->date($data,'start_date'); $end=$this->date($data,'end_date');
        if ($end<$start) $this->fail(422,'O fim do tratamento deve ser igual ou posterior ao início.');
        $times=$data['times']??[];
        if (!is_array($times)||count($times)<1||count($times)>24) $this->fail(422,'Informe de 1 a 24 horários.');
        foreach($times as $time) if (!is_string($time)||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/',$time)) $this->fail(422,'Horário inválido. Use HH:MM.');
        if (count(array_unique($times))!==count($times)) $this->fail(422,'Não repita horários.');
        return $this->transaction(function() use($id,$elder,$name,$dosage,$start,$end,$times,$method) {
            if ($id) $this->query('UPDATE medications SET name=?,dosage=?,start_date=?,end_date=? WHERE id=?',[$name,$dosage,$start,$end,$id]);
            else { $this->query('INSERT INTO medications(elder_id,name,dosage,start_date,end_date) VALUES(?,?,?,?,?)',[$elder,$name,$dosage,$start,$end]); $id=(int)$this->db->lastInsertId(); }
            $this->query('UPDATE medication_times SET active=0 WHERE medication_id=?',[$id]);
            foreach($times as $time) $this->query('INSERT INTO medication_times(medication_id,time) VALUES(?,?) ON DUPLICATE KEY UPDATE active=1',[$id,$time]);
            $this->activity($elder,'medication_saved'); if($method==='POST') http_response_code(201); return ['id'=>$id,'message'=>'Medicamento salvo.'];
        });
    }
    private function dose(int $elder,int $timeId,array $data): array {
        $this->role('elder'); $date=$this->date($data,'date'); $status=$this->enum($data,'status',['taken','pending']);
        if ($date!==date('Y-m-d')) $this->fail(422,'Registre somente doses de hoje.');
        return $this->transaction(function() use($elder,$timeId,$date,$status) {
            $t=$this->query('SELECT t.id FROM medication_times t JOIN medications m ON m.id=t.medication_id WHERE t.id=? AND m.elder_id=? AND m.active=1 AND t.active=1 AND ? BETWEEN m.start_date AND m.end_date FOR UPDATE',[$timeId,$elder,$date])->fetch();
            if (!$t) $this->fail(404,'Dose não prevista para esta data.');
            // Uma linha por dose; taken é terminal, pending pode virar taken.
            $this->query("INSERT INTO dose_records(time_id,dose_date,status) VALUES(?,?,?) ON DUPLICATE KEY UPDATE recorded_at=IF(status='taken',recorded_at,UTC_TIMESTAMP()),status=IF(status='taken','taken',VALUES(status))",[$timeId,$date,$status]);
            $this->activity($elder,'dose_recorded'); return ['message'=>'Registro salvo.','dose'=>$this->query('SELECT * FROM dose_records WHERE time_id=? AND dose_date=?',[$timeId,$date])->fetch()];
        });
    }
    private function appointments(string $method,int $elder,int $id,array $data): array {
        if ($method==='GET') return ['items'=>$id?[$this->item('appointments',$id,$elder)]:$this->query('SELECT * FROM appointments WHERE elder_id=? ORDER BY scheduled_at',[$elder])->fetchAll()];
        $this->role('caregiver'); if ($id) $this->item('appointments',$id,$elder);
        if ($method==='DELETE'&&$id) { $this->query('UPDATE appointments SET cancelled=1 WHERE id=?',[$id]); $this->activity($elder,'appointment_cancelled'); return ['message'=>'Consulta cancelada.']; }
        if (!(($method==='POST'&&!$id)||($method==='PATCH'&&$id))) $this->fail(405,'Método não permitido.');
        $doctor=$this->text($data,'doctor'); $specialty=$this->text($data,'specialty'); $location=$this->text($data,'location',200); $at=$this->text($data,'scheduled_at',16);
        $d=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$at);
        if (!$d||$d->format('Y-m-d\TH:i')!==$at) $this->fail(422,'Data/hora inválida. Use AAAA-MM-DDTHH:MM no fuso de São Paulo.');
        $utc=$d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        if ($id) $this->query('UPDATE appointments SET doctor=?,specialty=?,location=?,scheduled_at=? WHERE id=?',[$doctor,$specialty,$location,$utc,$id]);
        else { $this->query('INSERT INTO appointments(elder_id,doctor,specialty,location,scheduled_at) VALUES(?,?,?,?,?)',[$elder,$doctor,$specialty,$location,$utc]); $id=(int)$this->db->lastInsertId(); http_response_code(201); }
        $this->activity($elder,'appointment_saved'); return ['id'=>$id,'message'=>'Consulta salva.'];
    }
    private function contacts(string $method,int $elder,int $id,array $data): array {
        if ($method==='GET') return ['items'=>$id?[$this->item('contacts',$id,$elder)]:$this->query('SELECT * FROM contacts WHERE elder_id=? ORDER BY is_primary DESC,id',[$elder])->fetchAll()];
        if ($id) $this->item('contacts',$id,$elder);
        if ($method==='DELETE'&&$id) { $this->query('DELETE FROM contacts WHERE id=?',[$id]); $this->activity($elder,'contact_deleted'); return ['message'=>'Contato excluído. Se era principal, escolha outro contato para SOS.']; }
        if (!(($method==='POST'&&!$id)||($method==='PATCH'&&$id))) $this->fail(405,'Método não permitido.');
        $name=$this->text($data,'name'); $phone=$this->phone($data); $rel=$this->text($data,'relationship',60);
        if (isset($data['is_primary'])&&!is_bool($data['is_primary'])) $this->fail(422,'is_primary deve ser booleano.');
        $primary=($data['is_primary']??false)?1:0;
        return $this->transaction(function() use($elder,$id,$name,$phone,$rel,$primary,$method) {
            $this->query('SELECT id FROM users WHERE id=? FOR UPDATE',[$elder]);
            if ($primary) $this->query('UPDATE contacts SET is_primary=0 WHERE elder_id=?',[$elder]);
            if ($id) $this->query('UPDATE contacts SET name=?,phone=?,relationship=?,is_primary=? WHERE id=?',[$name,$phone,$rel,$primary,$id]);
            else { $this->query('INSERT INTO contacts(elder_id,name,phone,relationship,is_primary) VALUES(?,?,?,?,?)',[$elder,$name,$phone,$rel,$primary]); $id=(int)$this->db->lastInsertId(); }
            $this->activity($elder,'contact_saved'); if($method==='POST') http_response_code(201); return ['id'=>$id,'message'=>'Contato salvo.'];
        });
    }
    private function pains(string $method,int $elder,int $id,array $data,bool $seen): array {
        if ($seen) {
            $this->role('caregiver'); if($method!=='POST') $this->fail(405,'Método não permitido.');
            $this->item('pains',$id,$elder);
            $this->query('INSERT IGNORE INTO pain_views(pain_id,caregiver_id) VALUES(?,?)',[$id,$this->user['id']]);
            return ['message'=>'Visualização registrada.'];
        }
        if ($method==='GET') {
            $items=$id?[$this->item('pains',$id,$elder)]:$this->query('SELECT * FROM pains WHERE elder_id=? ORDER BY created_at DESC,id DESC',[$elder])->fetchAll();
            foreach($items as &$p) $p['views']=$this->query('SELECT v.caregiver_id,u.name,v.viewed_at FROM pain_views v JOIN users u ON u.id=v.caregiver_id WHERE v.pain_id=?',[$p['id']])->fetchAll();
            return ['items'=>$items];
        }
        $this->role('elder'); if ($method!=='POST'||$id) $this->fail(405,'Método não permitido.');
        $view=$this->enum($data,'view',['front','back']);
        $region=$this->enum($data,'region',['head','chest','abdomen','upper_back','lower_back','left_shoulder','right_shoulder','left_arm','right_arm','left_hand','right_hand','left_hip','right_hip','left_leg','right_leg','left_knee','right_knee','left_foot','right_foot']);
        $type=$this->enum($data,'type',['Pontada','Queimação','Latejante','Aperto / peso','Formigamento','Constante']);
        $intensity=$data['intensity']??null;
        if (!is_int($intensity)||$intensity<1||$intensity>10) $this->fail(422,'Intensidade deve ser um inteiro de 1 a 10.');
        $onset=$this->enum($data,'onset',['Hoje','Alguns dias','Mais de 1 semana']);
        $notes=$data['notes']??'';
        if (!is_string($notes)||strlen($notes)>1000) $this->fail(422,'Observação deve ter até 1000 caracteres.');
        $this->query('INSERT INTO pains(elder_id,view,region,type,intensity,onset,notes) VALUES(?,?,?,?,?,?,?)',[$elder,$view,$region,$type,$intensity,$onset,$notes]);
        $id=(int)$this->db->lastInsertId(); $this->activity($elder,'pain_recorded'); http_response_code(201);
        return ['id'=>$id,'message'=>'Dor registrada e disponível aos cuidadores vinculados. Nenhuma notificação remota foi enviada.'];
    }
    private function dashboard(int $elder): array {
        $today=date('Y-m-d'); $start=(new DateTimeImmutable($today))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $end=(new DateTimeImmutable($today))->modify('+1 day')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        return [
            'date'=>$today,'timezone'=>date_default_timezone_get(),
            'elder'=>$this->query('SELECT id,name,phone FROM users WHERE id=?',[$elder])->fetch(),
            'last_activity'=>$this->query('SELECT action,created_at FROM activities WHERE elder_id=? AND actor_id=? ORDER BY id DESC LIMIT 1',[$elder,$elder])->fetch() ?: null,
            'doses'=>$this->query("SELECT t.id AS time_id,m.id AS medication_id,m.name,m.dosage,TIME_FORMAT(t.time,'%H:%i') AS time,COALESCE(d.status,'unconfirmed') AS status,d.recorded_at FROM medications m JOIN medication_times t ON t.medication_id=m.id LEFT JOIN dose_records d ON d.time_id=t.id AND d.dose_date=? WHERE m.elder_id=? AND m.active=1 AND t.active=1 AND ? BETWEEN m.start_date AND m.end_date ORDER BY t.time,m.id",[$today,$elder,$today])->fetchAll(),
            'appointments'=>$this->query('SELECT * FROM appointments WHERE elder_id=? AND cancelled=0 AND scheduled_at>=? AND scheduled_at<? ORDER BY scheduled_at',[$elder,$start,$end])->fetchAll(),
            'dose_history'=>$this->query('SELECT d.*,t.time,m.name,m.dosage FROM dose_records d JOIN medication_times t ON t.id=d.time_id JOIN medications m ON m.id=t.medication_id WHERE m.elder_id=? ORDER BY d.dose_date DESC,t.time DESC LIMIT 200',[$elder])->fetchAll()
        ];
    }
}
