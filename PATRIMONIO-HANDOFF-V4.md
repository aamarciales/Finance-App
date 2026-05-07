# Patrimonio · Handoff sesión 4

> Para la nueva instancia de Claude: lee este MD entero antes de responder. Continuación directa de sesión 3, que cerró Bug A y Bug B y dejó la app **funcional para uso diario** con bugs documentados pendientes.

---

## 1. Quién soy y cómo trabajo

**Andrés** — freelancer venezolano residente en Bogotá, Colombia. Trabaja en BRIX Templates (Webflow) y otros clientes freelance. Stack que domina: Node.js, React, Webflow, Framer, Cloudflare Workers. Adventista del séptimo día (devuelve diezmo). Nivel técnico alto. No es contador.

**Cómo trabajar conmigo:**
- Par técnico, no soporte. Honestidad sobre tradeoffs.
- Cuando me des opciones, **da una recomendación clara** ("yo iría por X porque...").
- Plan antes de código en cambios grandes.
- No commits sin verificación visual mía.
- Bloques pequeños con `npm run build` después de cada uno.
- Conversación contigo en español. Prompts para Claude Code en inglés y en MD sin íconos.
- No repitas lo que ya sé.
- Cuando me hagas preguntas usa `ask_user_input_v0` si están disponibles los botones tappable.

---

## 2. Estado de la app al cerrar sesión 3

### Lo que funciona ✅

- Login con Clerk
- `/transactions`: lista las transacciones con montos correctos en USD/COP
- `/transactions` editar: modal abre, valida, guarda. **Bug A cerrado.**
- `/transactions` editar con currency inválido (PEN, etc): fallback a COP automático. **Bug A cerrado.**
- `/settings` carga sin crash, defaults se aplican bien
- Botón "Borrar datos" en /settings funciona end-to-end
- Importación CSV con auto-creación de categorías nuevas
- Pago internacional wizard completa los 5 pasos sin crash. **Bug B cerrado.**
- Cálculo de TRM correcto (number, no string). **Bug B cerrado.**
- Cálculo de diezmo y ofrenda con porcentajes correctos por categoría. **Bug C cerrado parcialmente** (datos en producción reparados; código resiliente queda pendiente — ver Bloque 1 abajo).

### Bugs vivos al cerrar sesión 3

Ver TODO.md sección Bugs bloqueantes para detalle. Resumen:

- **Bug C parte 2** (defensiva, no urgente): código no avisa cuando hay IDs huérfanos en titheConfig. La app silenciosamente cae al default si el ID configurado no existe en categorías. Ya pasó una vez, puede volver a pasar si se hace wipe + reseed.
- **Bug D**: lista de transacciones no se refresca tras crear vía wizard de pago internacional. Hay que F5.
- **Bug E**: colores editados de categorías no se reflejan en badges de la tabla de transacciones.

### Decisiones tomadas en sesión 3 que la próxima sesión debe respetar

1. **Categoría "Cobro deuda" (id 51) NO genera diezmo**. Cuando alguien te devuelve un préstamo, no es ingreso nuevo, es retorno de capital tuyo. Removida del titheConfig en producción vía SQL directo. Si se reseed cualquier día, hay que recordarlo o automatizarlo.
2. **Diezmo y ofrenda se devuelven en bloque, no por ingreso individual**. Andrés acumula compromisos durante 1-2 semanas y entrega todo junto cuando va a la iglesia. Esto es la justificación real del sistema F2 (gestión de Diezmos) que hay que construir.
3. **Deuda histórica espiritual (USD 300 en el caso de Andrés)**: no entra hoy en el modelo. La app actual asume cero al instalarla. F2 va a manejar esto.
4. **Schemas zod necesitan `.nullable()` cuando consumen datos de D1**, no solo `.optional()`. SQLite retorna `null` para columnas no seteadas. Ya aplicado a `txFormSchema`. Revisar otros formularios si presentan síntomas similares.
5. **APIs públicos pueden devolver números como strings**. Caso real: `datos.gov.co` Socrata API devuelve `valor` como string. Coerción defensiva en el hook que envuelve el fetch (no en cada consumidor downstream). Aplicado en `useTRM.ts` y `useForex.ts`. Patrón a replicar si se agrega otra fuente de tasas.

### Datos en D1 al cerrar sesión 3

User `user_3DEHVwNjURaZfTfhcPTS0rNLOer`:
- 9 ingresos históricos en abril-mayo (Sueldo BRIX, Eventive, Adelantos, Pago deuda Jhonatan, Designstream)
- 2 entregas de diezmo/ofrenda registradas el 2 mayo (USD 68,16 + USD 43,81 = USD 111,97)
- titheConfig actualizado con IDs reales: 43 (Freelance) 10/10, 45 (Otros ingresos) 10/10, 47 (Adelanto) 10/10, 49 (Sueldo) 10/5. defaultOffering subido a 10.
- 2 categorías custom: id 55 "Iglesia" (sin uso, podría limpiarse), id 51 "Cobro deuda" (sin diezmo asociado).

