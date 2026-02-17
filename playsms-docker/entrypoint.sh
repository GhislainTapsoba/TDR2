#!/bin/bash
set -e

SRC="/usr/local/src/playsms"
PATHWEB="/var/www/html/playsms"
PATHLOG="/var/log/playsms"
PATHLIB="/var/lib/playsms"
INSTALL_DONE_FLAG="/var/lib/playsms/.installed"

# ── Wait for MariaDB ──────────────────────────────────────────────────────────
echo "Waiting for MariaDB at ${PLAYSMS_DB_HOST}:${PLAYSMS_DB_PORT}..."
until mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
            -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
            "${PLAYSMS_DB_NAME}" -e "SELECT 1" > /dev/null 2>&1; do
    echo "  Not ready, retrying in 3s..."
    sleep 3
done
echo "MariaDB is ready."

# ── Install (only once) ───────────────────────────────────────────────────────
if [ ! -f "${INSTALL_DONE_FLAG}" ]; then
    echo "Installing PlaySMS..."

    # Create directories
    mkdir -p "${PATHWEB}" "${PATHLOG}" "${PATHLIB}"
    chown -R www-data "${PATHWEB}" "${PATHLOG}" "${PATHLIB}"

    # Copy web files
    cp -R "${SRC}/web/." "${PATHWEB}/"
    chown -R www-data "${PATHWEB}"

    # Import database schema
    echo "Importing database schema..."
    mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
          -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
          "${PLAYSMS_DB_NAME}" < "${SRC}/db/playsms.sql"

    # Configure config.php — vrais tokens du config-dist.php
    cp "${PATHWEB}/config-dist.php" "${PATHWEB}/config.php"
    sed -i "s|#MYSQL_HOST#|${PLAYSMS_DB_HOST}|g"      "${PATHWEB}/config.php"
    sed -i "s|#MYSQL_TCP_PORT#|${PLAYSMS_DB_PORT}|g"  "${PATHWEB}/config.php"
    sed -i "s|#MYSQL_USER#|${PLAYSMS_DB_USER}|g"      "${PATHWEB}/config.php"
    sed -i "s|#MYSQL_PWD#|${PLAYSMS_DB_PASS}|g"       "${PATHWEB}/config.php"
    sed -i "s|#MYSQL_DBNAME#|${PLAYSMS_DB_NAME}|g"    "${PATHWEB}/config.php"
    sed -i "s|#PATHLOG#|${PATHLOG}|g"                 "${PATHWEB}/config.php"

    # Setup daemon
    cp "${SRC}/daemon/linux/etc/playsmsd.conf" /etc/playsmsd.conf
    cp "${SRC}/daemon/linux/bin/playsmsd.php"  /usr/local/bin/playsmsd
    chmod +x /usr/local/bin/playsmsd

    sed -i "s|PLAYSMS_PATH=.*|PLAYSMS_PATH=\"${PATHWEB}\"|"    /etc/playsmsd.conf
    sed -i "s|PLAYSMS_BIN=.*|PLAYSMS_BIN=\"/usr/local/bin\"|"  /etc/playsmsd.conf
    sed -i "s|PLAYSMS_LOG=.*|PLAYSMS_LOG=\"${PATHLOG}\"|"      /etc/playsmsd.conf
    sed -i "s|PLAYSMS_LIB=.*|PLAYSMS_LIB=\"${PATHLIB}\"|"      /etc/playsmsd.conf

    # Set admin password in DB
    ADMIN_PASS="${WEB_ADMIN_PASSWORD:-changemeplease}"
    ADMIN_PASS_MD5=$(echo -n "${ADMIN_PASS}" | md5sum | awk '{print $1}')
    mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
          -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
          "${PLAYSMS_DB_NAME}" \
          -e "UPDATE playsms_user SET u_pass='${ADMIN_PASS_MD5}' WHERE u_username='admin';" \
          2>/dev/null || true

    # Final permissions
    mkdir -p "${PATHWEB}/storage"
    chown -R www-data:www-data "${PATHWEB}" "${PATHLOG}" "${PATHLIB}"
    chmod -R 755 "${PATHWEB}"

    touch "${INSTALL_DONE_FLAG}"
    echo "PlaySMS installation complete."
else
    echo "PlaySMS already installed, skipping."
fi

# ── Start playsmsd daemon ─────────────────────────────────────────────────────
echo "Starting playsmsd..."
php /usr/local/bin/playsmsd /etc/playsmsd.conf start > /dev/null 2>&1 || true

# ── Start Apache in foreground ────────────────────────────────────────────────
echo "Starting Apache..."
source /etc/apache2/envvars
exec /usr/sbin/apache2 -D FOREGROUND