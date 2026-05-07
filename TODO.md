# Patrimonio · TODO

> Pendientes vivos. Items resueltos se mueven a `PROGRESS.md`.
> Prioridad: bloqueante / importante / mejora

---

## Bugs bloqueantes (afectan uso normal)

### Bug B · Crash en "Recibir pago internacional"
- **Síntoma**: en `/pago internacional` paso 4 ("Cambio de moneda"), al marcar "¿Cambiaste a otra moneda?" e ingresar un monto recibido en COP, al apretar "Siguiente" se rompe con:
```
  TypeError: r.trm.toFixed is not a function
```
- **Hipótesis**: el código está llamando `.toFixed()` sobre algo que no es número. Probablemente la TRM viene como string del store, o se calcula como ratio entre dos campos que devuelven `NaN`/`undefined`.
- **Cómo investigar**: buscar `trm.toFixed` y similares en `src/`, mirar de dónde viene `r.trm` en ese flujo. La stack apunta a `useMemo` así que la TRM derivada vive en un memoized selector.

---

## Importante (funcional pero deuda real)

### Soporte de moneda PEN (soles peruanos)
- **Contexto**: Andrés tiene cuenta BCP Perú con saldos en PEN y USD. Una factura del CSV (Google One AI Pro) era en soles. Hoy la app no la soporta.
- **Decisión actual**: tratar transacciones PEN como USD usando la tasa PEN/USD del día.
- **Cuándo agregar PEN nativo**: cuando la frecuencia de transacciones PEN supere ~5/mes o haya varias cuentas activas en soles.
- **Costo si se agrega**: ~2-4h. Cambios: enum schema (frontend + drizzle), campo `penToUsd` en `forex_rates` y fetch diario, opción en dropdowns de moneda, lógica en `getEquivalentAmounts` y `convertAmount`.

### Enum de Drizzle no se enforce en runtime
- **Síntoma**: `currency` está tipado como `enum: ['COP','USD','EUR']` en el schema, pero D1 aceptó `'PEN'` literal en el INSERT sin error.
- **Causa**: SQLite no soporta CHECK constraints automáticos desde Drizzle. El enum solo es validación TypeScript.
- **Fix**: agregar CHECK constraint manual en migración:
```sql
  ALTER TABLE transactions ADD CONSTRAINT chk_currency CHECK (currency IN ('COP','USD','EUR'));
```
  O validar en backend route antes del insert con zod.
- **Dependencia**: si se agrega PEN como moneda nativa, actualizar también este check.

### Bulk insert en CSV import
- Hoy el import hace 128 POSTs serializados (~15-30 segundos). Endpoint `/transactions/bulk` con `db.batch()` o `db.insert().values([...])` lo bajaría a ~2-3 segundos.

### Atomicidad de `wipe-my-data`
- Hoy las 8 queries DELETE son secuenciales. Si una falla a la mitad, queda estado inconsistente. Migrar a `db.batch([...])` para atomicidad.

### Migrar de `@hono/clerk-auth` a `@clerk/hono`
- El primero está deprecado.

### Botón "Borrar datos" con confirmación typed
- Hoy es solo AlertDialog sí/no. Pedir que escriba "BORRAR" para reducir riesgo de click accidental.

---

## Features (no críticas)

### Pago internacional · agregar Plenti y GrabrFi como opciones
- Hoy hay Wise. Andrés usa Plenti (USD->COP) y a veces GrabrFi.
- Esperar a que Bug B esté resuelto antes de tocar este flujo.

### Color picker para categorías
- Hoy las nuevas usan paleta cíclica de 8 colores. Permitir elegir color e ícono al crear/editar.

### Card "Diezmos & Ofrendas" en Dashboard
- Actualmente no existe. Render condicional cuando hay ingresos > 0 ese mes.

### Subcategorías a nivel de transacción
- Hoy solo existen en `invoice_items`. Andrés quiere taggear gastos dentro de "Mercado" por tipo de producto (Galletas, Detergente, Higiene). Cambio de modelo: tabla nueva o sistema de tags. Discusión de producto pendiente.

### Snapshots / historial de la BD
- Botón "Hacer snapshot ahora" -> guarda export comprimido en R2. Después automatizar con cron worker. Útil antes de imports grandes.

### Botón Undo (Cmd+Z)
- Schema en `domain.ts` ya tiene tipo `AuditLogEntry` con `beforeState`/`afterState`/`isReverted`. Tabla `audit_log` no llegó a crearse en D1.
- Implementación: crear tabla -> escribir desde cada CUD -> botón "Deshacer última acción" + atajo Cmd+Z.

### OCR de tickets
- Mencionado en TODOs viejos del código (`src/lib/ocr.ts`). El usuario tiene PDFs de facturas (MasxMenos, Disney+, Canva, Google Play) que podrían parsearse a transacciones automáticas.

### Verificar UVT 2026 en `src/lib/tax-co.ts`
- Tax compliance Colombia. Cambia anualmente.

---

## Limpieza

- **`user_test` en D1**: residuo de tests, no afecta nada pero ensucia. Borrar con SQL directo.
- **`.claude/` untracked**: ya en `.gitignore` (resuelto en sesión 3).
- **Code splitting / chunk size**: Vite warnea bundle >500kB. Fase 8 del plan original.
