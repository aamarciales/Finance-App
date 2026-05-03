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

### Decisiones aprobadas por Andrés en Fase 1

1. **Tailwind v4 en lugar de v3.** El stack del README dice "Tailwind" sin
   versión; v4 es la última estable y `@tailwindcss/vite` es el plugin
   recomendado. shadcn/ui ya soporta v4. Modelo de configuración sin
   `tailwind.config.ts`, tokens via `@theme` en CSS.

2. **shadcn preset `nova` (radix base, lucide).** Equivalente moderno al
   style "new-york" con Lucide icons. No cambia nada visible.

3. **`baseUrl` removido del tsconfig.** TS 6+ lo marca como deprecated.
   El alias `@/*` se resuelve relativo al tsconfig (`./src/*`).

4. **React Router v7** (en lugar de v6). Paquete unificado, API compatible
   con v6 más loaders y futureFlags.

5. **TRM hardcodeada** en el sidebar (`$4.087,30 COP, +0.42%`). Mock para
   Fases 1-3; se conecta a la API de Banrep en Fase 3.

6. **`Money` con 3 variantes** (`inline` / `kpi` / `tabular`). El HTML
   reference muestra montos en tres contextos visuales distintos.

### Pendiente / convertido en TODOs para fases siguientes

- Reactivar `useSettings` con `dexie-react-hooks` + `useLiveQuery` (Fase 2).
- TRM real (Fase 3): probar llamada directa a Banrep API desde el browser.
  Si hay CORS, se mueve al Worker.
- Splittear bundle (warning de Vite por >500kB): Fase 8 con `lazy()`.
- Prettier: Fase 8.
- **Verificación visual en browser**: ✓ aprobada por Andrés — sidebar,
  tipografías, 10 rutas y drawer mobile verificados.

---

## Fase 2 — Datos básicos · _completada_

### Completado

- **`dexie-react-hooks`** instalado. Todos los hooks migrados a `useLiveQuery`.
- **`useSettings` migrado** a `useLiveQuery`: eliminado polling manual y
  `refresh()`. API publica se mantiene (`settings`, `loading`, `setSetting`).
- **`useTRM` hook** creado (mock Phase 2): lee/escribe `db.trmRecords`, retorna
  `{ rate, date, source, loading }`. TRMFooter actualizado para consumirlo.
- **`useTransactions` hook** creado: filtros por tab/periodo/categoria/busqueda,
  join con categorias, funciones CRUD (`addTransaction`, `updateTransaction`,
  `deleteTransaction`). Calcula `amountInBase`/`amountInSecondary` automaticamente.
- **`src/lib/currency.ts`** creado: `convertAmount`, `getEquivalentAmounts`,
  `calculateEffectiveRate`.
- **`src/lib/validators.ts`** creado: schemas zod v4 para transaccion y categoria.
  Nota: zod v4 usa `{ message }` en lugar de `{ required_error }`.
- **10 componentes shadcn** instalados: dialog, select, input, textarea, tabs,
  label, popover, calendar, scroll-area, separator.
- **TxFormDialog**: formulario completo con react-hook-form + zodResolver,
  tipo/fecha(con calendar)/concepto/monto+moneda/categoria(filtrada por tipo)/
  TRM(notas/editable)/notas. Calcula equivalentes on submit.
- **TransactionsTable**: tabla con columnas Fecha/Concepto/Categoria(Badge)/
  Monto/Equivalente/TRM. Ingresos en verde, gastos en rojo. Hover bg-surface-2.
- **TxFilters**: periodo/categoria/busqueda con conversion a rango de fechas.
- **TxTabs**: 4 tabs (Todas/Ingresos/Gastos/Recurrentes) estilo design reference.
- **Transactions page**: reescrita con filtros + tabs + tabla + dialog.
- **CategoryFormDialog**: dialog simple para agregar categorias personalizadas.
- **Categories page**: lista agrupada por tipo con color dot + badge "Sistema".
- **Seed expandido** (v2): 32 transacciones realistas (15 abr - 2 may 2026),
  3 facturas con items (Exito, D1), 2 deudas (tarjeta Bancolombia, prestamo
  familiar), 3 metas (fondo emergencia, viaje Europa, MacBook). TRM variada
  por fecha (4069-4087). Idempotente: solo re-seed si version < 2.
