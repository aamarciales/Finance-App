# Patrimonio · bitácora de implementación

Bitácora por fase: qué quedó completo, qué decisiones técnicas se tomaron sin
consultar (con su justificación) y qué quedó explícitamente pendiente.

---

## Fase 1 — Fundación · _completada_

### Completado

- **Scaffold Vite + React 19 + TS strict** en la raíz del proyecto, sin tocar
  `README.md` ni `design-reference/` (Vite generado en `/tmp` y movido).
- **Git inicializado** en `main` con `.gitignore` extendido (`.env*`).
- **Dependencias core instaladas**: dexie, @tanstack/react-query, zustand,
  react-router-dom, react-hook-form, zod, @hookform/resolvers, recharts,
  lucide-react, date-fns, papaparse, dinero.js, framer-motion. DevDeps:
  tailwindcss + @tailwindcss/vite (v4), vitest, @vitest/ui, jsdom,
  @types/papaparse.
- **Tailwind v4 configurado** vía plugin oficial `@tailwindcss/vite`. Tokens
  del README mapeados en `src/index.css` con CSS variables (`--bg`,
  `--surface`, `--brand`, `--gold`, etc.) y expuestos como utilidades de
  Tailwind vía `@theme inline` (`bg-bg`, `text-text-muted`, `bg-brand-soft`,
  `text-gold`, etc.). Fuentes Fraunces / Geist / JetBrains Mono cargadas
  desde Google Fonts en `index.html`.
- **shadcn/ui inicializado** con preset `nova` (radix base, lucide icons),
  Tailwind v4. CSS variables ON. `components/ui/button.tsx` y `lib/utils.ts`
  generados. Las CSS vars de shadcn (`--primary`, `--muted`, etc.) están
  remapeadas a mis tokens — `--primary` apunta a `--brand` (verde profundo).
- **AppShell + Sidebar + MobileNav + TopBar**:
  - Sidebar 240px fija (≥768px) con secciones Resumen / Análisis /
    Compromisos / Configuración, replicando el HTML reference.
  - MobileNav con drawer slide-in (framer-motion, `cubic-bezier(0.2,0.8,0.2,1)`,
    overlay 0.4 con backdrop-blur, touch targets ≥44px).
  - TopBar mobile con brand + hamburguesa.
  - Footer del sidebar con TRM (placeholder hardcodeada — ver decisiones).
- **React Router v7** con las 11 rutas (Dashboard, Transactions, Invoices,
  Invoices/:id placeholder, Import, Categories, Tithe, Goals, Debts, Taxes,
  Settings) y catch-all `/*` → home. Cada página renderiza `PageHeader` +
  `EmptyState` con el subtítulo del HTML reference.
- **Dexie schema v1** completo (11 tablas) en `src/db/schema.ts`,
  alineado con el README.
- **Seed idempotente** (`ensureSeed`) que poblar las 15 categorías por
  defecto y los settings iniciales (USD base, COP secundaria, titheConfig
  10/10/10/5, displayName "Andrés", taxProfile, ocrProvider claude,
  monthlyTaxProvisionRate 0.02). Marca de versión en `__seedVersion`
  para futuras migraciones.
- **`useSettings()` hook** que lee/escribe la tabla `settings` reactivamente.
- **Componentes comunes**: `<Money>` (3 variantes: inline / kpi / tabular),
  `<Badge>` (6 tonos del HTML), `<EmptyState>`, `<PageHeader>`.
- **TanStack Query** wired en `main.tsx` con `QueryClientProvider`.
- `npm run build` ✓ limpio (TS sin errores, Vite OK).
- `npm run dev` ✓ arranca en ~300ms.

### Decisiones tomadas sin consultar (con justificación)

1. **Tailwind v4 en lugar de v3.** El stack del README dice "Tailwind" sin
   versión; v4 es la última estable y `@tailwindcss/vite` es el plugin
   recomendado. shadcn/ui ya soporta v4. Esto cambia ligeramente el modelo
   de configuración: ya no hay `tailwind.config.ts`, los tokens viven en
   CSS via `@theme`. Si prefieres v3, lo podemos bajar.

2. **shadcn preset `nova` (radix base, lucide).** El nuevo CLI de shadcn
   eliminó el flag `--style new-york` y ahora usa "presets". `nova` es el
   preset moderno equivalente a "new-york" con Lucide (que es lo que
   pediste). No cambia nada visible — los componentes siguen siendo los
   mismos de shadcn/ui.

3. **`baseUrl` removido del tsconfig.** TS 6+ marca `baseUrl` como
   deprecated y rompe el build. Las rutas del alias `@/*` ahora se
   resuelven relativo al tsconfig (`./src/*`) — equivalente y compatible
   con TS 7.

4. **React Router v7** (en lugar de v6 del README). El paquete
   `react-router-dom` ya está unificado en v7 con la API de v6 más algunas
   mejoras (loaders, futureFlags). API compatible con lo que el README
   describe.

5. **TRM hardcodeada** en el footer del sidebar (`$4.087,30 COP, +0.42%`)
   con un comentario explícito. La spec dice que en Fase 1-3 puedo usar
   un mock — lo conectaré con la API de Banrep en Fase 3.

6. **`Money` con 3 variantes** (`inline` / `kpi` / `tabular`) en lugar de
   un solo display. El HTML reference muestra montos en al menos esos tres
   contextos visuales distintos (KPI con prefijo de moneda en sans
   pequeño + serif grande; tablas con mono; texto inline corriente).

7. **Tabla `settings` con un row por key** (en lugar de un único blob
   JSON). Permite actualización granular y queries más simples. El hook
   `useSettings` reconstruye el objeto AppSettings tipado en memoria.

8. **`@fontsource-variable/geist` instalado pero no importado**: shadcn lo
   añadió automáticamente. Lo dejé como dep porque no estorba, pero las
   fuentes se cargan desde Google Fonts (más simple, según README).

### Pendiente / convertido en TODOs para fases siguientes

- Reactivar `useSettings` con `dexie-react-hooks` + `useLiveQuery` cuando
  toque (Fase 2) — hoy es polling manual con `refresh()`.
- TRM real (Fase 3): probar primero la llamada directa a
  `https://www.datos.gov.co/resource/32sa-8pi3.json` desde el browser. Si
  hay CORS, se mueve al Worker.
- Splittear bundle (warning de Vite por >500kB): postergado a Fase 8 con
  `lazy()` de React Router.
- Prettier: no instalado todavía. El README lo lista pero la fase 1 no lo
  requiere — lo añadimos en Fase 8.
- **Verificación visual en browser**: yo solo puedo ejecutar `npm run dev`
  y confirmar que arranca. Necesito que tú abras http://localhost:5173 y
  verifiques visualmente la sidebar, navegación entre páginas y drawer
  móvil antes de cerrar la fase.

---
