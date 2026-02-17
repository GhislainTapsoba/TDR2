#!/bin/bash
# Configure Apache
cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:80>
    DocumentRoot /var/www/html/playsms/web
    <Directory /var/www/html/playsms/web>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

a2enmod rewrite
service apache2 start

# Wait for MariaDB
until mysql -h"$PLAYSMS_DB_HOST" -P"$PLAYSMS_DB_PORT" -u"$PLAYSMS_DB_USER" -p"$PLAYSMS_DB_PASS" "$PLAYSMS_DB_NAME" -e "SELECT 1" &>/dev/null; do
    echo "Waiting for database..."
    sleep 3
done

# Install PlaySMS if not already installed
if [ ! -f /var/www/html/playsms/web/config/config.php ]; then
    cd /var/www/html/playsms
    cp config/config-dist.php web/config/config.php
    sed -i "s/'DB_HOST'.*/'DB_HOST', '$PLAYSMS_DB_HOST');/" web/config/config.php
    sed -i "s/'DB_USER'.*/'DB_USER', '$PLAYSMS_DB_USER');/" web/config/config.php
    sed -i "s/'DB_PASS'.*/'DB_PASS', '$PLAYSMS_DB_PASS');/" web/config/config.php
    sed -i "s/'DB_NAME'.*/'DB_NAME', '$PLAYSMS_DB_NAME');/" web/config/config.php
    mysql -h"$PLAYSMS_DB_HOST" -P"$PLAYSMS_DB_PORT" -u"$PLAYSMS_DB_USER" -p"$PLAYSMS_DB_PASS" "$PLAYSMS_DB_NAME" < db/playsms.sql
fi

tail -f /var/log/apache2/error.log
