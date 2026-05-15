# Patrimonio · Handoff sesión 5

> Para la nueva instancia de Claude (cualquier modelo, cualquier herramienta): lee este MD entero antes de responder. Lee también los archivos en `.patrimonio-agent/` que están versionados en el repo. Continuación de sesión 4.

---

## 1. Quién soy y cómo trabajo

**Andrés** — freelancer venezolano residente en Bogotá. Trabaja en BRIX Templates (Webflow) y otros clientes freelance. Stack: Node.js, React, Webflow, Framer, Cloudflare Workers. Adventista del séptimo día (devuelve diezmo, no lo "da"). Nivel técnico alto. No es contador.

**Cómo trabajar conmigo:**
- Par técnico, no soporte. Honestidad sobre tradeoffs y errores.
- Cuando me des opciones, **da una recomendación clara** ("yo iría por X porque...").
- Plan antes de código en cambios grandes.
- No commits sin verificación visual mía.
- Bloques pequeños con `npm run build` después de cada uno.
- Conversación contigo en español. Prompts para Claude Code en inglés y en MD sin íconos.
- No repitas lo que ya sé.
- Cuando me hagas preguntas estructuradas usa `ask_user_input_v0` si están disponibles los botones tappables.
- **Antes de asumir cómo funciona la app, pídeme grep o lee `.patrimonio-agent/`**. No inventes endpoints, schemas ni nombres de campos.

---

## 2. Estado de la app al cerrar sesión 5

### Lo que se hizo en sesión 5

- **Bug F cerrado**: el endpoint de export JSON tenía las claves cruzadas (`categories` aparecían bajo `invoices`). Arreglado en `src/pages/Settings.tsx` reordenando el array `labels`.
- **Schema invoices/invoice_items expandido**: agregadas columnas `invoice_number`, `payment_method`, `location`, `notes`, `attachment_url` (en invoices) y `barcode` (en invoice_items). Migración `0002_certain_felicia_hardy.sql` aplicada en remote.
- **Catálogo de categorías sistema reescrito**: pasamos de 23 categorías mal nombradas a 22 limpias (Supermercado, Comida fuera, Vivienda, Servicios, Suscripciones, Transporte, Salud, Educación, Hogar, Cuidado personal, Diezmo y Ofrenda, Deuda, Impuestos, Comisiones bancarias, Mascotas, Otros, Sueldo, Freelance, Adelanto, Cobro deuda, Otros ingresos, Transferencias). Actualizado en `src/server/routes/admin.ts` SYSTEM_CATEGORIES.
- **Endpoint nuevo `/api/admin/import-bulk`**: hace wipe + seed + crea categorías custom + deudas + transacciones + facturas con items + settings, todo en una sola request HTTP. Nació porque el script Python original con 140+ requests en serie chocaba con expiración de token Clerk (~1 min).
- **Import inicial completado**: 22 categorías, 3 deudas, 45 transacciones sueltas, 8 facturas con 83 ítems. Settings.titheConfig con 5 categorías mapeadas a IDs reales.

### Bugs vivos al cerrar sesión 5

- **Bug C parte 2** (defensiva): código no avisa cuando hay IDs huérfanos en titheConfig. Pospuesto.
- **Bug D**: lista de transacciones no se refresca tras crear vía wizard de pago internacional. Pospuesto.
- **Bug E**: colores editados de categorías no se reflejan en badges de la tabla. Pospuesto.
- **Bug G** (descubierto sesión 5, ALTA prioridad): "Ver factura" en `/transactions` lanza `Cannot read properties of undefined (reading 'length')`. Bloquea el flujo factura completo. Probablemente el handler accede a `invoice.items.length` antes de que `items` haya cargado en el estado del componente, o el endpoint de invoice no devuelve `items` embebidos. Necesita debug del componente que abre el popup desde la tabla.
- **Bug H** (descubierto sesión 5): después del import bulk, los `amountInBase` de las transacciones COP están MAL calculados porque se les asignó `trm=1` cuando el CSV no traía TRM. El valor correcto debería ser TRM real del día (~3.625 COP/USD para abril, ~3.747 para mayo). El usuario está corrigiéndolo manualmente vía SQL directo en D1 (ver `.patrimonio-agent/workflows/fix-trm-manual.md`). Una vez confirmado el fix, agregar al backend o al script de import una validación: si `currency=COP` y `trm<=1`, abortar con error.

### Decisiones de producto/diseño que la próxima sesión debe respetar

Heredadas de sesiones 3 y 4:
1. Categoría "Cobro deuda" NO genera diezmo (`tithe: 0, offering: 0` en titheConfig).
2. Diezmo y ofrenda se devuelven en bloque, no por ingreso individual. Justifica el sistema F2.
3. Deuda histórica espiritual NO entra en módulo `/debts` actual. F2 la maneja.
4. Schemas zod necesitan `.nullable()` cuando consumen datos de D1 (SQLite retorna null para columnas no seteadas), no solo `.optional()`.
5. APIs externos (datos.gov.co Socrata) pueden devolver números como strings. Coerción defensiva en el hook que envuelve el fetch.

