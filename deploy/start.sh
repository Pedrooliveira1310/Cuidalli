#!/bin/sh
set -eu
ls -l /etc/apache2/mods-enabled/*mpm*
grep -R -n 'LoadModule.*mpm\|Include.*mods' /etc/apache2
php /var/www/cuidali/migrate.php
exec apache2-foreground
