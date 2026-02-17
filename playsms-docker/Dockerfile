FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apache2 php php-mysql php-curl php-gd php-mbstring \
    php-xml php-zip libapache2-mod-php git curl unzip \
    default-mysql-client && \
    rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/playsms/playsms.git /var/www/html/playsms

WORKDIR /var/www/html/playsms

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
