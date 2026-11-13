<?php
declare(strict_types=1);
require __DIR__.'/src/bootstrap.php';
if(PHP_SAPI!=='cli') exit(1);
try {
 $db=database();
 $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
 foreach(glob(__DIR__.'/sql/*.sql') as $file) {
  $version=basename($file); $q=$db->prepare('SELECT version FROM schema_migrations WHERE version=?');$q->execute([$version]);
  if($q->fetchColumn())continue;
  $db->exec(file_get_contents($file));
  $q=$db->prepare('INSERT INTO schema_migrations(version) VALUES(?)');$q->execute([$version]);
  echo "Aplicada: $version\n";
 }
 echo "Banco atualizado.\n";
} catch(Throwable $e) {fwrite(STDERR,"Não foi possível migrar. Verifique configuração e permissões do banco.\n");exit(1);}
