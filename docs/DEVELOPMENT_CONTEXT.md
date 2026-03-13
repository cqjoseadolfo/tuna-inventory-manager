# Development Context (handoff)

## 1) Estado actual del proyecto
- App en producción en Cloudflare Workers: `tuna-inventory-manager.cq-joseadolfo.workers.dev`.
- Stack: Next.js 14 (App Router) + React 19 + TypeScript + vinext + Wrangler + D1.
- Flujo base funcionando:
  - Login con Google
  - Sincronización usuario en D1
  - Registro de login en `login_logs`
  - Onboarding con `nickname` (chapa)

## 2) Infra / despliegue
- Deploy automático por GitHub Actions en push a `main`.
- Workflow: `.github/workflows/deploy.yml`.
- Pipeline: checkout -> setup node 22 -> npm install -> npm run deploy.
- Deploy target: Cloudflare Workers + D1.

## 3) Problemas encontrados y resolución

### A) Error en CI: faltaba `CLOUDFLARE_API_TOKEN`
**Síntoma:** Wrangler fallaba en entorno no interactivo.
**Causa:** Secret no configurado en GitHub Actions.
**Solución:** Configurar `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en repo secrets.

### B) Pantalla en blanco inicial / loading infinito
**Síntoma:** página sin contenido hasta refrescar.
**Causa:** `initTokenClient` podía fallar y dejar `isLoading=true`.
**Solución aplicada:** `try/catch/finally` + timeout de seguridad en `AuthContext`.

### C) DB binding no encontrado en producción
**Síntoma:** `Database binding (DB) not found in production environment`.
**Causa:** Los handlers no estaban leyendo el binding de forma consistente en runtime edge.
**Solución aplicada:**
- Exponer `env.DB` en `globalThis.DB` en `worker/index.ts`.
- Centralizar acceso a binding en `app/lib/db.ts`.
- Usar helper en `/api/auth/sync` y `/api/auth/onboarding`.

### D) Error frontend: `t is not a function`
**Síntoma:** tras onboarding aparece error minificado.
**Causa identificada:** `completeOnboarding` se define en `AuthContext`, pero no se entrega en `AuthContext.Provider`.
**Estado:** pendiente de corrección (identificado, no aplicado en esta fase por solicitud del usuario).

## 4) Archivos clave modificados durante esta fase
- `README.md` (documentación completa + flujo real CI/CD)
- `.github/workflows/deploy.yml` (inyección de `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- `app/context/AuthContext.tsx` (robustez inicialización Google)
- `worker/index.ts` (exposición de `DB` en runtime)
- `app/lib/db.ts` (helper de binding)
- `app/api/auth/sync/route.ts` (uso de helper DB)
- `app/api/auth/onboarding/route.ts` (uso de helper DB)

## 5) Configuración requerida en GitHub Secrets
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

> Nota: `.env` local NO se usa en GitHub Actions. Actions solo usa `secrets`.

## 6) Seguridad (muy importante)
- En conversación se expusieron credenciales reales (`CLOUDFLARE_API_TOKEN`, `GOOGLE_CLIENT_SECRET`, etc.).
- Recomendado (si no se hizo):
  1. Rotar Cloudflare API token.
  2. Regenerar Google OAuth client secret.
  3. Actualizar GitHub secrets con valores nuevos.

## 7) Cómo retomar rápido (otro modelo o sesión futura)
1. Revisar Actions del último deploy y confirmar estado verde.
2. Probar en producción:
   - Login Google
   - Alta/sync de usuario
   - Onboarding
3. Corregir primero pendiente crítico:
   - Incluir `completeOnboarding` en el `value` del `AuthContext.Provider`.
4. Después avanzar en features de inventario real:
   - CRUD instrumentos
   - préstamos/devoluciones
   - historial y auditoría

## 8) Backlog recomendado inmediato
- [ ] Fix `completeOnboarding` en `AuthContext.Provider`.
- [ ] Reemplazar `any` de DB por tipado D1.
- [ ] Agregar endpoint healthcheck (`/api/health`) para verificar DB binding y tabla.
- [ ] Añadir tests mínimos para auth sync + onboarding.
- [ ] Añadir observabilidad (logs estructurados y manejo de errores uniforme).

## 9) Criterio de “listo para escalar”
- Deploy estable por CI/CD ✅
- Secrets centralizados en GitHub ✅
- D1 operativo en producción ✅
- Flujo auth base operativo ✅
- Pendiente único conocido: callback onboarding local state (`completeOnboarding`) ⏳

---
Última actualización: 2026-03-13
