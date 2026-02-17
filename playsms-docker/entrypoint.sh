#!/bin/bash
set -e

PLAYSMS_SRC="/usr/local/src/playsms"
INSTALL_DONE_FLAG="/home/playsms/.installed"

# Wait for MariaDB to be ready
echo "Waiting for MariaDB at ${PLAYSMS_DB_HOST}:${PLAYSMS_DB_PORT}..."
until mysql -h"${PLAYSMS_DB_HOST}" -P"${PLAYSMS_DB_PORT}" \
            -u"${PLAYSMS_DB_USER}" -p"${PLAYSMS_DB_PASS}" \
            "${PLAYSMS_DB_NAME}" -e "SELECT 1" > /dev/null 2>&1; do
    echo "  MariaDB not ready yet, retrying in 3s..."
    sleep 3
done
echo "MariaDB is ready."

# Run PlaySMS installation only once
if [ ! -f "${INSTALL_DONE_FLAG}" ]; then
    echo "Running PlaySMS installation..."

    cd "${PLAYSMS_SRC}"

    # Create install.conf from template
    cp install.conf.dist install.conf

    # Inject environment values into install.conf
    sed -i "s|^DBHOST=.*|DBHOST=${PLAYSMS_DB_HOST}|"                   install.conf
    sed -i "s|^DBPORT=.*|DBPORT=${PLAYSMS_DB_PORT}|"                   install.conf
    sed -i "s|^DBNAME=.*|DBNAME=${PLAYSMS_DB_NAME}|"                   install.conf
    sed -i "s|^DBUSER=.*|DBUSER=${PLAYSMS_DB_USER}|"                   install.conf
    sed -i "s|^DBPASS=.*|DBPASS=${PLAYSMS_DB_PASS}|"                   install.conf
    sed -i "s|^ADMINPASSWORD=.*|ADMINPASSWORD=${WEB_ADMIN_PASSWORD:-changemeplease}|" install.conf
    sed -i "s|^PATHWEB=.*|PATHWEB=/home/playsms/web|"                  install.conf
    sed -i "s|^PATHLIB=.*|PATHLIB=/home/playsms/lib|"                  install.conf
    sed -i "s|^PATHBIN=.*|PATHBIN=/home/playsms/bin|"                  install.conf
    sed -i "s|^PATHLOG=.*|PATHLOG=/home/playsms/log|"                  install.conf
    sed -i "s|^PATHSTR=.*|PATHSTR=/home/playsms/etc|"                  install.conf
    sed -i "s|^WEBSERVERUSER=.*|WEBSERVERUSER=www-data|"               install.conf
    sed -i "s|^WEBSERVERGROUP=.*|WEBSERVERGROUP=www-data|"             install.conf

    # Enable bypass mode so the script runs non-interactively
    sed -i 's/^bypass=.*/bypass=true/' install-playsms.sh

    bash install-playsms.sh

    touch "${INSTALL_DONE_FLAG}"
    echo "PlaySMS installation complete."
else
    echo "PlaySMS already installed, skipping."
fi

# Start Apache in foreground
echo "Starting Apache..."
source /etc/apache2/envvars
exec /usr/sbin/apache2 -D FOREGROUND