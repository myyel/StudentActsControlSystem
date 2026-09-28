#!/bin/sh
# One encrypted backup: pg_dump (custom format) → gpg AES-256 → /backups, optional remote copy,
# then deletes backups older than BACKUP_RETENTION_DAYS (default 14) here and on the remote.
set -eu
set -o pipefail
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE must be set}"
: "${PGDATABASE:?PGDATABASE must be set}"
days="${BACKUP_RETENTION_DAYS:-14}"
dir=/backups
file="$dir/${PGDATABASE}_$(date +%Y-%m-%d_%H%M%S).dump.gpg"

umask 077
# The passphrase goes through a file descriptor, never the command line (visible in ps).
pg_dump --format=custom --no-owner --no-privileges \
  | gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 \
        --passphrase-fd 3 --output "$file.partial" 3<<PASS
$BACKUP_PASSPHRASE
PASS
mv "$file.partial" "$file"
echo "$(date -Iseconds) yedek alındı: $file ($(du -h "$file" | cut -f1))"

find "$dir" -name '*.dump.gpg' -type f -mtime +"$days" -print -delete
find "$dir" -name '*.partial' -type f -mmin +120 -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$file" "$RCLONE_REMOTE"
  rclone delete "$RCLONE_REMOTE" --min-age "${days}d" --include '*.dump.gpg'
  echo "$(date -Iseconds) uzak kopya: $RCLONE_REMOTE"
fi
