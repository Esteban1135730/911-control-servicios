# 911 Control de Servicios

Plataforma de control de jornadas para **911 Transportes Especiales S.A.S.**

**Repo:** https://github.com/Esteban1135730/911-control-servicios

- **Frontend** (PWA conductor + panel admin): React + Vite  
- **Backend** (API): Express + Prisma + PostgreSQL  
- **Despliegue unificado**: Docker Compose  

Guía completa de VPS: ver [`DEPLOY.md`](./DEPLOY.md) 

## Credenciales demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Admin | `admin` | `Admin123!` |
| Conductor | `conductor1` | `Conductor123!` |

## Levantar todo con Docker (recomendado)

```bash
docker compose up --build -d
```

- Web: http://localhost  
- API: http://localhost:4000/health  

## Desarrollo local

### 1. Base de datos

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/servicios911?schema=public
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

## Funcionalidades

### Conductor (móvil / PWA)
- Login
- Iniciar servicio: GPS + foto cámara en vivo (marca de agua)
- Cerrar servicio: GPS + foto + notas/novedades
- Solo 1 servicio abierto a la vez
- Cola offline (IndexedDB) si no hay red

### Administrador
- Dashboard con KPIs y gráficas
- Listado de servicios con filtros
- Detalle: mapa inicio/fin, fotos, revisión y observaciones
- Conductores CRUD básico
- Export Excel (general + resumen por conductor)
- Auditoría de cambios
- Botón WhatsApp para avisar servicio abierto
- Alertas si un servicio supera 10 horas abierto

## Hosting sugerido

- Demo: VPS Hostinger con Docker  
- Producción estable: Hetzner / DigitalOcean (VPS 2 vCPU / 4 GB)
