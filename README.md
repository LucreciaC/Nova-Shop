# NOVA Shop — UCH-FyD

**Universidad Champagnat — Facultad de Informática y Diseño**  
**Licenciatura en Sistemas de Información — Cátedra: Arquitectura de Sistemas**  
**Grupo N.° 10:** Lucrecia Concatti, Camila Olivera, Rocío Santilli, Juan Narvaez.  
**Profesores:** Titular Marcelo Palma · Adjunto Ezequiel Velasco.

---

## Descripción General

**NOVA Shop** es la implementación del MVP correspondiente a la arquitectura diseñada en los **TP1, TP2 y TP3-1** para la empresa **UCH-FyD**. Consiste en una plataforma de comercio electrónico basada en una **Arquitectura Orientada a Servicios (SOA)** que permite el registro de usuarios, la activación de cuentas por parte de un administrador, la consulta y administración de un catálogo de artículos y la confirmación consistente e idempotente de pedidos ante compras concurrentes.

### Documentación Adicional del Proyecto

- [**Manual de Usuario (`MANUAL_DE_USUARIO.md`)**](./MANUAL_DE_USUARIO.md): Guía paso a paso sobre cómo utilizar la aplicación desde el perfil de **Cliente** y el perfil de **Administrador**.
- [**Manual Técnico (`MANUAL_TECNICO.md`)**](./MANUAL_TECNICO.md): Detalle de la arquitectura SOA, decisiones arquitectónicas (ADRs), patrones implementados, esquema de bases de datos, contratos OpenAPI 3 y guía de pruebas y despliegue.

---

## Stack Tecnológico y Servicios

| Servicio / Contenedor | Tecnología | Puerto Local | Base de Datos / Estado |
| :--- | :--- | :---: | :--- |
| **`frontend`** | Next.js 14 (React 18, App Router) | `3000` | Sin acceso directo a BD (consume únicamente el API Gateway) |
| **`api-gateway`** | Node.js 20 + Express | `8080` | Sin datos de negocio · Caché en memoria de clave pública JWKS y estado de Circuit Breakers |
| **`identity-service`** | Node.js 20 + Express + Mongoose | `3001` | **MongoDB 7** (`novashop_identidad`) en red aislada `identidad_net` |
| **`ventas-service-1`** | NestJS 10 + TypeScript + `pg` | `3002` | **PostgreSQL 16** (`novashop_ventas`) en red aislada `ventas_net` |
| **`ventas-service-2`** | NestJS 10 + TypeScript + `pg` | `3003` | Comparte **PostgreSQL 16** (réplica para escalamiento horizontal `ADR-01`) |
| **`mongodb`** | MongoDB 7 | `27017` | Volumen persistente `mongo_data` (Usuarios, roles y estados) |
| **`postgres`** | PostgreSQL 16 Alpine | `5432` | Volumen persistente `pg_data` (Artículos, pedidos, líneas e `idempotency_key`) |

---

## Inicio Rápido (Docker Compose)

### 1. Requisitos previos
- **Docker Desktop** (con `docker compose`) instalado y en ejecución.
- **Node.js 18+** (opcional en el host, únicamente si se desean correr los scripts de prueba desde fuera de los contenedores).

### 2. Levantar todos los contenedores

Desde la raíz del proyecto, ejecutar en PowerShell o terminal:

```powershell
docker compose up --build -d
```

Verificar que los 7 contenedores estén corriendo:

```powershell
docker compose ps
```

### 3. Inicializar el primer usuario Administrador (RF-04)

Por seguridad, el código no contiene credenciales fijas harcodeadas. Para crear o actualizar el primer usuario con rol `administrador` en estado `activo` en MongoDB, ejecutar:

```powershell
docker exec -e ADMIN_USERNAME=admin -e ADMIN_EMAIL=admin@uch.edu.ar -e ADMIN_PASSWORD=admin123 novashop-identity-service npm run init-admin
```

*(Podés reemplazar `admin123` por la contraseña que prefieras).*

### 4. Accesos a la aplicación

