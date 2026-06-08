# Workflow · Release / Deploy

> Deploy to production from local machine (Worker + SPA assets).

---

## Setup

Production is a **Cloudflare Worker** (`finance-app`) that serves `dist/` and `/api/*` via Hono. Deploy locally — no GitHub push required.

Prerequisites:
- `npx wrangler login`
- `.dev.vars` locally; production secrets via `wrangler secret put`
- `npm run build` succeeds

---

## Paso 1 · Pre-flight

1. Working tree limpio: `git status` → "nothing to commit" (recommended)
2. Build verde: `npm run build`
3. Migraciones pendientes: `npm run db:migrate:remote` si hay SQL nuevo en `drizzle/`

Si algo falla, arreglarlo primero.

---

## Paso 2 · Deploy

```bash
npm run release
```

Equivalente a `npm run build && npx wrangler deploy`.

---

## Paso 3 · Verificación HTTP

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://finance-app.<account>.workers.dev/api/health
```

Debe devolver `200`. SPA:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://finance-app.<account>.workers.dev/
```

---

## Paso 4 · Verificación visual

Pedir a Andrés que abra la URL de producción con **Cmd+Shift+R** (hard refresh).

Verificar que:
- La página carga sin errores en consola
- El feature/fix nuevo se ve como esperado
- Las páginas que NO se modificaron siguen funcionando

---

## Paso 5 · Si algo está mal

**Opción A — Rollback**: en Cloudflare dashboard → Workers → finance-app → Deployments → rollback al deploy anterior.

**Opción B — Forward fix**: arreglar, `npm run release` de nuevo.

---

## Local dev (no es deploy)

```bash
npm run dev:all
```

Vite en `:5173` proxea `/api` a wrangler en `:8787`. No uses solo `npm run dev` si necesitas API real.

---

## Anti-patrones (NO hacer)

- Push de código que no compila esperando "ya lo arreglo después"
- Deployar sin `npm run build` local verde
- Probar solo `npm run dev` sin `dev:api` y dar OK a la API
- Olvidar `db:migrate:remote` cuando hay migraciones nuevas

---

**Fin del workflow.**
