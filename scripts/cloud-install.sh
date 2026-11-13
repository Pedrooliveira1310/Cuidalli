#!/usr/bin/env bash
# Preparação local, sem root, para a imagem Debian do ambiente Codex.
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
tools=/workspace/cuidali-tools
mkdir -p "$tools/apt/lists/partial" "$tools/apt/archives/partial" "$tools/root" "$tools/bin"
if [[ ! -x "$tools/root/usr/bin/php8.4" || ! -x "$tools/root/usr/sbin/mariadbd" ]]; then
  [[ -f /etc/debian_version ]] || { echo 'Este helper exige Debian 13. Use o README em outros ambientes.' >&2; exit 1; }
  cat > "$tools/apt/apt.conf" <<CONF
Dir::Etc::Parts "-";
Dir::Etc::main "-";
Dir::Etc::sourcelist "$tools/apt/sources.list";
Dir::Etc::sourceparts "-";
Dir::State::lists "$tools/apt/lists";
Dir::Cache::archives "$tools/apt/archives";
APT::Get::List-Cleanup "0";
CONF
  cat > "$tools/apt/sources.list" <<'SOURCES'
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://security.debian.org/debian-security trixie-security main
SOURCES
  APT_CONFIG="$tools/apt/apt.conf" /usr/bin/apt-get update
  APT_CONFIG="$tools/apt/apt.conf" /usr/bin/apt-get --download-only -y -o Debug::NoLocking=1 install php8.4-cli php8.4-mysql mariadb-server mariadb-client
  for package in "$tools/apt/archives/"*.deb; do dpkg-deb -x "$package" "$tools/root"; done
fi
cat > "$tools/bin/php" <<'PHP'
#!/bin/sh
export LD_LIBRARY_PATH=/workspace/cuidali-tools/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
exec /workspace/cuidali-tools/root/usr/bin/php8.4 -n -d extension_dir=/workspace/cuidali-tools/root/usr/lib/php/20240924 -d extension=pdo -d extension=mysqlnd -d extension=pdo_mysql -d extension=ctype -d extension=iconv -d date.timezone=America/Sao_Paulo "$@"
PHP
chmod +x "$tools/bin/php"
export LD_LIBRARY_PATH="$tools/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
if [[ ! -d "$tools/data/mysql" ]]; then
  "$tools/root/usr/bin/mariadb-install-db" --no-defaults --basedir="$tools/root/usr" --datadir="$tools/data" --auth-root-authentication-method=normal --skip-test-db
fi
# Iniciar só o banco agora para preparar schema; processos precisam reiniciar em novas tarefas.
if ! "$tools/root/usr/bin/mariadb-admin" --no-defaults --socket="$tools/mysql.sock" -uroot ping --silent >/dev/null 2>&1; then
  nohup "$tools/root/usr/sbin/mariadbd" --no-defaults --basedir="$tools/root/usr" --datadir="$tools/data" --socket="$tools/mysql.sock" --pid-file="$tools/mysql.pid" --port=3307 --bind-address=127.0.0.1 --log-error="$tools/mysql.log" > "$tools/mysql-console.log" 2>&1 &
fi
for attempt in {1..30}; do
  if "$tools/root/usr/bin/mariadb-admin" --no-defaults --socket="$tools/mysql.sock" -uroot ping --silent >/dev/null 2>&1; then break; fi
  sleep 1
done
"$tools/root/usr/bin/mariadb" --no-defaults --socket="$tools/mysql.sock" -uroot <<'SQL'
CREATE DATABASE IF NOT EXISTS cuidali CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS cuidali_test CHARACTER SET utf8mb4;
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
CREATE USER IF NOT EXISTS 'cuidali'@'127.0.0.1';
GRANT ALL ON cuidali.* TO 'cuidali'@'127.0.0.1';
GRANT ALL ON cuidali_test.* TO 'cuidali'@'127.0.0.1';
SQL
DB_PORT=3307 DB_USER=cuidali "$tools/bin/php" "$repo/backend/migrate.php"
DB_PORT=3307 DB_USER=cuidali DB_NAME=cuidali_test "$tools/bin/php" "$repo/backend/migrate.php"
cd "$repo/mobile"
npm_config_cache=/workspace/.npm npm ci
npm run typecheck
printf '%s\n' 'Dependências preparadas. Use scripts/cloud-start.sh para iniciar API e Expo.'
