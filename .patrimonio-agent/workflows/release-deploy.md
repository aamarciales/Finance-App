# Workflow · Release / Deploy

> Cómo deployar a producción con verificación.

---

## Setup

Cloudflare Pages auto-deploya desde `main` del repo `aamarciales/Finance-App`. No hay deploy manual.

---

## Paso 1 · Pre-flight

1. Working tree limpio: `git status` → "nothing to commit"
2. Build verde: `npm run build`
3. Sin errores TypeScript

Si algo falla, arreglarlo primero.

---

## Paso 2 · Push

```bash
git push origin main
```

---

## Paso 3 · Esperar deploy

```bash
npx wrangler pages deployment list --project-name finance-app | head -5
```

Buscar el commit nuevo. Estado debe pasar de `queued` → `building` → `success`. Tarda 1-2 min.

Si después de 5 minutos sigue en `building`, algo está mal:
```bash
npx wrangler pages deployment tail --project-name finance-app
```

---

## Paso 4 · Verificación HTTP

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://finance-app-678.pages.dev/
```

Debe devolver `200`. Si no, hay un problema de SPA routing o de build.

---

## Paso 5 · Verificación visual

Pedir a Andrés que abra `https://finance-app-678.pages.dev/` con **Cmd+Shift+R** (hard refresh, evita caché del bundle viejo).

Verificar que:
- La página carga sin errores en consola
- El feature/fix nuevo se ve como esperado
- Las páginas que NO se modificaron siguen funcionando (Dashboard, Transacciones, etc)

---

## Paso 6 · Si algo está mal

Opciones:

**Opción A — Rollback rápido**: en Cloudflare dashboard, botón "Rollback to this deployment" sobre el deploy anterior funcionante.

**Opción B — Forward fix**: arreglar el bug, push de nuevo, esperar deploy.

Decidir con Andrés cuál opción según severidad del bug.

---

## Anti-patrones (NO hacer)

- Push de código que no compila esperando "ya lo arreglo después"
- Deployar antes de verificación local
- No esperar el deploy y asumir que el cambio está vivo
- Probar en `npm run dev` y dar OK (dev no usa Functions de Cloudflare)

---

**Fin del workflow.**
