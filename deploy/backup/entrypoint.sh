#!/bin/sh
# Schedules backup.sh (default 02:30 every night, Europe/Istanbul) and keeps crond in the foreground.
set -eu
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE must be set}"
# One-off commands (docker compose run --rm backup backup.sh | restore.sh ...) skip the scheduler.
if [ "$#" -gt 0 ]; then exec "$@"; fi
# crond starts jobs with an empty environment: hand the settings over in a file.
# export -p quotes every value safely (passphrases may contain quotes).
export -p | grep -E '^export (PG|BACKUP_|RCLONE_|TZ)' > /etc/backup.env
chmod 600 /etc/backup.env
echo "${BACKUP_SCHEDULE:-30 2 * * *} . /etc/backup.env && /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" | crontab -
echo "Yedekleme zamanlandı: ${BACKUP_SCHEDULE:-30 2 * * *} (${TZ:-UTC})"
exec crond -f -l 8
