# Patrimonio · TODO

> Lista viva de pendientes. Actualizada al cierre de sesión 5 (2026-05-09).

---

## Bugs activos (ordenados por prioridad)

### Bug E · Colores editados de categorías no se reflejan en badges
**Síntoma**: editar color de categoría → badges en `/transactions` siguen con color anterior incluso tras refresh.
**Fix sugerido**: revisar cómo se construye la fila enriched en `useTransactions`. Probable lookup local con Map que no se actualiza.

### Bug C parte 2 · Defensiva titheConfig — no urgente
**Síntoma**: si los IDs en titheConfig quedan huérfanos (categoría borrada), la app silenciosamente cae al default.
**Fix**:
1. `src/lib/tithe.ts`: `console.warn` en dev cuando se cae al default por ID huérfano (con Set para no spamear).
2. `wipe-my-data` endpoint: ya borra settings, OK. Verificar que el seed después no deje IDs huérfanos en titheConfig.

---

## Backlog próximas sesiones

### Sesión 6 (corta, 2-3 h)
- [x] Bug H — cerrado sesión 6 (TRM corregida manualmente + guard backend)
- [x] Bug G — cerrado sesión 6 (InvoiceQuickView ahora hace fetch real)
- [x] Botón "Importar JSON" en /settings — cerrado sesión 6
- [ ] Bug D — cerrado sesión 6 (invalidateQueries)
- [x] Wizard UX — cerrado sesión 6 (back button en header, footer fijo, dialog centrado, botón confirmar acortado)
- [ ] Bug E — colores de categorías en badges
- [ ] Bug C2 — defensiva titheConfig

### Sesión 6.5 — Importar CSV a factura (importante, Andrés tiene varias facturas pendientes)
- [ ] Botón "Importar CSV" en `/invoices` (o wizard)
- [ ] Parsear CSV (papaparse ya está en el stack)
- [ ] Preview: mostrar items detectados, merchant, total, moneda
- [ ] Opción de marcar como factura (genera transacción total + items) o como transacciones sueltas
- [ ] Guard: validar TRM para filas COP antes de enviar
- [ ] Al guardar: crea invoice + items + transacción asociada (flujo existente de `useInvoices.addInvoice`)
- [ ] Invalidar queries de transacciones e invoices al terminar

### Sesión 7+ (sesión dedicada larga, 3-5 h cada una)
- [ ] **Sistema F2 — Diezmos & Ofrendas**: tabla `tithe_commitments`, página `/diezmos` reescrita, modal "registrar entrega". Antes de arrancar, responder por escrito las 5 preguntas de producto (ver más abajo).
- [ ] **Sistema F4 — Wallets/Cuentas**: tabla `accounts`, balances iniciales, FK en transacciones, conciliación. Migración del campo `paymentMethod` (string libre) a FK.
- [ ] **Sistema F5 — Pagos recurrentes**: tabla `subscriptions`, alertas, auto-creación de transacciones recurrentes.
- [ ] **Sistema F6 — Storage de attachments**: Cloudflare R2, viewer en popup de factura, export ZIP con archivos.
- [ ] **Sistema F-clientes** — solo si Andrés sigue activo y siente la fricción.

### Mejoras UX en cualquier momento
- [ ] Tabs temporales en Dashboard (mensual / semanal / trimestral / semestral / anual / 5 años / desde inicio).
- [ ] Botón "Atrás" del wizard como ícono cuadrado en superior izquierda en lugar de footer.
- [ ] Botón "Crear todas las transacciones" en wizard paso 5 muy largo, genera scroll horizontal.

### Mejoras técnicas
- [ ] Bundle splitting (warning Vite >500kB) — Fase 8.
- [ ] Migrar Clerk middleware deprecado (`@hono/clerk-auth`) a `@clerk/express` o equivalente moderno.

---

## Sistema operativo de Diezmos & Ofrendas (F2)

**Antes de empezar Sistema F2, responder por escrito**:

1. ¿Un pago de diezmo cubre uno o varios compromisos? (Si Andrés acumula durante 1-2 semanas y entrega todo junto, son varios.)
2. ¿Diezmo y ofrenda se registran juntos o separados cuando se entregan?
3. ¿Quieres histórico de cumplimiento mensual? (Vista tipo "% de compromisos cumplidos por mes").
4. ¿Soportes (foto recibo iglesia) se adjuntan al compromiso, a la transacción, o a ambos?
5. ¿Deuda histórica como una sola entrada o como cuotas con fechas?

**Resumen del flujo objetivo** (sujeto a las respuestas):
- Cada ingreso genera automáticamente un compromiso pendiente (no transacción todavía).
- Página `/diezmos` muestra checklist de compromisos pendientes.
- Modal "registrar entrega": seleccionar 1+ compromisos, ingresar monto, subir soporte. Genera UNA transacción de gasto (Diezmo y/o Ofrenda) y marca compromisos como entregados.
- Sección aparte de "Deuda histórica espiritual" para arrastrar saldos pre-app, con abonos parciales.

**Cambios técnicos previstos**:
- Nueva tabla `tithe_commitments` (incomeTransactionId, type tithe/offering, amount, status pending/paid, paymentTransactionId).
- Nueva tabla `tithe_historical_debt` (o flag isSpiritual en `debts`).
- Página `/diezmos` reescrita.
- Adaptar dashboard para mostrar pendiente real, no calculado desde transacciones.

---

## Decisiones tomadas que la próxima sesión debe respetar

Ver sección 2 del `PATRIMONIO-HANDOFF-V5.md`.

---

## Lecciones técnicas

Ver sección 8 del `PATRIMONIO-HANDOFF-V5.md`.

---

**Fin del TODO.**