Otros users (intactos, no tocar): `user_2t1aGZZoXbN1KjY6f0fN8fX7uB1`, `user_test`.

### Último commit

```
4765463 docs(todo): agregar visión expandida del sistema operativo de Diezmos & Ofrendas
35091f1 fix(rates): coerce TRM and EUR/USD to number at source (Bug B)
e775aef docs: cierre de sesión 3 (Bug B closed) y registro de Bugs C/D/E + UX wizard + sistema clientes
```

Working tree limpio al cerrar sesión.

---

## 3. Stack y URLs (no cambió desde sesión 2)

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

### Tablas D1 confirmadas
`categories`, `debts`, `goals`, `invoices`, `invoice_items`, `settings`, `tithe_payments`, `transactions`.

### Filosofía de diseño
Minimalismo cálido tipo Mercury × revista financiera.
```
bg #fafaf7 · surface #ffffff · accent #2d4a3e · gold #b8923a · warm #c4621d · danger #a83e2b
```
Fraunces (titles), Geist (UI), JetBrains Mono (cifras).

---

## 4. Plan recomendado para sesión 4

### Orden propuesto (por valor real, no por dificultad)

#### Bloque 1 (warm-up, ~30 min) — Cerrar Bug C parte 2

Trabajo defensivo pendiente. Dos cambios pequeños:

1. **`src/lib/tithe.ts`**: agregar warn en consola (dev only) cuando se cae al default por categoryId huérfano. Set de IDs ya warneados para no spamear consola.
2. **wipe-my-data endpoint** (en `functions/api/[[route]].ts` o donde esté): incluir DELETE de la fila `titheConfig` de tabla `settings` para que un wipe + reseed no deje IDs huérfanos.

Ambos cambios pequeños, build limpio, commit + push. No requiere verificación visual elaborada.

#### Bloque 2 (~1h) — Bug D (refresh tras crear)

Síntoma: después de completar el wizard de pago internacional, la lista en `/transactions` no muestra las nuevas filas. F5 las muestra.

Hipótesis principal: TanStack Query no invalida el query de `transactions` cuando el wizard ejecuta su mutation múltiple. Falta `queryClient.invalidateQueries({ queryKey: ['transactions'] })` en el `onSuccess` o `onSettled` del mutation que crea las transacciones del wizard.

Investigación:
1. `grep -rn "invalidateQueries" src/components/transactions/IntlPaymentWizard.tsx src/hooks/useTransactions.ts`.
2. Ver el mutation y agregar invalidate. Si el wizard llama directo a `addTransaction` del hook, probablemente el hook ya lo hace y el problema es otro.
3. Verificar también que la lista se invalida cuando se crean transacciones via el modal normal "Nueva transacción" (caso conocido que sí funciona, comparar para entender la diferencia).

#### Bloque 3 (~30 min) — Bug E (colores categorías)

Síntoma: al editar el color de una categoría, los badges de transacciones siguen mostrando el color anterior incluso tras refresh.

Hipótesis A: el badge en `TransactionsTable.tsx` lee el color de un campo cacheado en la fila enriquecida en lugar de leerlo en vivo de la categoría.
Hipótesis B: el endpoint de update de categorías no invalida transactions enriched.

Investigación:
1. `grep -rn "category.color\|categoryColor\|c.color" src/components/transactions/`.
2. Ver cómo se construye la fila enriched en `useTransactions`. Probablemente hace JOIN o lookup local con un Map que no se actualiza.

#### Bloque 4 (sesión dedicada larga, 3-5 horas) — Sistema F2 de Diezmos & Ofrendas

**No empezar este bloque hasta que C2, D y E estén cerrados.**

Antes de tocar código, Andrés debe responder por escrito las 5 preguntas de producto que están en TODO.md sección "Sistema operativo de Diezmos y Ofrendas". Sin esas respuestas, no se puede arrancar. Las preguntas son:

1. ¿Un pago de diezmo cubre uno o varios compromisos?
2. ¿Diezmo y ofrenda se registran juntos o separados cuando se entregan?
3. ¿Quieres histórico de cumplimiento mensual?
4. ¿Soportes se adjuntan al compromiso, a la transacción, o a ambos?
5. ¿Deuda histórica como una sola entrada o como cuotas con fechas?

Detalles técnicos del sistema F2 están en TODO.md. Resumen del flujo:
- Cada ingreso genera automáticamente un compromiso pendiente (no transacción todavía).
- Página /diezmos muestra checklist de compromisos pendientes.
- Modal "registrar entrega": seleccionar 1+ compromisos, ingresar monto, subir soporte. Genera UNA transacción de gasto (Diezmo y/o Ofrenda) y marca compromisos como entregados.
- Sección aparte de "Deuda histórica" para arrastrar saldos pre-app, con abonos parciales.

Cambios técnicos:
- Nueva tabla `tithe_commitments`.
- Nueva tabla `tithe_historical_debt` (o flag isSpiritual en `debts`).
- Página `/diezmos` reescrita.
- Adaptar dashboard.

