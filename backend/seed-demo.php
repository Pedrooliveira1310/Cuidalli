<?php
declare(strict_types=1);
require __DIR__.'/src/bootstrap.php';

if (PHP_SAPI !== 'cli') exit(1);
$password=demoPassword();
if (!demoDatabaseConfigured() || $password === null) {
    fwrite(STDERR, "Use um banco local com sufixo _demo_test e defina CUIDALI_DEMO_PASSWORD.\n");
    exit(1);
}

try {
    $db=database();
    $api=new Api($db);
    $request=static fn(string $method,string $path,array $data=[],string $token=''): array =>
        $api->dispatch($method,$path,$data,$token === '' ? '' : 'Bearer '.$token,'demo-seed');
    $date=date('Y-m-d');
    $accounts=[];
    $findProfile=$db->prepare('SELECT id FROM users WHERE email=? AND phone=? AND role=?');

    foreach (DEMO_PROFILES as $email=>$profile) {
        $findProfile->execute([$email,$profile['phone'],$profile['role']]);
        if (!$findProfile->fetchColumn()) {
            $data=$profile+['email'=>$email,'password'=>$password,'birth_date'=>'1960-05-01'];
            if ($profile['role'] === 'elder') {
                $data['emergency_contact']=['name'=>'Ana Silva','phone'=>'0000000002','relationship'=>'Filha'];
            }
            $request('POST','/auth/register',$data);
        }
        $accounts[$profile['role']]=$request('POST','/auth/login',['phone'=>$profile['phone'],'password'=>$password]);
    }

    $elder=$accounts['elder'];
    $caregiver=$accounts['caregiver'];
    $elderId=(int)$elder['user']['id'];
    $path="/elders/$elderId";
    try {
        $links=$request('GET','/links',[],$caregiver['token'])['items'];
        if (!in_array($elderId,array_map('intval',array_column($links,'id')),true)) {
            $code=$request('POST','/link-codes',[],$elder['token'])['code'];
            $request('POST','/links/redeem',['code'=>$code],$caregiver['token']);
        }
        $medications=$request('GET',$path.'/medications',[],$elder['token'])['items'];
        $activeNames=array_column(array_filter($medications,fn(array $item): bool => (bool)$item['active']),'name');
        foreach ([['Losartana','50 mg','08:00'],['Metformina','500 mg','20:00']] as [$name,$dosage,$time]) {
            if (!in_array($name,$activeNames,true)) {
                $request('POST',$path.'/medications',['name'=>$name,'dosage'=>$dosage,'times'=>[$time],
                    'start_date'=>$date,'end_date'=>date('Y-m-d',strtotime('+1 year'))],$elder['token']);
            }
        }
        $dashboard=$request('GET',$path.'/dashboard',[],$elder['token']);
        foreach ($dashboard['doses'] as $dose) {
            if ($dose['name'] === 'Losartana' && $dose['time'] === '08:00' && $dose['status'] !== 'taken') {
                $request('POST',$path.'/doses/'.$dose['time_id'],['date'=>$date,'status'=>'taken'],$elder['token']);
            }
        }
        if (!in_array('Dra. Helena Costa',array_column($dashboard['appointments'],'doctor'),true)) {
            $request('POST',$path.'/appointments',['doctor'=>'Dra. Helena Costa','specialty'=>'Clínica geral',
                'scheduled_at'=>$date.'T14:30','location'=>'Clínica de demonstração'],$elder['token']);
        }
        $alerts=$request('GET',$path.'/alerts',[],$elder['token'])['items'];
        $openRequests=array_filter($alerts,fn(array $alert): bool => $alert['kind'] === 'sos' && $alert['status'] !== 'resolved');
        if (!$openRequests) $request('POST',$path.'/sos',[],$elder['token']);
    } finally {
        foreach ($accounts as $account) $request('POST','/auth/logout',[],$account['token']);
    }
    echo "Perfis de demonstração preparados.\n";
} catch (ApiError $error) {
    fwrite(STDERR,"Não foi possível preparar a demonstração. ".$error->getMessage()."\n");
    exit(1);
} catch (Throwable) {
    fwrite(STDERR,"Não foi possível preparar a demonstração. Confira o banco e as migrações.\n");
    exit(1);
}
