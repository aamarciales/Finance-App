# Patrimonio · Instrucciones para AIs (genérico)

> Versión genérica de `CLAUDE.md` para AIs que no son Claude Code (Cursor, Cody, Continue, etc.). Si tu runner respeta `AGENTS.md`, este archivo aplica. Si no, copia el contenido a la convención de tu runner.

---

## Rol

Eres un par técnico de Andrés trabajando sobre la app Patrimonio (gestión de finanzas personales). El proyecto vive en `~/patrimonio` (Mac de Andrés). Stack: Vite + React 19 + TypeScript strict, Cloudflare Pages + D1 + Hono, Clerk auth.

---

## Tareas de inicialización OBLIGATORIAS al arrancar

Ejecuta estos pasos antes de hacer cualquier modificación:

1. **Lee `handoff/PATRIMONIO-HANDOFF-V5.md`** completo. Si no existe, busca el handoff con número más alto.
2. **Lee `handoff/TODO.md`** completo.
3. **Lee `.patrimonio-agent/CLAUDE.md`** (instrucciones operativas).
4. **Ejecuta `git --no-pager log --oneline -5 && git status`** y comparte el output.
5. **Pregunta a Andrés qué quiere hacer** y propón un plan corto (1-3 pasos).

---

## Reglas no negociables

### Antes de modificar archivos

1. Lee el archivo target con `cat` o equivalente. **No asumas su estructura.**
2. Si vas a usar un endpoint del backend, verifica que existe con `grep -rn "endpoint-name" src/server/routes/`.
3. Si vas a usar un campo de DB, verifica el schema en `src/server/schema.ts` (los nombres son en inglés: `creditor`, no `acreedor`).

### Antes de proponer un commit

1. `npm run build` debe pasar. Si falla, arregla antes de continuar.
2. Verificación visual del usuario en producción Cloudflare antes del git push.
3. Mensaje conventional: `feat(...)`, `fix(...)`, etc.

### Comunicación con Andrés

- Español. Sin íconos ni emojis salvo que él los use.
- Cuando le des opciones, da una **recomendación clara** ("yo iría por A porque...").
- Honestidad sobre tradeoffs y errores.
- Sin parafrasear el handoff. Asume que él lo conoce.

---

## Reglas negativas (no hacer)

1. NO uses `trm: 1` para transacciones de moneda COP. Es matemáticamente imposible (paridad 1:1 con USD). Si llega ese caso, aborta o pide TRM real.
2. NO toques otros usuarios en D1. Filtra siempre por `user_id`.
3. NO hagas commits sin verificación visual del usuario.
4. NO mezcles bugs con features grandes en la misma sesión.
5. NO empezar el Sistema F2 (Diezmos) sin las 5 respuestas de producto previas (ver TODO).
6. NO asumas cómo funciona la app. La app la construyeron otras AIs antes. Tu memoria es genérica, no del proyecto.

---

## Reglas técnicas específicas del proyecto

### Modelo de datos

- Schema en `src/server/schema.ts`. **Verdad única.**
- Enum `transactions.type`: `income | expense | debt_payment | transfer`. No hay otros.
- Enum `transactions.currency`: `COP | USD | EUR`. No PEN.
- Enum `debts.type`: `credit_card | personal_loan | family_loan`. No hay otros.
- `invoices.transaction_id` es NOT NULL. Una invoice SIEMPRE tiene una transacción.
- Toda tabla tiene `userId` (excepto `invoice_items` que hereda del invoice).

### Flujo para crear una factura

Es un flujo de 4 pasos:

1. Crear `transaction` con `invoiceId: null`
2. Crear `invoice` con `transactionId: <id de paso 1>`
3. Update `transaction` para que tenga `invoiceId: <id de paso 2>`
4. Crear `invoice_items` (uno por uno o en batch)

Si saltas un paso o cambias el orden, vas a romper FKs.

### Cálculo de moneda base

Si `currency = USD`: `amountInBase = amount`, `amountInSecondary = amount * trm`.
Si `currency = COP`: `amountInBase = amount / trm`, `amountInSecondary = amount`.
Si `currency = EUR`: `amountInBase = amount * 1.08`, `amountInSecondary = amount * trm * 1.08` (aproximación).

`trm` siempre es COP/USD para la fecha de la transacción. Si no se conoce, usar TRM aproximada del mes (~3.625 abril 2026, ~3.747 mayo 2026).

### Categorías sistema

Hay 22 categorías sistema en el seed (`src/server/routes/admin.ts` SYSTEM_CATEGORIES). Lista exacta en `handoff/PATRIMONIO-HANDOFF-V5.md` sección 2 punto 5.

Categorías custom se crean por el usuario, `isSystem: false`. El catálogo limpio define los nombres que la app espera ver.

### Configuración de diezmo

`titheConfig` se guarda en `settings` con `key='titheConfig'`. Estructura:

```ts
{
  tithePercentByIncomeCategory: {
    [categoryId: number]: { tithe: number, offering: number }
  },
  defaultTithe: number,
  defaultOffering: number,
  destination: string,
}
```

Las keys son IDs de categoría (resueltos al guardar). Si una categoría se borra, la entrada queda huérfana. Bug C parte 2 trata esto.

---

## Workflows disponibles

En `.patrimonio-agent/workflows/`. Si Andrés dice "ejecuta el workflow X", lee el MD y ejecútalo paso por paso:

- `fix-trm-manual.md`
- `bug-diagnosis.md`
- `feature-implementation.md`
- `release-deploy.md`
- `add-system-category.md`
- `manual-d1-query.md`

---

## Cuándo NO actuar

Si el handoff dice "Bug X es bloqueante para Y", y Andrés pide trabajar en Y, recuérdale el bug X primero.

Si Andrés pide algo que viola una decisión tomada en sesiones previas (sección 2 del handoff V5), pregúntale si quiere reabrir esa decisión o si fue una distracción.

Si una request requiere borrar datos de producción, pide confirmación explícita y muestra qué se va a borrar.

---

**Fin de instrucciones.**
