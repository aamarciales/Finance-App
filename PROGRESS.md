# Patrimonio · PROGRESS

> Bitácora de avances. Items resueltos se mueven aquí desde TODO.md.

---

## Fase de estabilización post-handoff V4 (2026-05-15 → 2026-05-17)

57+ commits entre `4765463` (cierre handoff V4) y `1f41dbe`.

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

**Bugs OCR (descuento + soporte + subcategoría)** (2026-05-17)
- Tres fixes en una iteración:
  - Total de la factura ahora resta el descuento. Antes `total = sum(items.quantity * items.price)` ignoraba `result.discount`. Ahora `total = Math.max(0, itemsTotal - discount)`.
  - Soporte de la factura se adjunta correctamente. El OCR endpoint ya subía la imagen a R2 (`files.ts:404`), ahora la URL fluye al invoice vía `attachmentUrl` en lugar de re-upload del blob desde `OcrPreviewDialog`. `Import.tsx → handleSaveInvoice` ahora recibe y pasa attachmentUrl a addInvoice.
  - Columna SUBCATEGORÍA quitada del OCR dialog. Feature parcial (la columna en BD existe, CSV import y InvoiceDetailModal la usan; el OCR nunca la llenaba). Hoy oculta solo en OCR dialog. Backlog para sesión dedicada de Subcategorías en /analisis.

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
- OpenAI gpt-4.1-mini (user API key, actualizado 2026-05-17 desde gpt-4o-mini).
- max_tokens subido a 4096 (antes 1024 truncaba recibos largos de 30+ items).
- Prompt actualizado con manejo de formato colombiano (punto como miles), descuentos, validación interna, casos especiales (manuscritos, servicios, IVA).
- Post-validation server-side calcula `realConfidence` independiente de lo que diga el modelo. Tres niveles: high / medium / low.
- UI con badge basado en realConfidence (Validado / Revisar montos / Revisión obligatoria) + banner de warning si low confidence.

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
```

### Estado en producción al cierre (2026-05-17)

User `user_3DEHVwNjURaZfTfhcPTS0rNLOer`:
- 80 transacciones (antes: 9)
- 23 categorías (antes: ~12)
- 12 facturas + 114 invoice_items
- 14 tithe_commitments + 3 tithe_payments + 9 commitment_payments
- 3 debts, 1 goal, 6 settings rows (added: ocrProvider, geminiApiKey/openaiApiKey, capitalAccounts)

---

## Sesiones previas

Las sesiones 1 a 3 cerraron Bugs A y B y dejaron la app funcional para uso diario. Detalles históricos en handoffs V1-V4 (archivados).