Nuevas de sesión 5:
6. **Categoría sistema "Mascotas" custom**: incluida en el catálogo de 22. Andrés tiene gato.
7. **Modelo de facturas**: una invoice SIEMPRE tiene una transaction asociada (`invoices.transaction_id` es NOT NULL). El flujo es: crear transaction → crear invoice con `transactionId` → update transaction con `invoiceId` → crear items.
8. **Convención `paymentMethod`**: string libre con valores tipo "Wise", "Plenti", "Bancolombia", "Efectivo", "Tarjeta crédito X". Cuando se construya F4 (sistema de cuentas/wallets), estos strings se migran a FK de tabla `accounts`.
9. **Iglesia NO se trata como factura**: el CSV original tenía mismo `Numero_Factura` para Diezmo + Ofrenda del 2 mayo, pero conceptualmente son 2 transacciones separadas categoría "Diezmo y Ofrenda". El parser de import los excluye del agrupamiento factura.
10. **PEN currency NO está soportada por el schema** (enum solo COP/USD/EUR). Conversión: PEN → COP usando `Monto_COP` ya calculado en el CSV.
11. **Pérdidas y préstamos otorgados** van a categoría "Otros" (no son su propia categoría hoy). Cuando F4 traiga sistema de cuentas, los préstamos otorgados se pueden modelar como activos.

### Datos en D1 al cerrar sesión 5

User `user_3DEHVwNjURaZfTfhcPTS0rNLOer`:
- 22 categorías (todas sistema, isSystem=true) — del seed nuevo
- 3 deudas: Préstamo Tío Bairon (700→475 USD, 1/3 cuotas pagadas), Telefono Motorola Edge Fusion (421.586 COP), Tarjeta Crédito Nu Bank (1.011.537 COP)
- 53 transacciones (45 sueltas + 8 de facturas)
- 8 facturas Mas x Menos abril-mayo, con 83 ítems totales
- titheConfig con 5 categorías de ingreso mapeadas

Otros users (intactos, no tocar): `user_2t1aGZZoXbN1KjY6f0fN8fX7uB1`, `user_test`.

### Archivos generados en sesión 5 (vivos en /Users/andres/Downloads o donde los hayas movido)

- `csv_to_json.py` — convierte el CSV original al JSON canónico de import
- `import_bulk.py` — sube el JSON al endpoint `/api/admin/import-bulk` en una sola request
- `patrimonio-import-2026-05-09.json` — el JSON de import generado
- `patrimonio-backup-2026-05-09-fixed.json` — backup tras el fix de Bug F (puede usarse como rollback)
- `patrimonio-backup-2026-05-09__1_.json` — backup post-import (con bug de TRM)

Si los movió al repo, probablemente están en `tools/` o `scripts/`.

---

## 3. Stack y URLs (no cambió)

### Frontend
Vite + React 19 + TS strict, Tailwind v4 (CSS-first, sin tailwind.config.ts), shadcn/ui "nova", React Router v7, TanStack Query, Zustand, react-hook-form + zod v4, Recharts, lucide, date-fns (es), papaparse, framer-motion.

### Backend (Cloudflare)
- Pages auto-deploy desde `main`
- Pages Functions con Hono (`functions/api/[[route]].ts`)
- D1: `patrimonio-db` (id `60db20f5-1aa6-403c-90a6-69fc1e307913`)
- Drizzle ORM
- Clerk auth (`@hono/clerk-auth`, deprecado)

### URLs
- Producción: `https://finance-app-678.pages.dev`
- Repo: `https://github.com/aamarciales/Finance-App` rama `main`

### Tablas D1 confirmadas (10 columnas en invoices, 7 en invoice_items tras sesión 5)
`categories`, `debts`, `goals`, `invoices`, `invoice_items`, `settings`, `tithe_payments`, `transactions`. Schema completo en `src/server/schema.ts`.

### Filosofía de diseño
Minimalismo cálido tipo Mercury × revista financiera.
```
bg #fafaf7 · surface #ffffff · accent #2d4a3e · gold #b8923a · warm #c4621d · danger #a83e2b
```
Fraunces (titles), Geist (UI), JetBrains Mono (cifras).

---

## 4. Plan recomendado para sesión 6

### Bloque 1 — Cerrar Bug H (TRM mal calculada) (~30 min)

Si Andrés ya lo corrigió manualmente en D1, revisar en producción:
```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT id, concept, currency, amount, trm, amount_in_base FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 LIMIT 10;"
```

Si quedan filas con `trm<=1` en COP, falta corregirlas. Usar el SQL del workflow `fix-trm-manual.md`.

Después agregar guard al backend en POST `/transactions` y POST `/invoices`:
```ts
if (body.currency === 'COP' && (!body.trm || body.trm <= 1)) {
  return c.json({ error: 'TRM inválida para moneda COP' }, 400)
}
```

Y al endpoint `/admin/import-bulk` para abortar si llega trm=1 en filas COP.

### Bloque 2 — Cerrar Bug G (Ver factura crashea) (~45 min)

`Cannot read properties of undefined (reading 'length')` al abrir popup de factura. Investigación:

