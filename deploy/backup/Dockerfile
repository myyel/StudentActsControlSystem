# Nightly encrypted database backups (deploy/backup/backup.sh), scheduled with busybox crond.
FROM postgres:17-alpine
RUN apk add --no-cache gnupg rclone tzdata
COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh
ENV TZ=Europe/Istanbul
ENTRYPOINT ["entrypoint.sh"]
