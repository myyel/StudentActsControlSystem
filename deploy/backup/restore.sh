#!/bin/sh
# Restores one backup into PGDATABASE, replacing its contents. Stop the app first (docs/DEPLOY.md).
#   restore.sh /backups/<dosya>.dump.gpg --evet
set -eu
set -o pipefail
file="${1:-}"
if [ -z "$file" ] || [ ! -f "$file" ] || [ "${2:-}" != "--evet" ]; then
  echo "Kullanım: restore.sh /backups/<dosya>.dump.gpg --evet"
  echo "Veritabanındaki mevcut veriler yedektekiyle DEĞİŞTİRİLİR."
  exit 1
fi
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE must be set}"

gpg --batch --quiet --pinentry-mode loopback --decrypt --passphrase-fd 3 "$file" 3<<PASS \
  | pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname "$PGDATABASE"
$BACKUP_PASSPHRASE
PASS
echo "$(date -Iseconds) geri yüklendi: $file"
