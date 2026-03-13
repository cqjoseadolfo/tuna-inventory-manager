# 🎻 Tuna Inventory Manager

Aplicación web para gestionar el inventario de instrumentos de una **Tuna** (agrupación musical universitaria). Construida con **Next.js 14**, desplegada en **Cloudflare Workers** mediante **vinext**, y con autenticación vía **Google OAuth2** sin registro previo.

---

## 📋 Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Base de Datos](#base-de-datos)
- [Desarrollo con Docker](#desarrollo-con-docker)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Despliegue en Cloudflare](#despliegue-en-cloudflare)
- [Diseño](#diseño)
- [Estado del Proyecto](#estado-del-proyecto)
- [Legacy](#legacy)

---

## 🧰 Stack Tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 19 + TypeScript 5 |
| Bundler | Vite 8 + vinext |
| Plataforma | Cloudflare Workers |
| Base de Datos | Cloudflare D1 (SQLite) |
| Imágenes | Cloudflare Images |
| Auth | Google Identity Services (OAuth2) |
| Dev Environment | Docker + Docker Compose |

---

## 🏗️ Arquitectura del Proyecto

```
tuna-inventory-manager/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Layout raíz: carga Google GSI script + AuthProvider
│   ├── page.tsx                # Página principal: login o dashboard según sesión
│   ├── globals.css             # Estilos globales (tema dark + glassmorphism)
│   ├── api/
│   │   └── auth/
│   │       ├── sync/route.ts       # POST: sincroniza usuario de Google con D1
│   │       └── onboarding/route.ts # POST: guarda el nickname (Chapa) del usuario
│   └── context/
│       └── AuthContext.tsx     # Context global de autenticación (estado de sesión)
│
├── components/
│   ├── Dashboard.tsx           # Panel de inventario (con datos mock, en desarrollo)
│   ├── GoogleAuthButton.tsx    # Botón "Iniciar sesión con Google"
│   └── OnboardingModal.tsx     # Modal para que usuarios nuevos ingresen su "Chapa"
│
├── worker/
│   └── index.ts                # Entry point del Cloudflare Worker (imagen + handler)
│
├── legacy/                     # Prototipo original en Vanilla JS (referencia)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── schema.sql                  # Esquema de la base de datos D1
├── wrangler.jsonc              # Configuración de Cloudflare (bindings D1, ASSETS, IMAGES)
├── vite.config.ts              # Configuración de Vite con plugins vinext y cloudflare
├── next.config.mjs             # Config Next.js (inyecta git commit y Google Client ID)
├── tsconfig.json               # Config TypeScript
├── Dockerfile                  # Imagen de desarrollo basada en Node 22
└── docker-compose.yml          # Orquestación: monta el código y expone puerto 3001
```

---

## 🔐 Flujo de Autenticación

La autenticación no requiere registro manual. El flujo completo es:

```
1. Usuario hace clic en "Iniciar sesión con Google"
      │
      ▼
2. Google OAuth2 Token Client solicita un Access Token
   (scope: userinfo.profile + userinfo.email)
      │
      ▼
3. Se llama a la Google API para obtener el perfil
   GET https://www.googleapis.com/oauth2/v3/userinfo
      │
      ▼
4. POST /api/auth/sync → Cloudflare D1
   - Si el usuario NO existe → se inserta con nickname = null
   - Si el usuario YA existe → se actualiza nombre y foto
   - Se registra el login en la tabla login_logs
      │
      ▼
5. Si isNewUser o nickname es null → se muestra el OnboardingModal
   - El usuario debe ingresar su "Chapa" (apodo dentro de la Tuna)
   - POST /api/auth/onboarding → actualiza nickname en D1
      │
      ▼
6. Sesión guardada en localStorage con perfil completo
```

---

## 🗄️ Base de Datos

Cloudflare D1 (`tuna-inventory-db`). El esquema se encuentra en [schema.sql](schema.sql):

```sql
-- Usuarios registrados vía Google
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,           -- UUID generado en la app
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    picture TEXT,
    nickname TEXT,                 -- "Chapa" dentro de la Tuna (puede ser null en onboarding)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registro de cada inicio de sesión
CREATE TABLE IF NOT EXISTS login_logs (
    id TEXT PRIMARY KEY,           -- UUID = sessionId
    user_id TEXT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Para crear las tablas en D1, ejecuta:

```bash
npx wrangler d1 execute tuna-inventory-db --file=./schema.sql
```

---

## 🐳 Desarrollo con Docker

El entorno de desarrollo está **completamente containerizado**. No es necesario tener Node.js ni ninguna dependencia instalada en Windows de forma local.

### Levantar el entorno

```bash
docker compose up
```

Esto:
1. Construye la imagen desde el `Dockerfile` (Node 22 + git + vinext/wrangler globales)
2. Monta el directorio del proyecto en `/app` (con hot-reload)
3. Ejecuta `npm install && npm run dev:vinext -- -p 3001 -H 0.0.0.0`
4. Expone la app en `http://localhost:3001`

### Reconstruir la imagen (tras cambios en Dockerfile o dependencias)

```bash
docker compose up --build
```

### Acceder al contenedor

```bash
docker compose exec app sh
```

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Contexto |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de la app en Google Cloud Console | Build / Runtime |
| `DB` | Binding de Cloudflare D1 (inyectado por Wrangler) | Runtime (Worker) |

Para desarrollo local, puedes crear un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

> **Nota:** La variable `NEXT_PUBLIC_GIT_COMMIT` se genera automáticamente en build-time a partir del último commit de git (ver [next.config.mjs](next.config.mjs)). Se muestra en el footer de la app.

---

## 📜 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo estándar de Next.js |
| `npm run dev:vinext` | Servidor de desarrollo con vinext (emula Cloudflare Workers) |
| `npm run build` | Build de producción de Next.js |
| `npm run build:vinext` | Build de producción para Cloudflare Workers |
| `npm run deploy` | Despliega en Cloudflare Workers vía `vinext deploy` |
| `npm run lint` | Ejecuta ESLint |

---

## 🚀 Despliegue en Cloudflare

El despliegue es **completamente automático** vía **GitHub Actions**. No es necesario ejecutar ningún comando manual de deploy desde local.

### Flujo de despliegue

```
Cambios en local
      │
      ▼
git commit + git push → rama main
      │
      ▼
GitHub Actions dispara el workflow (.github/workflows/deploy.yml)
      │
      ▼
Runner ubuntu-latest:
  1. Checkout del código
  2. Setup Node.js 22
  3. npm install
  4. npm run deploy  (vinext deploy → wrangler)
      │
      ▼
✅ Producción en Cloudflare Workers actualizada
```

> También se puede disparar manualmente desde la pestaña **Actions** de GitHub usando `workflow_dispatch`.

### Secrets configurados en GitHub

Los tokens ya están configurados como **secrets del repositorio** en GitHub (`Settings → Secrets and variables → Actions`):

| Secret | Descripción |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de API de Cloudflare con permisos de Workers y D1 |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta de Cloudflare |

### Configuración en `wrangler.jsonc`

- **Worker name:** `tuna-inventory-manager`
- **Compatibility date:** `2026-03-13` con flag `nodejs_compat`
- **Main:** `worker/index.ts` (entry point personalizado con soporte de optimización de imágenes)
- **Bindings (ya configurados en Cloudflare):**
  - `DB` → Cloudflare D1 Database (`tuna-inventory-db`, ID: `b1ee47a3-35cc-4747-a0ef-563e94702924`)
  - `ASSETS` → Archivos estáticos del build
  - `IMAGES` → Cloudflare Images (optimización de imágenes)

### (Solo primera vez) Crear la base de datos D1

Si necesitas inicializar la DB desde cero en una cuenta nueva:

```bash
# Desde dentro del contenedor Docker
npx wrangler d1 create tuna-inventory-db
npx wrangler d1 execute tuna-inventory-db --file=./schema.sql
```

---

## 🎨 Diseño

La interfaz utiliza un tema **dark** con efectos **glassmorphism**:

- Fondo: `#0f172a` (slate-900)
- Acentos: `#3b82f6` (blue-500)
- Componentes con fondo semi-transparente y `backdrop-blur`
- Formas de fondo animadas con gradientes (indigo, pink, sky)

---

## 📝 Estado del Proyecto

| Funcionalidad | Estado |
|---|---|
| Autenticación con Google | ✅ Implementado |
| Onboarding (Chapa) | ✅ Implementado |
| Persistencia en D1 | ✅ Implementado |
| Dashboard de inventario | 🚧 En desarrollo (datos mock) |
| Gestión de instrumentos | ⏳ Pendiente |
| Registro de préstamos | ⏳ Pendiente |
| Historial de actividad | ⏳ Pendiente |

---

## 🗂️ Legacy

La carpeta [`legacy/`](legacy/) contiene el prototipo original de la aplicación escrito en **Vanilla JS**, que sirvió como base para diseñar el flujo de autenticación con Google. Se mantiene como referencia histórica.

---

*Desarrollado con ❤️ para la Tuna — [cqjoseadolfo](https://github.com/cqjoseadolfo)*
