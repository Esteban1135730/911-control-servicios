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
sudo git clone https://github.com/ESTEBAN_USER/REPO_NAME.git 911-servicios
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

## URLs
- App: `http://TU_IP_VPS`
- API health: `http://TU_IP_VPS/health`

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
