# Workflow · Implementar feature

> Protocolo para implementar una feature del backlog siguiendo plan-código-build-deploy-verify.

---

## Paso 0 · Verificar que la feature está aprobada

Buscar en `handoff/TODO.md` la feature target. Si no está, preguntar a Andrés si quiere agregarla o si es scope creep de la sesión actual.

Si hay un spec en `.patrimonio-agent/specs/<feature>.md`, leerlo completo.

---

## Paso 1 · Plan corto antes de código

Escribir plan de 5-10 puntos:
- Qué archivos se tocan
- Qué nuevos archivos se crean
- Qué endpoints se agregan/modifican
- Qué migración Drizzle (si aplica)
- Qué cambios al schema (si aplica)
- Cuál es el orden (frontend antes? backend antes?)

Mostrar el plan a Andrés para aprobación. NO arrancar código sin OK.

---

## Paso 2 · Cambios al schema (si aplica)

Si la feature requiere nueva tabla o columna:

1. Editar `src/server/schema.ts`
2. `npx drizzle-kit generate` (genera migración SQL)
3. Mostrar la migración a Andrés
4. `npx wrangler d1 migrations apply patrimonio-db --remote`
5. Verificar con `npx wrangler d1 execute ... "SELECT sql FROM sqlite_master ..."`

NO mezclar cambios de schema con código de feature en el mismo commit. Dos commits separados.

---

## Paso 3 · Backend (si aplica)

1. Crear/editar archivo de ruta en `src/server/routes/<feature>.ts`
2. Si es nueva ruta, montarla en `functions/api/[[route]].ts`
3. Validar con zod los inputs
4. Filtrar siempre por `userId` en queries
5. `npm run build` debe pasar

---

## Paso 4 · Frontend (si aplica)

1. Hook nuevo en `src/hooks/<feature>.ts` (si la lógica es reutilizable)
2. Componente en `src/components/<area>/`
3. Si es página nueva, agregar ruta en `src/main.tsx` o donde estén las rutas
4. UI siguiendo `UI-GUIDELINES.md` (cuando exista) o el estilo de páginas similares
5. `npm run build` debe pasar

---

## Paso 5 · Verificación visual local (NO `npm run dev`)

Recordar: `npm run dev` no levanta las Functions de Cloudflare. Para verificación seria:

1. `git add ... && git commit -m "feat(...): ..."`
2. `git push origin main`
3. Esperar Cloudflare auto-deploy (~1-2 min)
4. Verificar deploy verde con `npx wrangler pages deployment list --project-name finance-app | head -3`
5. Pedir a Andrés que verifique en `https://finance-app-678.pages.dev`

---

## Paso 6 · Si Andrés dice "está bien"

Cerrar la feature en TODO.md (mover de "Backlog" a "Cerrado en sesión X").

Si descubrió bugs durante verificación, agregarlos a TODO.md NO seguir arreglándolos en la misma sesión (scope creep). Excepción: si el bug es del cambio mismo y bloquea la feature, arreglarlo.

---

## Paso 7 · Si Andrés dice "no funciona como esperaba"

NO entrar en bucle de fixes sin replantear. Volver al Paso 1 y discutir si el plan original era correcto.

Si fueron 2-3 intentos y sigue sin funcionar, parar y rehacer plan.

---

**Fin del workflow.**
