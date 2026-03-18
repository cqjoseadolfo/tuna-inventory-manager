# 🎻 Tuna Inventory Manager

Aplicación web para gestionar el inventario de activos de una **Tuna** (agrupación musical universitaria): instrumentos, uniformes, reconocimientos y otros objetos. Construida con **Next.js 14**, desplegada en **Cloudflare Workers** mediante **vinext**, y con autenticación vía **Google OAuth2** sin registro previo.

**Producción:** `tuna-inventory-manager.cq-joseadolfo.workers.dev`

---

## 📋 Tabla de Contenidos

- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Gestión de Activos](#gestión-de-activos)
- [Análisis con IA](#análisis-con-ia)
- [Base de Datos](#base-de-datos)
- [Almacenamiento de Fotos](#almacenamiento-de-fotos)
- [Desarrollo con Docker](#desarrollo-con-docker)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Despliegue en Cloudflare](#despliegue-en-cloudflare)
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
| Base de Datos | Cloudflare D1 (SQLite serverless) |
| Fotos | AWS S3 o compatible (Cloudflare R2) |
| Optimización de imágenes | Cloudflare Images binding |
| IA | Google Gemini o OpenAI (configurable) |
| Auth | Google Identity Services (OAuth2) |
| Dev Environment | Docker + Docker Compose |
| CI/CD | GitHub Actions → Cloudflare Workers |

---

## 🏗️ Arquitectura del Proyecto

```
tuna-inventory-manager/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout raíz: carga Google GSI script + AuthProvider
│   ├── page.tsx                  # Página principal: login o dashboard según sesión
│   ├── globals.css               # Estilos globales (tema dark + glassmorphism)
│   ├── api/
│   │   ├── assets/
│   │   │   ├── route.ts              # GET lista con filtros / POST crear activo
│   │   │   ├── [id]/route.ts         # GET detalle de un activo por ID
│   │   │   ├── ai-analyze/route.ts   # POST análisis de imagen con IA (Gemini / OpenAI)
│   │   │   └── upload-photo/route.ts # POST subida de foto a S3
│   │   ├── auth/
│   │   │   ├── sync/route.ts         # POST sincroniza usuario de Google con D1
│   │   │   └── onboarding/route.ts   # POST guarda el nickname (Chapa) del usuario
│   │   └── ui/
│   │       └── newsletter-image/route.ts  # GET imagen de newsletter de la Tuna
│   ├── assets/
│   │   ├── new/page.tsx          # Formulario de registro de nuevo activo
│   │   ├── [id]/page.tsx         # Vista de detalle de un activo
│   │   └── search/page.tsx       # Buscador de activos con filtros
│   ├── profile/page.tsx          # Perfil del usuario (stub)
│   ├── settings/page.tsx         # Ajustes del sistema (stub)
│   ├── context/
│   │   └── AuthContext.tsx       # Context global de autenticación (estado de sesión)
│   └── lib/
│       ├── db.ts                 # Helper para obtener el binding D1 en runtime edge
│       └── time.ts               # Helpers de fecha/hora (zona horaria Perú)
│
├── components/
│   ├── Dashboard.tsx             # Panel principal: estadísticas y lista de activos
│   ├── AssetEntryForm.tsx        # Formulario de alta (modo IA + modo manual)
│   ├── AssetSearch.tsx           # Buscador con filtros por tipo, estado y etiqueta
│   ├── GoogleAuthButton.tsx      # Botón "Iniciar sesión con Google"
│   └── OnboardingModal.tsx       # Modal para ingresar la "Chapa" en primer acceso
│
├── worker/
│   └── index.ts                  # Entry point del Worker: expone bindings + image optimization
│
├── docs/
│   ├── DEVELOPMENT_CONTEXT.md    # Historial de decisiones técnicas y problemas resueltos
│   └── sql/
│       ├── 2026-03-14-alter-assets-add-fabrication-year.sql
│       └── 2026-03-14-normalize-asset-tags.sql
│
├── legacy/                       # Prototipo original en Vanilla JS (referencia)
│
├── schema.sql                    # Esquema base de la base de datos D1
├── wrangler.jsonc                # Configuración Worker: bindings D1, ASSETS, IMAGES, vars
├── vite.config.ts                # Vite con plugins vinext y cloudflare
├── next.config.mjs               # Config Next.js: inyecta git commit y Google Client ID
├── tsconfig.json                 # Config TypeScript
├── Dockerfile                    # Imagen de desarrollo basada en Node 22
└── docker-compose.yml            # Orquestación: monta código y expone puerto 3001
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

## 📦 Gestión de Activos

El núcleo funcional de la app. Permite registrar y consultar activos del inventario.

### Tipos de activos

| Tipo | Código | Campos específicos |
|---|---|---|
| `instrumento` | `INS` | tipo de instrumento, marca |
| `reconocimiento` | `REC` | emisor, fecha, tipo de documento, código de referencia |
| `uniforme` | `UNI` | talla, cinta, jubón, gregüesco |
| `otro` | `OTR` | — |

### Código de activo

Se genera automáticamente al crear un activo con el formato `{PREFIJO}-{AÑO}{CORRELATIVO}`.

Ejemplos: `INS-2601`, `UNI-2602`, `REC-2601`

El año usa el año de fabricación si se especifica; si no, el año actual (zona horaria Perú).

### Estados disponibles

| Estado | Descripción |
|---|---|
| `disponible` | El activo está libre |
| `bajo_responsabilidad` | Asignado a un miembro |
| `en_reparacion` | En proceso de reparación |
| `baja` | Dado de baja del inventario |

### Rutas de la UI

| Ruta | Descripción |
|---|---|
| `/` | Dashboard: estadísticas y lista de activos |
| `/assets/new` | Formulario de registro de nuevo activo |
| `/assets/[id]` | Detalle completo de un activo |
| `/assets/search` | Buscador con filtros por código, tipo, estado y etiqueta |

### API de activos

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/assets` | `GET` | Lista activos — filtros: `q`, `assetType`, `status`, `tag`, `limit` |
| `/api/assets` | `POST` | Crea un nuevo activo con sus datos específicos y etiquetas |
| `/api/assets/[id]` | `GET` | Retorna el detalle completo de un activo |
| `/api/assets/upload-photo` | `POST` | Sube una foto a S3 y devuelve la URL pública |
| `/api/assets/ai-analyze` | `POST` | Analiza una imagen con IA y sugiere tipo y metadatos |

### Formulario de registro (`AssetEntryForm`)

El formulario tiene dos modos de entrada:
- **Modo IA:** se sube una foto y la IA sugiere automáticamente tipo, notas y etiquetas.
- **Modo manual:** el usuario completa todos los campos directamente.

Las etiquetas se normalizan con prefijo `#` (e.g. `#instrumentos`, `#guitarra`) y se almacenan en las tablas `tags` y `asset_tag_map`.

---

## 🤖 Análisis con IA

El endpoint `POST /api/assets/ai-analyze` acepta una imagen y devuelve sugerencias en JSON:

```json
{
  "assetType": "instrumento",
  "notes": "Guitarra clásica en buen estado",
  "instrumentType": "guitarra",
  "issueDate": null,
  "tags": ["#instrumentos", "#guitarra"]
}
```

### Proveedores soportados

El proveedor activo se configura con la variable `AI_PROVIDER` en `wrangler.jsonc`:

| Proveedor | Variables necesarias |
|---|---|
| `gemini` (por defecto) | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` |

---

## 🗄️ Base de Datos

Cloudflare D1 (`tuna-inventory-db`). Esquema en [schema.sql](schema.sql) + migraciones en [`docs/sql/`](docs/sql/).

### Tablas principales

```sql
-- Usuarios registrados vía Google
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- UUID generado en la app
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    picture TEXT,
    nickname TEXT,                 -- "Chapa" dentro de la Tuna
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registro de cada inicio de sesión
CREATE TABLE login_logs (
    id TEXT PRIMARY KEY,           -- UUID = sessionId
    user_id TEXT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activos del inventario
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,            -- Código auto-generado, e.g. INS-2601
    asset_type TEXT NOT NULL,      -- instrumento | reconocimiento | uniforme | otro
    photo_url TEXT,
    fabrication_year INTEGER,
    current_value REAL,
    status TEXT DEFAULT 'disponible',
    notes TEXT,
    created_by_user_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos específicos de instrumentos
CREATE TABLE asset_instruments (
    asset_id TEXT PRIMARY KEY,
    instrument_type TEXT,
    brand TEXT,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Datos específicos de reconocimientos / diplomas
CREATE TABLE asset_recognitions (
    asset_id TEXT PRIMARY KEY,
    issuer TEXT,
    issue_date TEXT,
    document_type TEXT,
    reference_code TEXT,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Datos específicos de uniformes
CREATE TABLE asset_uniforms (
    asset_id TEXT PRIMARY KEY,
    size TEXT,
    has_cinta INTEGER DEFAULT 0,
    has_jubon INTEGER DEFAULT 0,
    has_greguesco INTEGER DEFAULT 0,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Catálogo global de etiquetas
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    tag TEXT NOT NULL UNIQUE
);

-- Relación muchos-a-muchos activos ↔ etiquetas
CREATE TABLE asset_tag_map (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

### Inicializar la DB

```bash
npx wrangler d1 execute tuna-inventory-db --file=./schema.sql
```

### Migraciones aplicadas

```bash
# Agrega fabrication_year a assets y elimina columnas legacy
npx wrangler d1 execute tuna-inventory-db --file=./docs/sql/2026-03-14-alter-assets-add-fabrication-year.sql

# Normaliza etiquetas en tablas tags + asset_tag_map
npx wrangler d1 execute tuna-inventory-db --file=./docs/sql/2026-03-14-normalize-asset-tags.sql
```

---

## � Almacenamiento de Fotos

Las fotos de activos se suben a un bucket **AWS S3** (o cualquier proveedor compatible como Cloudflare R2) mediante el endpoint `POST /api/assets/upload-photo`.

El archivo se guarda con la ruta: `assets/{tipo}/{timestamp}-{codigo}.{ext}`

La URL pública se construye a partir de `AWS_S3_PUBLIC_BASE_URL` y se guarda en el campo `photo_url` del activo.

### Variables S3 configuradas en `wrangler.jsonc`

| Variable | Valor actual |
|---|---|
| `AWS_REGION` | `us-east-2` |
| `AWS_S3_BUCKET` | `tuna-inventory-manager-tfciff-arequipa-peru-tconan` |
| `AWS_S3_PUBLIC_BASE_URL` | URL pública del bucket |
| `AWS_ACCESS_KEY_ID` | (secret en Cloudflare) |
| `AWS_SECRET_ACCESS_KEY` | (secret en Cloudflare) |

---

## �🐳 Desarrollo con Docker

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

### Variables de build / cliente

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de la app en Google Cloud Console |
| `NEXT_PUBLIC_GIT_COMMIT` | Hash del último commit (generado automáticamente en build) |

### Secrets del Worker (configurados en Cloudflare)

| Variable | Descripción |
|---|---|
| `AWS_ACCESS_KEY_ID` | Clave de acceso S3 |
| `AWS_SECRET_ACCESS_KEY` | Clave secreta S3 |
| `GEMINI_API_KEY` | API Key de Google Gemini |
| `OPENAI_API_KEY` | API Key de OpenAI (alternativa a Gemini) |
| `GMAIL_CLIENT_ID` | OAuth Client ID para Gmail API |
| `GMAIL_CLIENT_SECRET` | OAuth Client Secret para Gmail API |
| `GMAIL_REFRESH_TOKEN` | Refresh token con scope de envío por Gmail |
| `GMAIL_SENDER_EMAIL` | Cuenta Gmail remitente (la que envía) |

### Variables públicas del Worker (en `wrangler.jsonc`)

| Variable | Valor |
|---|---|
| `AWS_REGION` | `us-east-2` |
| `AWS_S3_BUCKET` | nombre del bucket |
| `AWS_S3_PUBLIC_BASE_URL` | URL base pública del bucket |
| `APP_BASE_URL` | URL pública de la app (para enlaces en correos) |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` / `false` para activar correos |
| `AI_PROVIDER` | `gemini` (o `openai`) |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite-preview` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | `gpt-4.1-mini` |

Para desarrollo local, crea un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

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
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google OAuth2 (se inyecta en build) |

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

## 📝 Estado del Proyecto

| Funcionalidad | Estado |
|---|---|
| Autenticación con Google | ✅ Funcionando |
| Onboarding (Chapa) | ✅ Funcionando |
| Persistencia de usuarios en D1 | ✅ Funcionando |
| Registro de logins | ✅ Funcionando |
| Listar activos con filtros | ✅ Funcionando |
| Crear activos (instrumentos, uniformes, reconocimientos, otros) | ✅ Funcionando |
| Ver detalle de activo | ✅ Funcionando |
| Buscador de activos | ✅ Funcionando |
| Subir fotos a S3 | ✅ Funcionando |
| Análisis de imágenes con IA | ✅ Funcionando |
| Dashboard con estadísticas | ✅ Funcionando |
| Etiquetas normalizadas | ✅ Funcionando |
| Página de perfil | 🚧 Stub (en desarrollo) |
| Página de ajustes | 🚧 Stub (en desarrollo) |
| Registro de préstamos / devoluciones | ⏳ Pendiente |
| Historial por activo / miembro | ⏳ Pendiente |

---

## 🗂️ Legacy

La carpeta [`legacy/`](legacy/) contiene el prototipo original de la aplicación escrito en **Vanilla JS**, que sirvió como base para diseñar el flujo de autenticación con Google. Se mantiene como referencia histórica.

---

*Desarrollado con ❤️ para la Tuna — [cqjoseadolfo](https://github.com/cqjoseadolfo)*