1. `grep -rn "items.length\|invoice.items" src/components/invoices/ src/pages/ src/hooks/`
2. Probable causa: el componente que renderiza el popup espera `invoice.items` pero el endpoint `GET /api/invoices/:id` (si existe) no devuelve items embebidos. Hay que cargar items aparte vía `GET /api/invoice-items?invoiceId=X` y guardarlos en estado.
3. Solución más limpia: extender `GET /api/invoices/:id` en `src/server/routes/invoices.ts` para que haga JOIN con invoice_items y devuelva el objeto enriquecido.

### Bloque 3 — Botón "Importar JSON" en Settings (~30 min)

Hoy el flujo de import es script Python con token sacado del navegador. Reemplazar por botón en `/settings`:
- File picker que acepta `.json`
- Lee el archivo en cliente, hace `POST /api/admin/import-bulk` con el body
- Toast de progreso (puede tardar 5-10 segundos en backend)
- Toast final con stats (`Importadas X transacciones, Y facturas, Z deudas`)

Spec completa en `.patrimonio-agent/specs/import-json-button.md`.

### Bloque 4 — Bug C parte 2 + D + E (~1.5 h)

Defensivos pospuestos. Trabajo de mantenimiento.

### Bloque 5 (sesión dedicada larga) — Sistema F2 (Diezmos)

NO empezar hasta que Andrés responda las 5 preguntas de producto que están en TODO.md sección "Sistema operativo de Diezmos & Ofrendas".

---

## 5. Comandos de diagnóstico

```bash
# Estado de git
git --no-pager log --oneline -5 && git status

# Tablas D1
npx wrangler d1 execute patrimonio-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Verificar bug H (TRMs mal en COP)
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"

# Conteos por tabla para Andrés
npx wrangler d1 execute patrimonio-db --remote --command="SELECT 'transactions' t, COUNT(*) n FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer') UNION ALL SELECT 'debts', COUNT(*) FROM debts WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'categories', COUNT(*) FROM categories WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer';"

# Schema actual (incluye columnas nuevas de sesión 5)
npx wrangler d1 execute patrimonio-db --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('invoices','invoice_items');"

# Logs en vivo del backend
npx wrangler pages deployment tail --project-name finance-app

# Diff sin pager
git --no-pager diff <archivo>
```

---

## 6. Cómo arrancar conmigo (sesión 6)

1. **Confirma brevemente** que leíste el handoff. No repitas el contenido.
2. **Lee también `.patrimonio-agent/CLAUDE.md`** (versionado en el repo). Tiene reglas operativas que aplican a todas las sesiones.
3. **Verifica el estado de git**: `git --no-pager log --oneline -5 && git status`. Espera commits limpios.
4. **Verifica si Bug H quedó corregido** con la query del Bloque 1 arriba. Si quedan filas con TRM mal, ese es el primer bloque a cerrar.
5. **Pregúntame qué quiero hacer hoy** y sugiere orden recomendado del Bloque 1 al 5.
6. **Si arranco con un bloque, dame los pasos concretos** antes de pedir a Claude Code.
7. **Si me ves saltando a Sistema F2 sin las 5 preguntas de producto**, avisa y para.

---

## 7. Lo que NO debe hacerse en sesión 6

1. No empezar Sistema F2 (Diezmos) sin las 5 respuestas de producto previas escritas.
2. No mezclar bugs con features grandes en una misma sesión.
3. No hacer scope creep en sesión: si durante verificación de un bug aparecen 4 nuevos issues, anotarlos en TODO y seguir.
4. No tocar otros users en D1.
5. No commits sin verificación visual.
6. No olvidar que pruebas end-to-end van contra producción después de push, no contra `npm run dev`.
7. **No asumir cómo funciona la app**. Si vas a editar X archivo, primero pide grep o léelo. Sesión 5 perdió tiempo asumiendo schemas que no eran.
8. **No usar `trm: 1` para transacciones COP**. Siempre TRM real del día.

---

## 8. Lecciones de sesión 5 (para no repetir)

- **TRM en transacciones COP**: el bug H pasó porque el script Python defaulteó `trm=1` cuando faltaba en el CSV. Lección: para una moneda secundaria, `trm=1` es matemáticamente imposible (significa paridad 1:1 con USD). Validar: si currency≠USD y trm≤1, abortar.
- **Token Clerk dura ~1 min**: el script original con 140+ requests en serie no funciona. Lección: para operaciones masivas, hacer **1 sola request** que dispare un endpoint backend que haga todo en su tiempo.
- **Cloudflare bloquea requests sin User-Agent**: el primer intento del script daba error 1010. Lección: los scripts de Python que llaman a APIs detrás de Cloudflare necesitan headers de navegador.
- **El backend tenía cosas que la sesión asumió que no tenía**: el modal "Pagar cuota" YA existe, el viewer de factura YA existe. Lección: pedir grep antes de proponer construir algo.
- **Categorías sistema vs custom**: el seed solo corre si NO hay categorías sistema. Si quieres cambiar el catálogo en producción, el wipe primero las borra y el reseed las inserta nuevas.

---

**Fin del handoff V5.**