- **Tienda Web (Frontend Next.js)**: [http://localhost:3000](http://localhost:3000)
- **Iniciar Sesión / Registro**: [http://localhost:3000/login](http://localhost:3000/login)
- **Panel de Activación de Usuarios (Rol Admin — RF-04)**: [http://localhost:3000/admin/usuarios](http://localhost:3000/admin/usuarios)
- **Panel de Administración de Catálogo y Stock (Rol Admin — RF-12)**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Documentación Interactiva de Contratos OpenAPI 3 (Swagger UI)**: [http://localhost:8080/api/v1/docs](http://localhost:8080/api/v1/docs)
- **Estado del API Gateway y Circuit Breakers**: [http://localhost:8080/api/v1/gateway/status](http://localhost:8080/api/v1/gateway/status)

---

## Ejecución de Pruebas Automáticas

Con los contenedores levantados y el administrador inicializado, podés ejecutar las tres suites de verificación incluidas en la carpeta [`scripts/`](./scripts):

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="admin123"

# 1. Verifica los 8 escenarios funcionales de RF-04 (registro inactivo, bloqueo 403, activación por admin, login JWT, permisos)
node scripts/test-rf04.js

# 2. Verifica toda la arquitectura SOA (Gateway 401, balanceo Round-Robin, concurrencia de stock 2x4 sobre A-1001 e Idempotency-Key)
node scripts/verificar-arquitectura.js

# 3. Prueba de carga y escalabilidad (+50% de usuarios concurrentes, RNF-02: <= 2s y >= 99% de éxito)
node scripts/test-carga-rnf02.js
```

---

## Estructura del Repositorio

```text
NOVA Shop/
├── docker-compose.yml               # Orquestación de los 7 contenedores y 3 redes aisladas
├── README.md                        # Resumen general y guía de inicio rápido
├── MANUAL_DE_USUARIO.md             # Manual funcional para Clientes y Administradores
├── MANUAL_TECNICO.md                # Manual de arquitectura, patrones SOA, BD y contratos
├── api-gateway/                     # Servicio Node.js de entrada única (:8080)
│   └── src/
│       ├── index.js                 # Enrutamiento, validación JWT RS256, Rate Limit, Trace-ID, Load Balancer
│       ├── circuit-breaker.js       # Implementación del patrón Circuit Breaker (ADR-05)
│       └── openapi.js               # Especificación OpenAPI 3.0.3 (/api/v1/docs)
├── identity-service/                # Servicio independiente de Identidad (:3001)
│   └── src/
│       ├── index.js                 # Endpoints /auth/registro, /auth/login, /auth/jwks y /usuarios
│       ├── keys.js                  # Generación RSA 2048-bit (RS256) y exportación JWK (ADR-08)
│       ├── models/usuario.model.js  # Esquema Mongoose en MongoDB
│       ├── repositories/            # Patrón Repository (UsuarioRepository - ADR-06)
│       └── scripts/init-admin.js    # Script manual para inicializar el primer Administrador
├── ventas-service/                  # Servidor de Ventas en NestJS (:3002 y :3003)
│   └── src/
│       ├── main.ts / app.module.ts  # Bootstrap y middleware de trazabilidad X-Trace-ID
│       ├── database/                # Pool PostgreSQL, creación de tablas y semilla inicial
│       ├── auth/                    # JwksService (con Circuit Breaker) y JwtAuthGuard local (ADR-08)
│       ├── catalogo/                # Módulo de Catálogo (Controller, Service, ArticuloRepository)
│       └── pedidos/                 # Módulo de Pedidos (Controller, Service, PedidoRepository, Transacción SQL)
├── frontend/                        # Aplicación Web en Next.js (:3000)
│   ├── app/
│   │   ├── page.js                  # Inicio NOVA Shop (Hero, categorías, destacados, buscador)
│   │   ├── login/page.js            # Inicio de sesión y registro de nuevos usuarios
│   │   ├── producto/[codigo]/page.js# Vista detallada de producto en grande
│   │   ├── pedidos/page.js          # Historial y comprobante individual de pedidos
│   │   ├── admin/usuarios/page.js   # Administración y activación de usuarios inactivos (RF-04)
│   │   └── admin/page.js            # Administración de catálogo, precios y stock (RF-12)
│   ├── components/                  # Navbar (con Drawer de carrito y modal de confirmación) e ilustraciones
│   └── context/StoreContext.js      # Estado global, propagación de X-Trace-ID e Idempotency-Key
└── scripts/                         # Scripts de verificación funcional, concurrencia y carga
```
