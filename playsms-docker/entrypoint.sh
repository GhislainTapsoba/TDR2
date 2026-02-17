#!/bin/bash
set -e

SRC="/usr/local/src/playsms"
PATHWEB="/var/www/playsms"
PATHLIB="/var/lib/playsms"
PATHBIN="/usr/local/bin"
PATHLOG="/var/log/playsms"
PATHCONF="/etc/playsms"
INSTALL_DONE_FLAG="/etc/playsms/.installed"

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
    mkdir -p "${PATHWEB}" "${PATHLIB}" "${PATHLOG}" "${PATHCONF}"

    # Copy web files
    cp -R "${SRC}/web/." "${PATHWEB}/"

    # Copy lib files
    cp -R "${SRC}/storage/." "${PATHLIB}/"

    # Import database schema
    echo "Importing database schema..."
    mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
          -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
          "${PLAYSMS_DB_NAME}" < "${SRC}/db/playsms.sql"

    # Configure config.php from template (tokens are #DBHOST# etc.)
    cp "${PATHWEB}/config-dist.php" "${PATHWEB}/config.php"
    sed -i "s|#DBHOST#|${PLAYSMS_DB_HOST}|g"  "${PATHWEB}/config.php"
    sed -i "s|#DBPORT#|${PLAYSMS_DB_PORT}|g"  "${PATHWEB}/config.php"
    sed -i "s|#DBNAME#|${PLAYSMS_DB_NAME}|g"  "${PATHWEB}/config.php"
    sed -i "s|#DBUSER#|${PLAYSMS_DB_USER}|g"  "${PATHWEB}/config.php"
    sed -i "s|#DBPASS#|${PLAYSMS_DB_PASS}|g"  "${PATHWEB}/config.php"
    sed -i "s|#PATHLOG#|${PATHLOG}|g"         "${PATHWEB}/config.php"

    # Configure playsmsd daemon
    cp "${SRC}/daemon/linux/etc/playsmsd.conf" "${PATHCONF}/playsmsd.conf"
    sed -i "s|PLAYSMS_PATH=.*|PLAYSMS_PATH=\"${PATHWEB}\"|"   "${PATHCONF}/playsmsd.conf"
    sed -i "s|PLAYSMS_LIB=.*|PLAYSMS_LIB=\"${PATHLIB}\"|"    "${PATHCONF}/playsmsd.conf"
    sed -i "s|PLAYSMS_BIN=.*|PLAYSMS_BIN=\"${PATHBIN}\"|"    "${PATHCONF}/playsmsd.conf"
    sed -i "s|PLAYSMS_LOG=.*|PLAYSMS_LOG=\"${PATHLOG}\"|"    "${PATHCONF}/playsmsd.conf"

    # Install playsmsd daemon binary
    cp "${SRC}/daemon/linux/bin/playsmsd.php" "${PATHBIN}/playsmsd"
    chmod +x "${PATHBIN}/playsmsd"

    # Set admin password in DB
    ADMIN_PASS="${WEB_ADMIN_PASSWORD:-changemeplease}"
    ADMIN_PASS_MD5=$(echo -n "${ADMIN_PASS}" | md5sum | awk '{print $1}')
    mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
          -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
          "${PLAYSMS_DB_NAME}" \
          -e "UPDATE playsms_user SET u_pass='${ADMIN_PASS_MD5}' WHERE u_username='admin';" \
          2>/dev/null || true

    # Fix permissions
    chown -R www-data:www-data "${PATHWEB}" "${PATHLIB}" "${PATHLOG}"
    chmod -R 755 "${PATHWEB}"

    touch "${INSTALL_DONE_FLAG}"
    echo "PlaySMS installation complete."
else
    echo "PlaySMS already installed, skipping."
fi

# ── Start playsmsd daemon ─────────────────────────────────────────────────────
echo "Starting playsmsd..."
sudo -u www-data "${PATHBIN}/playsmsd" "${PATHCONF}/playsmsd.conf" start 2>/dev/null || true

# ── Start Apache in foreground ────────────────────────────────────────────────
echo "Starting Apache..."
source /etc/apache2/envvars
exec /usr/sbin/apache2 -D FOREGROUND