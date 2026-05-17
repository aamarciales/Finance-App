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

### Bundle size index-*.js >500kB
- Vite warnea bundle grande. Code splitting parcial ya hecho (commit `1992c9a`). Próximo paso: dynamic import() de rutas pesadas (/diezmos, /analisis) o ajustar chunkSizeWarningLimit si se considera aceptable.

---

## Features (no críticas)

### Mejora UX · Acceso a OCR desde puntos naturales (no en página separada)
- Contexto: hoy el OCR vive solo en `/import`, escondido como destino aparte. El usuario que quiere agregar una factura escaneada tiene que salir del flujo natural ("Nueva factura") y navegar a otra página. Fricción innecesaria.
- Decisiones de producto tomadas (2026-05-17):
  1. `/import` se elimina del menú principal. La página queda viva temporalmente solo accesible por URL directa para CSV bulk import. Eliminar del todo cuando CSV tenga mejor flujo propio.
  2. Modal con opciones grandes (no dropdown, no FAB). Mejor experiencia móvil. Cards tocables.
  3. OCR en "Nueva transacción" pregunta tipo de guardado al final: después de escanear y revisar, modal "¿Cómo guardar esta info?" con 2 opciones:
     - Como factura completa (invoice + items + transacción) → flujo actual
     - Como transacción simple (solo monto, fecha, categoría, sin items) → nuevo flujo
- Flujo final deseado:
  - `/transactions` → botón `+ Nueva transacción` → modal con 3 cards:
    - 📸 Tomar foto (camera capture, móvil)
    - 🖼️ Subir imagen (file picker)
    - ✏️ Entrada manual (form actual)
  - `/invoices` → botón `+ Nueva factura` → mismo modal con mismas 3 opciones
  - Foto/imagen → OCR → OcrPreviewDialog → pregunta tipo guardado → persiste según elección
- Cambios técnicos:
  - Nuevo componente `<CreateMenu>` reutilizable con las 3 cards (modal pequeño)
  - Lifting de estado del OcrPreviewDialog desde Import.tsx hacia los dos puntos de entrada nuevos
  - Nuevo paso al final del OCR dialog: "Guardar como factura / Guardar como transacción"
  - Nuevo handler que crea solo transacción (sin invoice ni invoice_items) cuando aplica
  - MainNav: quitar link a /import
- Esfuerzo: 1.5-2h. Sesión dedicada.
- Dependencias: ninguna.

### OCR centralizado con API key del owner (modelo híbrido)
- Hoy cada usuario configura su propia API key de OpenAI / Gemini / Claude en Settings. Visión: que el usuario no sepa nada del OCR, solo escanear y funcione.
- Modelo: híbrido. La key OpenAI del owner corre el OCR de todos por default. Opción BYOK queda como avanzado para power users.
- Key del owner vive en Cloudflare Pages secrets (NO en código, NO en cliente, NO en D1).
- Provider default: OpenAI gpt-4.1-mini.
- Rate limiting (no opcional):
  - Por usuario: 30 OCRs/día (counter en D1 con reset diario UTC)
  - Global: 1000 OCRs/día (kill switch si se rompe)
  - Si se pasa el límite global, OCR se apaga hasta el día siguiente. UI muestra "Servicio temporalmente no disponible".
- Cambios técnicos:
  - Tabla nueva `ocr_usage` (userId, date, count) o columna en `settings`.
  - Endpoint `/api/files/ocr` lee `c.env.OPENAI_API_KEY` por default. Solo si el usuario tiene `openaiApiKey` propia en settings y eligió BYOK, usa la suya.
  - Settings: opción "Usar mi propia API key (avanzado)" oculta por default. La mayoría de usuarios no la ven.
  - Validar antes de cada OCR: ¿user.count < 30? ¿global.count < 1000?
  - Incrementar counters después de OCR exitoso (no en fallos).
- Riesgos a manejar:
  - Si la cuenta OpenAI del owner se queda sin saldo, el OCR se rompe para todos.
  - Alerta cuando el global llegue a 80% (800 OCRs en el día).
  - Si la app crece a >100 usuarios activos, evaluar Stripe o modelo freemium.
- Esfuerzo: 1.5-2h. Sesión dedicada.
- Decisión pendiente: ¿comportamiento si usuario llega a 30/día? ¿Bloqueo total, o fallback a "configura tu propia key para más"?

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
- **Página `/import` accesible solo por URL después de UX rework**: cuando se implemente "Mejora UX · Acceso a OCR desde puntos naturales", esta página se queda solo para CSV bulk import. Plan futuro: rediseñarla solo para CSV o eliminarla del todo si CSV tiene mejor flujo propio.