- `npm run build` ✓ limpio.

### Decisiones

- **Amounts en unidades de display** (no en cents). COP = pesos enteros,
  USD = dolares con decimales. Siguiendo `format.ts` existente. La migracion
  a cents con dinero.js queda para Fase 3 cuando se necesiten sumatorias.
- **zod v4 error params**: usa `{ message }` en lugar de `{ required_error }`.
  `@hookform/resolvers/zod` v5.2 soporta zod v4 sin subpath especial.
- **Filtros en `useTransactions`**: client-side filtering sobre el resultado
  ordenado de Dexie. Suficiente para 30-100 transacciones. Para >100, se puede
  migrar a Dexie `where()` clauses en Fase 3.

---

## Pulido Fase 2 · _completada_

### Completado

- **Modelo simplificado**: `TxType` reducido de 6 a 4 valores
  (`expense | income | debt_payment | transfer`). Categorías ya distinguen
  freelance/sueldo. Diezmo/ofrenda son `expense` con categoría dedicada.
- **EUR como tercera moneda**: `Currency = 'USD' | 'COP' | 'EUR'`. EUR→USD vía
  frankfurter.app (cache en tabla `forexRates`), EUR→COP = EUR→USD × TRM.
- **Dexie schema v2**: tabla `forexRates` con índice compuesto `[pair+date]`.
  IndexedDB `debtId` agregado a transacciones.
- **`src/lib/currency.ts`** actualizado: `getEquivalentAmounts` maneja 3 monedas.
- **`src/lib/validators.ts`** actualizado: 4 TxTypes, 3 Currencies, `debtId` opcional.
- **`src/lib/tithe.ts`** creado: cálculo por categoría (`tithePercentByIncomeCategory`)
  con fallback a `defaultTithe`/`defaultOffering`.
- **`src/hooks/useForex.ts`** creado: fetch EUR/USD de frankfurter.app, fallback 1.08.
- **Seed v3**: 55+ transacciones incluyendo 20 recurrentes (5 series × 4 meses),
  2 EUR (Hetzner, Namecheap), `debt_payment` con `debtId` FK, TitheConfig por
  categoría. Migración automática de tipos viejos.
- **Color picker** (CategoryFormDialog): grid 12 swatches con Check icon y ring.
- **Icon picker** (CategoryFormDialog): grid 20 íconos lucide visuales con tinte.
- **Category icons en tabla** (TransactionsTable): ícono lucide + color al lado del Badge.
- **Edit/delete transacciones**: botones Pencil/Trash2 con hover en desktop,
  AlertDialog de confirmación, toast sonner.
- **Edit/delete categorías**: botones edit/trash por fila, isSystem protegido con
  Tooltip, reasignación de transacciones a "Otros" al eliminar.
- **isRecurring checkbox** en TxFormDialog.
- **debtId selector** en TxFormDialog cuando tipo = debt_payment. Lista deudas
  activas, empty state con link a /debts.
- **Adjuntos (attachments)**: dropzone drag-and-drop en TxFormDialog (JPG/PNG/HEIC/PDF,
  máx 5 archivos, 10MB c/u), thumbnails, Blob storage en IndexedDB.
- **Paperclip + RotateCw** en TransactionsTable para adjuntos y recurrentes.
- `npm run build` ✓ limpio.

### Decisiones

- **diezmo por categoría en lugar de por tipo**: Permite configurar % diferente
  para Freelance vs Sueldo en vez de hardcodear por TxType. Estructura:
  `TitheConfig.tithePercentByIncomeCategory[categoryId]`.
- **EUR rate cache en IndexedDB**: Mismo patrón que TRM. Tabla `forexRates`
  con `pair+date` como índice único. Auto-fetch al cargar si no está cacheado hoy.
- **Adjuntos como Blobs en IndexedDB**: Sin Storage API externa. Máximo 5 archivos
  por transacción, 10MB cada uno. Suficiente para fotos de facturas.
- **isSystem categorías no eliminables**: Tooltip explicativo en lugar de ocultar
  el botón. Transacciones de categorías eliminadas se reasignan a "Otros".

### Pendiente / convertido en TODOs para fases siguientes

