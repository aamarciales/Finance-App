# Patrimonio · PROGRESS

> Bitácora de avances. Items resueltos se mueven aquí desde TODO.md.

---

## UI + diezmo fixes (2026-06-07)

- Mobile nav: glass pill blur (`pt-mobile-nav-pill`), enlace Trakll en menú «Más» y sidebar desktop.
- Tokens trakll: cards 22px, sombras, TopBar con blur.
- `transactions.tithe_exemption`: excluir ingresos del auto-diezmo (exento / ya diezmado / préstamo).
- Registrar entrega en `/tithe` con monto real en COP/USD y «Confirmo pago completo» (tolerancia TRM).
- Migración `0011_tithe_exemption.sql`.

---

## trakll integration (2026-06-07)

- `POST /api/integrations/trakll/income` — server-to-server income from trakll paid invoices.
- Auth: `X-Integration-Secret` + env `TRAKLL_INTEGRATION_SECRET` / `TRAKLL_INTEGRATION_USER_ID`.
- Idempotency via `transactions.notes` = `trakll:invoice:{externalId}`.
- Category: settings `trakllIncomeCategoryId` or first income category.
- Full contract: `docs/integration-trakll.md`.

---

## Fase de estabilización post-handoff V4 (2026-05-15 → 2026-05-17)

60+ commits entre `4765463` (cierre handoff V4) y `5ed39cf`.

### Bugs cerrados

**Bug C parte 2 · IDs huérfanos en titheConfig**
- Antes: si se hacía wipe + reseed, los IDs en titheConfig quedaban huérfanos y la app caía silenciosamente al default sin avisar.
- Después: `src/lib/tithe.ts:3` set de IDs ya warneados (dedup), `:32-47` console.warn defensivo solo en dev cuando categoryId no está en config pero el config no está vacío. `wipe-my-data` ahora borra también `titheConfig` para evitar el problema en wipe + reseed.

**Bug D · Lista de transacciones no se refresca tras wizard**
- Commit `d62ad3a`. Evidencia: `IntlPaymentWizard.tsx:25` (import useQueryClient), `:174` (instancia), `:207` (invalidateQueries en onSuccess).

**Bug E · Colores de categorías no se reflejan en badges**
- Commit `42bbf5d`. Evidencia: `Badge.tsx:28-52` (hexToSoftBg helper + color prop con inline styles), `TransactionsTable.tsx:183` (pasa tx.category.color).

**Bug F · Settings export JSON labels mal alineados**
- Commit `814f75f`.

**Bug G · Invoice QuickView con datos stub**
- Commit `cd48b99`.

**Bug H · TRM validation guard para COP**
- Commit `8692c59`.

**Bugs OCR (descuento + soporte + subcategoría)** (2026-05-17 mañana)
- Tres fixes en una iteración:
  - Total de la factura en OcrPreviewDialog ahora resta el descuento. Antes `total = sum(items.quantity * items.price)` ignoraba `result.discount`. Ahora `total = Math.max(0, itemsTotal - discount)`.
  - Soporte de la factura se adjunta correctamente. El OCR endpoint ya subía la imagen a R2 (`files.ts:404`), ahora la URL fluye al invoice vía `attachmentUrl` en lugar de re-upload del blob desde `OcrPreviewDialog`. `Import.tsx → handleSaveInvoice` recibe y pasa attachmentUrl a addInvoice.
  - Columna SUBCATEGORÍA quitada del OCR dialog. Feature parcial (la columna en BD existe, CSV import y InvoiceDetailModal la usan; el OCR nunca la llenaba). Hoy oculta solo en OCR dialog. Backlog para sesión dedicada de Subcategorías en /analisis.

**Bug · Descuento no se persistía en BD (factura guardada mostraba mal el total)** (2026-05-17 tarde)
- Síntoma: en MXM Florida, OCR detectaba subtotal $35.350 y descuento $1.680 correctamente, dialog mostraba total $33.670, pero al guardar y abrir QuickView aparecía $35.350. El descuento se perdía porque la tabla `invoices` no tenía dónde guardarlo.
- Fix: migración 0009 agregó columnas `subtotal` y `discount` a `invoices`. Backend POST/PUT aceptan los nuevos campos. `handleSave` del OCR pasa subtotal, discount y total explícitos. `addInvoice` calcula total = subtotal - discount con fallback defensivo. InvoiceQuickView muestra breakdown Subtotal/Descuento/Total cuando discount > 0.
- Decisión clave: items se guardan con sus precios reales del recibo (galleta $1.900 sigue siendo $1.900). El descuento vive en el invoice, no se distribuye en los items. Fidelidad del recibo preservada.

### OCR · Upgrade significativo (2026-05-17)

