# Patrimonio · TODO

> Pendientes vivos. Items resueltos se mueven a `PROGRESS.md`.
> Prioridad: bloqueante / importante / mejora

---

## 🔴 Bugs bloqueantes (afectan uso normal)

### Bug C · Cálculo de ofrenda no aplica el porcentaje configurado
- **Síntoma**: en el wizard de pago internacional paso 5, el resumen muestra "Diezmo a apartar (15%): USD 14.80" y "Ofrenda a apartar (0%): USD 0.00" para una categoría Freelance que en Settings está configurada como 10% diezmo + 10% ofrenda. El diezmo se calcula bien (10% de USD 148 = USD 14.80) pero la ofrenda siempre da 0% / USD 0.
- **Adicional**: el dashboard también dice "Freelance · 10% + 0%" en la card de Diezmo & Ofrendas. Misma ofrenda perdida.
- **Configuración correcta deseada según Andrés**: 
  - Todas las categorías de ingreso (incluida Freelance, Otros ingresos): 10% diezmo + 10% ofrenda.
  - Sueldo: 10% diezmo + 5% ofrenda.
- **Hipótesis**: el cálculo en `src/lib/tithe.ts` (`calculateTitheForIncome`) probablemente lee `tithePercentByIncomeCategory[catId].tithe` pero se le olvida `[catId].offering`, o lee mal la estructura. El UI de settings sí guarda el valor (se ve correcto en la card de Diezmo & Ofrendas), pero el cálculo lo ignora.
- **Cómo investigar**: `grep -rn "calculateTitheForIncome\|offering\|ofrenda" src/lib/tithe.ts src/components/transactions/IntlPaymentWizard.tsx`.
- **Impacto emocional alto**: la app es central para Andrés porque calcula diezmo correctamente. Una ofrenda mal calculada distorsiona los números espirituales.

### Bug D · Lista de transacciones no se refresca tras crear nueva transacción
- **Síntoma**: tras completar el wizard de pago internacional y crear las transacciones, la página `/transactions` no muestra las nuevas filas. Hay que recargar manualmente con F5 para verlas.
- **Hipótesis**: TanStack Query no está invalidando la query de `transactions` cuando se ejecuta el mutation de creación múltiple. Probablemente falta `queryClient.invalidateQueries({ queryKey: ['transactions'] })` en el `onSuccess` del mutation, o el wizard usa un endpoint que no dispara la invalidación.
- **Cómo investigar**: ubicar el mutation de creación múltiple en el wizard y verificar el `onSuccess` / `onSettled`. Probablemente en `IntlPaymentWizard.tsx` o en `useTransactions.ts`. Comparar con el flujo del modal normal de "Nueva transacción" que sí refresca bien.
- **Impacto**: rompe el feedback loop básico. Andrés crea algo y no lo ve, no sabe si funcionó.

### Bug E · Colores editados de categorías no se reflejan en badges de la tabla
- **Síntoma**: Andrés edita el color de una categoría en `/categorias`. Vuelve a `/transactions` y los badges de esa categoría siguen mostrando el color viejo. Incluso tras refrescar.
- **Hipótesis A**: el badge en `TransactionsTable.tsx` lee el color de un campo cacheado/derivado en la fila de transacción en lugar de leerlo en vivo de la categoría.
- **Hipótesis B**: el endpoint que actualiza categorías no invalida correctamente la query de transactions enriquecidas.
- **Cómo investigar**: `grep -rn "category.color\|categoryColor\|c.color" src/components/transactions/`.
- **Impacto**: bajo funcionalmente, alto en sensación de control. Andrés siente que la app no le obedece.

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

### Mejoras UX wizard pago internacional
- **Síntoma**: en el paso 5 del wizard, el botón "Crear todas las transacciones" es tan largo que genera scroll horizontal dentro del modal. El botón "Atrás" está al lado, ocupando footer junto con Cancelar.
- **Propuesta de Andrés**: 
  - Mover el botón "Atrás" a la esquina superior izquierda del modal, solo ícono `<ChevronLeft />` cuadrado, sin texto. Liberar el footer.
  - Si el botón principal sigue siendo muy largo, ensanchar todos los modales del wizard (medida acordada).
