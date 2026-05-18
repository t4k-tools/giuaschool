FROM php:8.2-apache

# Enable Apache mod_rewrite and silence the startup FQDN warning.
RUN a2enmod rewrite \
    && echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf \
    && a2enconf servername

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libxml2-dev \
    libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    intl \
    zip \
    gd \
    opcache \
    mbstring \
    xml \
    ctype \
    iconv

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP configuration
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

# Apache configuration - install an explicit vhost and align DocumentRoot to public/
COPY src/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Allow .htaccess overrides
RUN sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Set working directory
WORKDIR /var/www/html

# Copy application
COPY src/ /var/www/html/
COPY docker/app-entrypoint.sh /usr/local/bin/app-entrypoint

# Set permissions
RUN chmod +x /usr/local/bin/app-entrypoint \
    && chown -R www-data:www-data /var/www/html/var /var/www/html/public

EXPOSE 80

ENTRYPOINT ["app-entrypoint"]
CMD ["apache2-foreground"]
