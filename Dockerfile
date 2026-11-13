FROM php:8.4-apache
RUN docker-php-ext-install pdo_mysql && a2enmod rewrite headers
COPY backend/ /var/www/cuidali/
COPY deploy/apache.conf /etc/apache2/sites-available/000-default.conf
RUN chown -R www-data:www-data /var/www/cuidali
COPY deploy/start.sh /var/www/cuidali/start.sh
EXPOSE 80
CMD ["sh", "/var/www/cuidali/start.sh"]