#### Bloque 5 (sesión dedicada, 4-6 horas) — Sistema de Clientes

Aún más adelante. Solo si Andrés sigue activo en la app y siente la fricción.

#### Mejoras UX que pueden ir en cualquier momento

- Tabs temporales en Dashboard (mensual / semanal / trimestral / semestral / anual / 5 años / desde inicio). Ver TODO.md sección Importante. Probablemente requiere refactor de `useDashboard.ts` para parametrizar el rango.
- Botón "Atrás" del wizard como ícono cuadrado en superior izquierda en lugar de footer.
- Botón "Crear todas las transacciones" en wizard paso 5 es muy largo, genera scroll horizontal.

---

## 5. Comandos de diagnóstico

```bash
# Estado de git
git --no-pager log --oneline -5 && git status

# Tablas D1
npx wrangler d1 execute patrimonio-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Conteos por tabla para mi user
npx wrangler d1 execute patrimonio-db --remote --command="SELECT 'transactions', COUNT(*) FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'categories', COUNT(*) FROM categories WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer';"

# Ver titheConfig en producción
npx wrangler d1 execute patrimonio-db --remote --command="SELECT key, value FROM settings WHERE key='titheConfig' AND user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer';"

# Ver categorías de ingreso
npx wrangler d1 execute patrimonio-db --remote --command="SELECT id, name, type FROM categories WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND type='income';"

# Logs en vivo del backend
npx wrangler pages deployment tail --project-name finance-app

# Lista de deployments recientes
npx wrangler pages deployment list --project-name finance-app | head -10

# Diff sin pager (importante, evita less)
git --no-pager diff <archivo>
```

### Setup de Claude Code

```bash
cd ~/patrimonio
claude --dangerously-skip-permissions
```

### NO usar `npm run dev` para probar end-to-end

Solo levanta Vite, no las Functions de Cloudflare. Las llamadas a `/api/*` caen en el fallback HTML de la SPA. Toda prueba seria es **contra producción** después de push.

---

## 6. Cómo arrancar conmigo

1. **Confirma brevemente que leíste todo el handoff**. No repitas el contenido entero.
2. **Verifica el estado de git**: `git --no-pager log --oneline -5 && git status`. Espera commits limpios y working tree limpio.
3. **Pregúntame qué quiero hacer hoy** y sugiere el orden recomendado del Bloque 1 al 4 según el estado actual.
4. Si arranco con Bug C parte 2, dame los pasos concretos antes de pedir a Claude Code.
5. Si me ves saltando a Sistema F2 o Sistema de Clientes sin que yo haya respondido las preguntas de producto del TODO, **avísame y para**.

---

## 7. Lo que NO debe hacerse en sesión 4

1. **No empezar Sistema F2 (Diezmos) ni Sistema de Clientes** sin las 5 respuestas de producto previas escritas. Dos features grandes, modelo nuevo, no se improvisan a las 11pm.
2. **No mezclar bugs con features grandes en una misma sesión**. Bugs cierran rápido si están bien definidos. Features grandes necesitan sesión dedicada.
3. **No hacer "scope creep en sesión"**: si durante la verificación visual del Bug C parte 2 aparecen 4 nuevos issues, anotarlos en TODO y seguir con el plan. Atacarlos hoy = no cerrar nada bien.
4. **No tocar otros users en D1**. El wipe filtra por userId, los SQL manuales también deben filtrar.
5. **No commits sin verificación visual mía**.
6. **No olvidar que pruebas end-to-end van contra producción** después de push, no contra `npm run dev`.

---

## 8. Lecciones de sesiones previas (no repetir errores)

- **Sesión 1**: agregar features sin terminar fundamentos rompió la app. La app llegó rota a sesión 2.
- **Sesión 2**: Bug A se diagnosticó mal en primera pasada (se asumió que el bug era el `currency='PEN'` cuando la causa real era `debtId: null` rechazado por zod `.optional()`). Sin instrumentación temporal del catch-all errors, no se hubiera visto. **Lección: cuando un fallo es silencioso en `react-hook-form`, agregar visualización temporal del objeto `errors` revela la causa en una iteración.**
- **Sesión 3**: Bug B fue rápido porque la primera hipótesis (`useTRM` retorna string) se confirmó con dos comandos de diagnóstico. Bug C parecía simple ("no calcula ofrenda") pero terminó siendo IDs huérfanos en config + decisión de producto sobre categoría "Cobro deuda" + descubrimiento del modelo limitado actual de diezmos (que motivó F2). **Lección: lo que se ve como un bug puntual a veces revela un modelo de producto incompleto. No siempre se arregla con código, a veces necesita rediseño.**

---

## 9. Recordatorio sobre Sesión 3 cierre

Datos en producción reparados manualmente con SQL directo. Esto es deuda técnica:
- Si Andrés borra datos otra vez con el botón de Settings, los IDs en titheConfig se vuelven huérfanos otra vez.
- La Parte 2 del Bug C (warns + wipe limpio) previene esto. **Es lo primero a cerrar en sesión 4.**

---

**Fin del MD.**
