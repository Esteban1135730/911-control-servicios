#!/bin/sh
set -e

# Certificado autofirmado para habilitar cámara en vivo sin dominio
mkdir -p /etc/nginx/certs
if [ ! -f /etc/nginx/certs/selfsigned.crt ]; then
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/selfsigned.key \
    -out /etc/nginx/certs/selfsigned.crt \
    -subj "/CN=911-servicios/O=911 Transportes/C=CO"
fi

exec nginx -g 'daemon off;'
