#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
tools=/workspace/cuidali-tools
export LD_LIBRARY_PATH="$tools/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
if ! "$tools/root/usr/bin/mariadb-admin" --no-defaults --socket="$tools/mysql.sock" -uroot ping --silent >/dev/null 2>&1; then
 nohup "$tools/root/usr/sbin/mariadbd" --no-defaults --basedir="$tools/root/usr" --datadir="$tools/data" --socket="$tools/mysql.sock" --pid-file="$tools/mysql.pid" --port=3307 --bind-address=127.0.0.1 --log-error="$tools/mysql.log" > "$tools/mysql-console.log" 2>&1 &
fi
for attempt in {1..30}; do
 if "$tools/root/usr/bin/mariadb-admin" --no-defaults --socket="$tools/mysql.sock" -uroot ping --silent >/dev/null 2>&1; then break; fi
 sleep 1
done
case "${1:-api}" in
 api)
  cd "$repo/backend"
  export DB_PORT=3307 DB_USER=cuidali
  export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:8081,http://localhost:8082}"
  exec "$tools/bin/php" -S 0.0.0.0:8000 -t public public/index.php
  ;;
 test-api)
  cd "$repo/backend"
  export DB_PORT=3307 DB_USER=cuidali DB_NAME=cuidali_test
  exec "$tools/bin/php" -S 127.0.0.1:8001 -t public public/index.php
  ;;
 mobile)
  cd "$repo/mobile"
  export XDG_CACHE_HOME="$tools/cache"
  export EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 __UNSAFE_EXPO_HOME_DIRECTORY="$tools/expo" npm_config_cache=/workspace/.npm
  # Pode ser substituído pela URL de rede necessária ao dispositivo.
  export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://127.0.0.1:8000}"
  exec npm start -- --localhost --port 8082
  ;;
 *) echo 'Use api, test-api ou mobile.' >&2; exit 1 ;;
esac
