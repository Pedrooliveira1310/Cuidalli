#!/bin/sh
set -eu
php /var/www/cuidali/migrate.php
exec apache2-foreground