- Modelo OpenAI cambiado de `gpt-4o-mini` a `gpt-4.1-mini` (mejor extracción densa, sigue instrucciones más estrictamente).
- `max_tokens` subido de 1024 a 4096 (antes truncaba recibos largos: el recibo D1 de 31 items perdía ~8 items por truncamiento).
- Prompt OCR reescrito completo: manejo explícito de formato colombiano (punto como miles), descuentos (Descuento A 15% + Descuento B 20%), casos especiales (recibos manuscritos, facturas de servicio, IVA), validación interna antes de responder, regla de no inventar items para cuadrar totales.
- Post-validation server-side: helper `validateOcrResult` calcula `realConfidence` ('high' / 'medium' / 'low') independiente de lo que diga el modelo. Compara `sum(items.lineTotal)` vs `subtotal`, `(subtotal - discount)` vs `total`, y `items.length` vs `itemCountReported`.
- UI con badge basado en realConfidence (Validado / Revisar montos / Revisión obligatoria) + banner de warning rojo si low confidence mostrando la discrepancia exacta en pesos.
- Tipo `OcrResult` extendido con `subtotal`, `discount`, `itemCountReported`, `realConfidence`, `validation`.

### Features grandes implementadas

**Sistema F2 · Diezmos & Ofrendas operativo** (commits `f935570` + 13 más)
- Tabla `tithe_commitments` creada (migración 0002).
- Tabla `commitment_payments` para multi-payment support (migración 0001).
- Generación automática de compromisos al crear ingreso.
- Página /diezmos con checklist de pendientes.
- Modal "registrar entrega" con multi-select, soporte adjunto, generación automática de transacción de gasto.
- Status dinámico: pending / partial / paid / debt.
- Link existing transactions a compromisos.
- Cascade delete: borrar income con compromisos pending cascadea limpiamente (commit `ce286f9`).
- Bloqueo de delete cuando commitment ya tiene linked payments (commit `747f7af`).

**R2 File Storage & Attachments** (commits `56ddf6f`, `f5da239`, `addb011`, `cc2f893`, `e9dafcd`, `c7613ad`)
- Bucket R2 `patrimonio-files`.
- XHR upload con progress bar.
- Soportes visibles en InvoiceQuickView con paperclip indicator.
- Attachment support en invoice form, CSV import, transaction form.

**OCR de tickets con 3 providers** (commits `56ddf6f`, `8df1d4c`, `ccf2d60`, `243b323`, `1effc80`, `819d370`, `ba5cf7a`, fixes 2026-05-17)
- Claude Sonnet 4 (default server-side, ANTHROPIC_API_KEY).
- Google Gemini 2.0 Flash (user API key).
- OpenAI gpt-4.1-mini (user API key).
- Detalle completo del upgrade del 2026-05-17 ver sección "OCR · Upgrade significativo" arriba.

**Camera Capture** (commit `8df1d4c`)
- Input separado con `capture="environment"` para móvil. Permite tomar foto del recibo directamente.

**Dashboard tabs temporales** (commit `57af53a`)
- Monthly (default) / Weekly / Quarterly / Semester / Yearly / All-time.

**CSV Invoice Import** (commits `0883ba3`, `b876d71`, `7f4bb74`, `e9dafcd`)
- Soporta facturas de producto y bills de servicio (Claro, EPM).
- File attachment upload durante import.

**Inline Category Creation** (commit `b88ab64`)
- Crear categorías directo desde el form de transacción.

**Duplicate Transaction** (commit `6b1a367`)
- Botón duplicar con pre-fill del form.

**Import JSON · restauración completa** (commit `144da23`)
- Preview + validación antes de importar.

**Multi-account capital** (commits `a8a55ae`, `5caf73f`)
- Sección "Capital disponible" en Settings.
- Deuda espiritual queda fuera del modelo MVP (decisión: ver TODO sección F2 si se rehabilita).

### Mejoras UX

- Wizard pago internacional: botón atrás como ícono superior izquierdo, dialog positioning fix (commits `c2c52fc`, `914a35e`).
- Plenti agregado como plataforma de pago internacional + input custom "Otro" (commit `e5ac58b`).
- Color picker nativo para categorías + PUT endpoint (commit `7ead8aa`).
- Bundle splitting: framer-motion reemplazado por CSS transitions (−126KB, commit `5dbd9a4`).
- Vendor bundle splitting (commit `1992c9a`).

### Migraciones aplicadas

```
0001_handy_black_cat       → commitment_payments table + migrate tithe_payment_id
0002_certain_felicia       → tithe_commitments table + amount_cop, currency, attachment_url en tithe_payments
0003_motionless_triathlon  → barcode en invoice_items + invoice_number, payment_method, location, notes, attachment_url en invoices
0004_conscious_shotgun     → notes, attachments en transactions
0005_attachments           → goals table
0006_missing_columns       → is_recurring, capital_amount, interest_amount en transactions; is_paid en debts
0007_goals_columns         → description, monthly_contribution en goals
0008_debts_updated_at      → updated_at en debts
0009_invoice_discount      → subtotal, discount en invoices (2026-05-17)
```

### Estado en producción al cierre (2026-05-17)

