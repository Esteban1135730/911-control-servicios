# 911 Control de Servicios — despliegue VPS

## Requisitos del VPS
- Ubuntu 22.04+ (o similar)
- Docker + Docker Compose plugin
- Puertos 80 (y opcional 443) abiertos

## Credenciales demo (cámbialas en producción)
| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `Admin123!` |
| Conductor | `conductor1` | `Conductor123!` |

## Comandos de instalación en el VPS

```bash
# 1) Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2) Instalar Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# Cierra sesión y vuelve a entrar, o:
newgrp docker

# 3) Clonar el repositorio
cd /opt
sudo git clone https://github.com/Esteban1135730/911-control-servicios.git 911-servicios
sudo chown -R $USER:$USER /opt/911-servicios
cd /opt/911-servicios

# 4) (Opcional) Cambiar secretos antes de subir
# Edita docker-compose.yml -> JWT_SECRET y POSTGRES_PASSWORD

# 5) Construir y levantar
docker compose up --build -d

# 6) Ver estado
docker compose ps
docker compose logs -f --tail=100
```

## Dominio de producción / demo
- **https://911.inredesoft.com** (dominio base: [inredesoft.com](https://inredesoft.com/))

### DNS (panel donde está inredesoft.com)
| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `911` | `76.13.101.203` | 300 |

### Proxy + SSL en el VPS (nginx del host → Docker :3080)

```bash
cd /opt/911-servicios
git pull
docker compose up --build -d

# Copiar sitio nginx
sudo cp deploy/nginx-911.inredesoft.com.conf /etc/nginx/sites-available/911-servicios
sudo ln -sf /etc/nginx/sites-available/911-servicios /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Certificado Let's Encrypt (HTTPS real)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 911.inredesoft.com
```

Luego abre: **https://911.inredesoft.com**

## URLs locales / IP (sin dominio)
- App HTTP: `http://TU_IP_VPS:3080` (cámara nativa)
- App HTTPS autofirmado: `https://TU_IP_VPS:3443`
- Health: `http://TU_IP_VPS:3080/health`

> Abre **3080** y **3443** en firewall si usas IP directa.
> Con dominio, abre **80** y **443** (nginx del host).

## Actualizar después de un cambio en GitHub
```bash
cd /opt/911-servicios
git pull
docker compose up --build -d
```

## Reiniciar / detener
```bash
docker compose restart
docker compose down
```
