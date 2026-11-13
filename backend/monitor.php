<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require __DIR__.'/src/bootstrap.php';
do {
 try { (new Api(database()))->runMonitoring(); }
 catch(Throwable $e) { error_log('Cuidali: não foi possível executar o monitor de atividade.'); if(!in_array('--continuous',$argv,true))exit(1); }
 if(!in_array('--continuous',$argv,true))break;
 sleep(10);
}while(true);