User `user_3DEHVwNjURaZfTfhcPTS0rNLOer`:
- 80+ transacciones (antes: 9)
- 23 categorías (antes: ~12)
- 12+ facturas + 114+ invoice_items
- 14 tithe_commitments + 3 tithe_payments + 9 commitment_payments
- 3 debts, 1 goal, 6 settings rows (added: ocrProvider, geminiApiKey/openaiApiKey, capitalAccounts)

---

## Sesión 2026-05-17 tarde · UX OCR + Vinculación de cuentas

### Feature: Acceso a OCR desde puntos naturales ✅
- Nuevo componente `CreateMenuDialog.tsx` con 3 cards (Tomar foto, Subir imagen, Entrada manual).
- Nuevo hook `useOcrFlow.ts` para reutilizar lógica de captura/procesamiento OCR.
- Integrado en `/transactions` y `/invoices` — botón "+" abre CreateMenuDialog.
- `OcrPreviewDialog` modificado con doble opción de guardado:
  - "Guardar como factura completa" (invoice + items + transaction)
  - "Guardar como transacción simple" (solo transaction, sin invoice)
- Handler `handleOcrTransaction` creado para persistir transacción simple desde OCR.
- `/import` removido del menú principal (nav-items.ts). Página sigue accesible por URL para CSV bulk.
- Bug fix: stale closure en `useOcrFlow` — `useRef` para que `processOCR` siempre lea el file más reciente.
- Loading overlay con spinner añadido durante procesamiento OCR.

### Feature: Vinculación de transacciones a cuentas ✅
- Migración 0010: nueva columna `account_id` (text, nullable) en transactions.
- Schema, tipos, validador y rutas POST/PUT actualizados.
- `TxFormDialog` muestra dropdown "Cuenta" para gastos e ingresos (opciones de `settings.capitalAccounts`).
- `useDashboard.ts`: balance real de cada cuenta = monto configurado - gastos vinculados + ingresos vinculados.
- `CapitalDetailDialog.tsx`: muestra monto base → monto ajustado por cuenta.

### Bug fix: attachments validation en edición ✅
- Campo `attachments` podía ser `null` (desde BD) pero schema esperaba `array | undefined`.
- Fix: `z.array(z.string()).nullable().optional()`.
- Mensaje de error ahora lista campos específicos que fallan validación.
- TRM fallback en `buildDefaults` cuando `rates.trm` es 0 (loading).

### Feature: Soporte PDF en OCR ✅
- OCR endpoint acepta `application/pdf` además de imágenes.
- Claude API usa `document` type para PDFs, `image` type para imágenes.
- OpenAI usa `file` type para PDFs, `image_url` para imágenes.
- `ocr.ts` preserva extensión correcta (pdf/png/webp/jpg) al subir a R2.

### Migraciones aplicadas
```
0010_account_id            → account_id en transactions (2026-05-17)
```

---

## Phase C · Deploy Worker + SPA assets (2026-06-07)

Migrated from Cloudflare Pages (`pages_build_output_dir`) to a single Worker that serves the Hono API and the built SPA (same pattern as TimeFlow/trakll).

### Wrangler

- Config: `wrangler.jsonc` (replaces `wrangler.toml`)
- Entry: `src/worker.ts` → shared Hono app in `src/server/app.ts`
- Assets: `dist/` with `run_worker_first: ["/api/*"]` and SPA fallback for client routes
- Bindings: D1 `DB`, R2 `FILES`, static `ASSETS`

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:all` | Local full stack (wrangler :8787 + vite :5173, `/api` proxied) |
| `npm run dev:api` | API only (`wrangler dev`) |
| `npm run dev` | Frontend only (needs `dev:api` in another terminal for `/api`) |
| `npm run build` | Typecheck + Vite → `dist/` |
| `npm run release` | `build` + `wrangler deploy` (no GitHub required) |
| `npm run db:migrate:remote` | Apply D1 migrations to production |

### First-time / secrets

1. Copy `.dev.vars` for local (`CLERK_SECRET_KEY`, optional `ANTHROPIC_API_KEY`).
2. Set production secrets: `npx wrangler secret put CLERK_SECRET_KEY` (and `ANTHROPIC_API_KEY` if using server OCR).
3. `npx wrangler login` if not already authenticated.
4. After schema changes: `npm run db:migrate:remote` before or right after deploy.

### Pages → Worker migration (one-time)

1. Deploy with `npm run release` and verify `curl -s -o /dev/null -w "%{http_code}\n" https://<worker-url>/api/health` → `200`.
2. Point custom domain (if any) from Pages to the Worker in Cloudflare dashboard.
3. Disable Pages auto-deploy from GitHub when the Worker URL is confirmed (optional rollback: re-enable Pages).

`functions/api/[[route]].ts` remains a thin Pages Functions shim importing `src/server/app.ts` for reference only; production uses `src/worker.ts`.

---

## Sesiones previas

Las sesiones 1 a 3 cerraron Bugs A y B y dejaron la app funcional para uso diario. Detalles históricos en handoffs V1-V4 (archivados).
