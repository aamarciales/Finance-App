# Patrimonio · TODO

> Pendientes vivos. Items resueltos están en `PROGRESS.md`.
> Última actualización: 2026-05-17

---

## Importante (funcional pero deuda real)

### Soporte de moneda PEN (soles peruanos)
- Contexto: cuenta BCP Perú con saldos PEN/USD. Hoy se trata como USD usando tasa PEN/USD del día.
- Cuándo agregar nativo: si la frecuencia de transacciones PEN supera ~5/mes.
- Costo: ~2-4h. Cambios en enum schema (frontend + drizzle), forex_rates, dropdowns de moneda, getEquivalentAmounts, convertAmount.

### Enum Drizzle no se enforce en runtime
- `currency` está tipado como `enum: ['COP','USD','EUR']` pero D1 aceptó `'PEN'` literal en INSERT sin error.
- Causa: SQLite no soporta CHECK constraints automáticos desde Drizzle. El enum solo es validación TypeScript.
- Fix: CHECK constraint manual en migración, o validar en backend route con zod antes del insert.

### Bulk insert en CSV import
- 128 POSTs serializados (~15-30 segundos). Endpoint `/transactions/bulk` con `db.batch()` o `db.insert().values([...])` lo bajaría a ~2-3 segundos.

### Atomicidad de wipe-my-data
- 8 queries DELETE secuenciales. Si una falla a la mitad, queda estado inconsistente. Migrar a `db.batch([...])` para atomicidad.

### Migrar de @hono/clerk-auth a @clerk/hono
- El primero está deprecado.

### Botón "Borrar datos" con confirmación typed
- Hoy es AlertDialog sí/no. Pedir que escriba "BORRAR" para reducir riesgo de click accidental.

---

## Features (no críticas)

### Flujo B · OCR de comprobantes de ingreso (Mercury, Wise, vouchers)
- Hoy el OCR trata todo como factura de gasto. Recibos Mercury / Wise / vouchers freelance deberían crear transacciones de ingreso con compromiso de diezmo asociado automático.
- Cambios técnicos:
  - Detección de tipo de documento ("¿es factura comercial o voucher de ingreso?")
  - Nuevo prompt o nuevo modo en el prompt actual
  - Handler que cree Income transaction + tithe_commitment auto (el sistema F2 ya soporta esto)
  - Nueva UI de preview: "Detecté un ingreso de $148 USD de Designstream LLC, ¿confirmas?"
- Decisiones de producto pendientes:
  1. ¿La detección es automática (el OCR decide) o el usuario elige al subir (gasto vs ingreso)?
  2. Si es automática, ¿qué pasa si el modelo se equivoca?
  3. ¿Soportes Mercury / Wise generan compromiso de diezmo automático o solo si la categoría es Freelance/Sueldo?
- Esfuerzo: 2-4h. Sesión dedicada.

### Sistema de Clientes para ingresos Freelance
- Contexto: Andrés trabaja con varios clientes recurrentes. Hoy el nombre del cliente va en el campo "Concepto" como texto libre. No hay forma de filtrar pagos por cliente.
- Decisión de producto: cuando la categoría es Freelance, el campo "Concepto" se reemplaza por un selector "Cliente" con creación inline.
- Sección /clientes nueva: CRUD con perfil (nombre, contacto, notas), lista de pagos recibidos, facturas asociadas, soportes adjuntos.
- Cambios técnicos:
  - Nueva tabla `clients` (id, userId, name, contactInfo, notes, timestamps)
  - Nueva columna `clientId` en transactions (FK opcional)
  - Mismo patrón en invoices
  - CRUD endpoint en functions/api/clients
  - Nueva página /clientes
  - Modificar TxFormDialog para renderizar Cliente vs Concepto según categoría
- Esfuerzo: 4-6h. Sesión dedicada.
- Decisiones de producto pendientes:
  - ¿Un cliente puede asociarse a múltiples categorías de ingreso o solo Freelance?
  - ¿Reportes agregados por cliente (ingresos del año, top clientes)?

### Subcategorías en /analisis (sesión dedicada futura)
- Idea: que /analisis use Categoría → Subcategoría para análisis granular (ej. Supermercado · Lácteos = $X/mes; Comida fuera · Almuerzo trabajo = $Y/mes).
- Hoy la columna `invoice_items.sub_category` existe pero está huérfana (OCR no la rellena, /analisis no la consume). La UI de Subcategoría se quitó del OCR dialog el 2026-05-17 para evitar confusión.
- Preguntas de producto antes de construir:
  1. ¿Subcategorías libres (texto que el usuario escribe) o catálogo fijo por categoría (Supermercado → Lácteos/Aseo/Bebidas/...)?
  2. ¿El OCR debería sugerir subcategorías o deja vacío y el usuario completa?
  3. ¿La subcategoría aplica a invoice_items solamente o también a transacciones sueltas?
  4. ¿/analisis muestra árbol jerárquico (Categoría que se expande a Subcategorías) o gráfico aparte?
  5. ¿Qué pasa con transacciones históricas sin subcategoría? ¿"Sin clasificar" o se omiten?
- Cambios técnicos: prompt OCR ampliado, useAnalytics agrupa por categoría + subcategoría, UI nueva en /analisis, catálogo de subcategorías sistema si optas por catálogo fijo, rehabilitar columna SUBCATEGORÍA en OcrPreviewDialog.
- Esfuerzo: 3-4h. Sesión dedicada.

### Pago internacional · agregar GrabrFi como opción
- Plenti ya integrado en commit `e5ac58b`. Wise también. Falta GrabrFi.

### Snapshots / historial de la BD
- Botón "Hacer snapshot ahora" → export comprimido en R2. Después automatizar con cron worker. Útil antes de imports grandes.

### Botón Undo (Cmd+Z)
- Schema `AuditLogEntry` ya tipado en `src/types/domain.ts`. Tabla `audit_log` no creada en D1.
- Implementación: crear tabla → escribir desde cada CUD → botón "Deshacer última acción" + atajo Cmd+Z.

### Verificar UVT 2026 en src/lib/tax-co.ts
- Tax compliance Colombia. Cambia anualmente. Hay TODO en línea 5 del archivo.

### Integrar dinero.js en src/lib/format.ts
- TODO en línea 9. Hoy formateo de dinero es manual. Migrar a dinero.js daría más robustez.

---

## Limpieza

- **user_test en D1**: residuo de tests. Borrar con SQL directo cuando convenga.
- **Categoría "Cobro deuda" (id 51) sin diezmo**: removida manualmente con SQL en sesión 3. Si se hace wipe + reseed, hay que volver a removerla. El warn defensivo en `tithe.ts` ya protege contra ID huérfano, pero no contra que vuelva a aparecer en titheConfig.
- **Otra categoría custom "Iglesia" (id 55)**: sin uso. Borrar cuando convenga.
