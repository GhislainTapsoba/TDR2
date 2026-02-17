#!/bin/bash
set -e

PLAYSMS_SRC="/usr/local/src/playsms"
PLAYSMS_WEB="/home/playsms/web"
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

    # Patch install.conf with environment values
    sed -i "s|^DBHOST=.*|DBHOST=${PLAYSMS_DB_HOST}|"     install.conf
    sed -i "s|^DBPORT=.*|DBPORT=${PLAYSMS_DB_PORT}|"     install.conf
    sed -i "s|^DBNAME=.*|DBNAME=${PLAYSMS_DB_NAME}|"     install.conf
    sed -i "s|^DBUSER=.*|DBUSER=${PLAYSMS_DB_USER}|"     install.conf
    sed -i "s|^DBPASS=.*|DBPASS=${PLAYSMS_DB_PASS}|"     install.conf
    sed -i "s|^ADMINPASSWORD=.*|ADMINPASSWORD=${WEB_ADMIN_PASSWORD:-changemeplease}|" install.conf

    # Set paths to match our directory layout
    sed -i "s|^PATHLIB=.*|PATHLIB=/home/playsms/lib|"    install.conf
    sed -i "s|^PATHWEB=.*|PATHWEB=/home/playsms/web|"    install.conf
    sed -i "s|^PATHBIN=.*|PATHBIN=/home/playsms/bin|"    install.conf
    sed -i "s|^PATHLOG=.*|PATHLOG=/home/playsms/log|"    install.conf
    sed -i "s|^PATHSTR=.*|PATHSTR=/home/playsms/etc|"    install.conf

    # Run official install script
    bash install.sh

    # Fix permissions for Apache
    chown -R www-data:www-data /home/playsms/web /home/playsms/log /home/playsms/lib
    chmod -R 775 /home/playsms

    touch "${INSTALL_DONE_FLAG}"
    echo "PlaySMS installation complete."
else
    echo "PlaySMS already installed, skipping installation."
fi

# Start Apache in foreground
echo "Starting Apache..."
apache2ctl -D FOREGROUND