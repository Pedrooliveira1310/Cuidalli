#!/bin/sh
set -eu
a2dismod -f mpm_event mpm_worker
a2enmod mpm_prefork
php /var/www/cuidali/migrate.php
exec apache2-foreground
