FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install all dependencies
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
    default-mysql-client \
    cron \
    net-tools \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create playsms user and directories
RUN useradd -m -s /bin/bash playsms && \
    mkdir -p /home/playsms/web \
    /home/playsms/lib \
    /home/playsms/bin \
    /home/playsms/log \
    /home/playsms/etc && \
    chown -R playsms:playsms /home/playsms

# Clone PlaySMS 1.4.x source at BUILD time (no network dependency at runtime)
RUN git clone -b 1.4.x https://github.com/playsms/playsms.git /usr/local/src/playsms

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Configure Apache VirtualHost
RUN printf '<VirtualHost *:80>\n\
    ServerName localhost\n\
    DocumentRoot /home/playsms/web\n\
    <Directory /home/playsms/web>\n\
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