- Dashboard con KPIs reales y gráficas (Fase 3).
- Página Facturas con grid y drill-down (Fase 4).
- Diezmo, metas, deudas páginas completas (Fase 5).
- OCR con Cloudflare Worker (Fase 6).
- Impuestos (Fase 7).
- Splittear bundle (warning >500kB): Fase 8 con `lazy()`.
- Prettier: Fase 8.

---

## Pulido grande post-Fase 2 · _completada_

### Completado

- **Modelo: 2 tipos visibles, lógica por categoría**: El formulario muestra solo
  "Gasto" e "Ingreso". La categoría seleccionada determina el tipo interno:
  "Deuda" → `debt_payment`, "Transferencias" → `transfer`, resto directo.
  Helper `resolveInternalType(categoryName, visibleType)`.
- **3 categorías sistema nuevas**: Transferencias (#16), Comisiones bancarias (#17),
  Intereses bancarios (#18). Total: 18 categorías.
- **Dexie schema v3**: tabla `audit_log`, índice `transferGroupId` en transactions.
- **Transaction +3 campos**: `capitalAmount?`, `interestAmount?`, `transferGroupId?`.
- **Debt +isPaid**: campo booleano para marcar deudas saldadas.
- **AuditLogEntry**: nueva interfaz + tabla `audit_log`.
- **Bug fix: alineación categorías**: Layout fijo con `flex-1` spacer entre nombre y
  acciones, eliminado doble `ml-auto`.
- **Bug fix: editar transacción vacío**: `useEffect([editTx, open])` que llama
  `reset(newValues)` explícitamente. react-hook-form ignora defaultValues post-mount.
- **Auto-débito deudas**: Al crear `debt_payment`, resta capital del saldo, incrementa
  cuotas pagadas, marca isPaid si saldo ≤ 0 con toast. Al editar/eliminar revierte
  el delta. Intereses crean tx separada en categoría "Intereses bancarios".
- **Audit log + /historial**: Hook `useAuditLog` con `logChange`, `revertEntry`.
  Página `/historial` con filtros (tipo/período/entidad), lista cronológica, botón
  Revertir solo para el último cambio. Wired en transactions + categories CRUD.
  Nav item bajo Configuración.
- **Wizard "Recibir pago internacional"**: Dialog 5 pasos (pago bruto → comisiones
  origen → plataforma intermedia → cambio moneda → resumen). Crea múltiples txs
  atómicamente con `transferGroupId`. Incluye txs de diezmo + ofrenda automáticas.
  Comisiones como txs separadas. Comparación con TRM oficial.
- **Seed v4**: 65+ transacciones incluyendo 2 debt_payments con capital/intereses,
  1 grupo de pago internacional (8 txs con transferGroupId compartido),
  2-3 transferencias internas USD→COP, 3 categorías nuevas.
- **Iconos nuevos**: ArrowRightLeft, Landmark, Percent en TransactionsTable y
  CategoryFormDialog.
- `npm run build` ✓ limpio.

### Decisiones

- **2 tipos visibles (no 4)**: El usuario nunca ve `debt_payment` ni `transfer` en
  el formulario. Se infieren de la categoría. Simplifica la UX.
- **Detección por nombre de categoría**: `resolveInternalType` usa el nombre, no
  IDs hardcodeados. Más robusto ante re-seeds.
- **capitalAmount/interestAmount en unidades de display** (no cents): Consistente
  con el resto de la app.
- **Transferencias excluidas de KPIs**: `isKpiTransaction()` filtra `type !== 'transfer'`.
  No suman a gastos ni ingresos.
- **Reseed completo**: Seed v3→v4 clear IndexedDB y regenera. Sin datos reales que
  preservar.
- **Diezmo en wizard crea txs automáticamente**: Usa `calculateTitheForIncome` con
  la categoría de ingreso seleccionada. Cada una (diezmo + ofrenda) como tx separada.
- **Audit log FIFO 1000**: Auto-prune al insertar entry 1001. Solo el último cambio
  por entidad es revertible.

### Pendiente / convertido en TODOs para fases siguientes

- Dashboard con KPIs reales y gráficas (Fase 3).
- Página Facturas con grid y drill-down (Fase 4).
- Diezmo, metas, deudas páginas completas (Fase 5).
- OCR con Cloudflare Worker (Fase 6).
- Impuestos (Fase 7).
- Splittear bundle (warning >500kB): Fase 8 con `lazy()`.
- Prettier: Fase 8.

---