- **Aplicable a otros modales si conviene**: si la decisión es ensanchar, hacerlo de forma consistente.

### Tabs temporales en Dashboard
- **Contexto**: hoy el dashboard muestra solo el mes en curso. Andrés quiere poder cambiar la vista temporal con tabs.
- **Tabs deseados**: Mensual (default) / Semanal / Trimestral / Semestral / Anual / 5 años / Desde el inicio.
- **Cambios técnicos**: parametrizar `useDashboard.ts` para que acepte un rango temporal en lugar de hardcodear "este mes". Adaptar KPIs, gráfica de tendencia y card de Diezmo & Ofrendas para respetar el rango seleccionado. La card "Pendiente de devolver / entregar" puede que tenga sentido siempre como acumulado (no parametrizable) o siempre como mes actual; decisión de producto pendiente.
- **Esfuerzo estimado**: 2-3h. Refactor de hook + UI de tabs + decisiones de producto sobre qué KPIs son temporales y cuáles acumulados.

---

## Features (no críticas)

### Sistema operativo de Diezmos y Ofrendas con compromisos, soportes y deuda histórica
- **Contexto**: la página `/diezmos` actual es solo un dashboard de lectura (KPIs y desglose por categoría). Andrés necesita que sea una herramienta operativa para administrar el ciclo completo: compromiso generado por ingreso → marcado como entregado → soporte adjunto → registro automático en transacciones generales.
- **Visión completa del flujo deseado**:
  1. Cuando se registra un ingreso, la app genera automáticamente un compromiso de diezmo + ofrenda según los porcentajes configurados. El compromiso queda como pendiente, no se crea transacción todavía.
  2. La página `/diezmos` muestra los compromisos pendientes como lista marcable (tipo checklist), agrupados por mes o por ingreso fuente.
  3. Cuando Andrés va a la iglesia y entrega el diezmo, abre la lista, marca los compromisos que cubrió con ese pago, sube el soporte (foto del recibo, transferencia, captura). Esto dispara:
     - Crear transacción tipo gasto categoría Diezmo y/o Ofrendas con el monto correcto.
     - Marcar los compromisos seleccionados como "entregado".
     - Adjuntar el soporte tanto al compromiso como a la transacción generada.
     - Refrescar la card de Diezmo & Ofrendas del dashboard.
  4. Andrés puede registrar deuda histórica espiritual que arrastra desde antes de instalar la app (ejemplo real: USD 150 diezmo + USD 150 ofrenda). Esa deuda no genera compromisos automáticos pero se ve como saldo pendiente.
  5. Andrés puede hacer abonos parciales a esa deuda histórica subiendo soportes. Cada abono reduce la deuda y queda registrado.
- **Cambios técnicos estimados**:
  - Nueva tabla `tithe_commitments` (id, userId, sourceTransactionId, type 'tithe' | 'offering', amount, currency, status 'pending' | 'paid', settledAt, settledTransactionId, supportAttachmentId, createdAt).
  - Nueva tabla `tithe_historical_debt` o reutilizar `debts` con un flag `isSpiritual` (id, userId, type 'tithe' | 'offering', initialAmount, currentBalance, currency, notes, createdAt).
  - Generación automática de compromisos al crear un ingreso (post-mutation hook en backend o trigger en frontend).
  - Página `/diezmos` reescrita: dashboard de lectura + lista accionable + sección de deuda histórica.
  - Flujo de "marcar como entregado": modal que permite seleccionar 1+ compromisos, ingresar monto entregado, subir soporte, confirmar. Genera transacción.
  - Adaptar la card del dashboard para reflejar el estado real (compromisos vs entregado vs deuda histórica).
