FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apache2 \
    php \
    php-mysql \
    php-curl \
    php-gd \
    php-mbstring \
    php-xml \
    php-zip \
    php-cli \
    libapache2-mod-php \
    git \
    curl \
    unzip \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Clone PlaySMS source at BUILD time (not runtime)
RUN git clone -b 1.4.x https://github.com/playsms/playsms.git /usr/local/src/playsms

# Pre-install Composer dependencies at build time too
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && \
    cd /usr/local/src/playsms && composer update --no-interaction

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Configure Apache VirtualHost
RUN printf '<VirtualHost *:80>\n\
    ServerName localhost\n\
    DocumentRoot /var/www/playsms\n\
    <Directory /var/www/playsms>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/playsms_error.log\n\
    CustomLog ${APACHE_LOG_DIR}/playsms_access.log combined\n\
    </VirtualHost>\n' > /etc/apache2/sites-available/000-default.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]