- **Esfuerzo estimado**: 3-5 horas de trabajo concentrado. Sesión dedicada.
- **Decisiones de producto pendientes** (Andrés debe contestar antes de implementar):
  1. **Un pago de diezmo cubre uno o varios compromisos**: cuando Andrés entrega la suma de varios meses o varios ingresos en un solo pago, ¿la UI debe permitir marcar varios compromisos como cubiertos por una sola transacción? ¿O un pago = un compromiso?
  2. **Diezmo y ofrenda juntos o separados**: cuando se entrega el sobre con ambos en la iglesia, ¿es una sola transacción de gasto con desglose, o dos transacciones separadas?
  3. **Histórico de cumplimiento**: ¿quieres una vista de cumplimiento mensual ("en abril cumpliste 100%, en mayo vas 60%")?
  4. **Soportes (foto recibo, transferencia)**: ¿se adjuntan al compromiso, a la transacción generada, o a ambos? El sistema de adjuntos ya existe en la app (R2 + IndexedDB para Blobs), así que esa pieza no es nueva.
  5. **Deuda histórica**: ¿una sola entrada (USD 300 total) o cuotas con fechas (USD 150 enero + USD 150 febrero)?
- **Relación con Bug C**: Bug C es un fix puntual (porcentaje de ofrenda no se aplica al cálculo). Resolver Bug C primero deja la app calculando bien el "compromiso del mes" antes de meter el sistema operativo completo encima. Bug C es 30-60 min, este sistema es 3-5 horas.
- **Diferencia con tabla `debts`**: la deuda espiritual es conceptualmente distinta de una deuda financiera (no tiene intereses, no tiene plazo de vencimiento estricto, no se le aplican comisiones bancarias). Reutilizar la tabla con un flag puede generar confusión en reportes, así que evaluar si conviene tabla separada.

### Sistema de Clientes para ingresos Freelance
- **Contexto**: Andrés trabaja como freelance con varios clientes recurrentes. Hoy escribe el nombre del cliente en el campo "Concepto" como texto libre. No hay forma de filtrar pagos por cliente, ver el historial de un cliente, o adjuntar facturas/soportes a un cliente específico.
- **Decisión de producto**: cuando la categoría de un ingreso es "Freelance" (o cualquier categoría que se marque como "asociada a clientes" en el futuro), el campo "Concepto" del form se reemplaza por un selector "Cliente" que permite:
  - Elegir un cliente existente.
  - Crear un cliente nuevo inline.
- **Sección `/clientes`**: nueva ruta para administrar clientes (CRUD). Cada cliente tiene perfil con:
  - Datos básicos (nombre, contacto, notas).
  - Lista de todos los pagos recibidos (transactions con `clientId === clienteActual`).
  - Facturas asociadas.
  - Soportes adjuntos.
- **Reordenar form de transacción**: que la categoría se elija antes que el concepto, para que el campo cambie dinámicamente según la categoría.
- **Cambios técnicos**:
  - Nueva tabla D1 `clients` (id, userId, name, contactInfo, notes, createdAt, updatedAt).
  - Nueva columna `clientId` en `transactions` (foreign key opcional).
  - Mismo patrón en `invoices` para asociar facturas a clientes.
  - Nuevo CRUD endpoint en `functions/api/clients`.
  - Nueva página `/clientes` con lista + detalle.
  - Modificar `TxFormDialog` para renderizar Cliente vs Concepto según categoría.
- **Esfuerzo estimado**: 4-6 horas. No se puede meter en una sesión que también haga otra cosa.
- **Decisión de producto pendiente** (no responder ahora, antes de implementar):
  - ¿Un cliente puede asociarse a múltiples categorías de ingreso, o solo a Freelance?
  - ¿Quieres reportes agregados por cliente (ingresos del año, top clientes, etc)?

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
- **Categoría "Cobro deuda" (id 51) sin diezmo**: decisión de sesión 3. Cuando alguien le devuelve a Andrés un préstamo, no es ingreso nuevo. La categoría existe en D1 y se usa para registrar ingresos, pero NO debe estar en `tithePercentByIncomeCategory`. Hoy se removió manualmente con SQL directo. Si en el futuro se hace wipe + reseed de categorías sistema, hay que volver a removerla manualmente o automatizarlo (ver Bug C parte 2 pendiente para protección automática).
