# Workflow · Query manual en D1

> Protocolo seguro para queries SELECT/UPDATE/DELETE directas en D1.

---

## Reglas no negociables

1. **SIEMPRE filtrar por `user_id`** en cada query. Nunca operar sobre toda la tabla.
2. **SIEMPRE backup antes de UPDATE/DELETE**: exportar JSON desde `/settings`.
3. **Antes de ejecutar UPDATE/DELETE, ejecutar el equivalente SELECT primero** para ver qué se va a tocar.
4. **NO usar SQL para crear filas** (excepto categorías sistema). Usar los endpoints POST que validan zod.

---

## Andrés' user_id

```
user_3DEHVwNjURaZfTfhcPTS0rNLOer
```

NO confundir con `user_2t1aGZZoXbN1KjY6f0fN8fX7uB1` (otro user, no tocar).

---

## Wrangler debe correr desde ~/patrimonio

```bash
cd ~/patrimonio
```

Si corres desde otra carpeta, wrangler no encuentra `wrangler.toml` y pide instalar wrangler globalmente.

---

## Plantilla de query SELECT

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT ... FROM tabla WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' ...;"
```

---

## Plantilla de query UPDATE (con dry-run primero)

Paso 1 — dry-run (SELECT lo que se cambiaría):

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT id, campo_a_cambiar FROM tabla WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND <condición>;"
```

Mostrar el output a Andrés. Confirmar que es lo esperado.

Paso 2 — UPDATE real:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="UPDATE tabla SET campo = nuevo_valor WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND <condición>;"
```

Paso 3 — verificación post:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT id, campo FROM tabla WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND <condición>;"
```

---

## Plantilla de query DELETE

Solo en casos extremos. Preferir el endpoint `/admin/wipe-my-data` (que filtra por user automáticamente).

Si es absolutamente necesario:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) FROM tabla WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND <condición>;"
```

Confirmar que el número es razonable. Después:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="DELETE FROM tabla WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND <condición>;"
```

---

## Comillas: ojo

Wrangler procesa la flag `--command` con shell. Para no escapar mal:

- Usar `"..."` exterior para `--command`
- Strings SQL adentro con `'...'`
- Si necesitas comilla doble dentro del SQL, escapar con `\"`

En zsh, si pegas algo con `[corchetes]` te dará `bad pattern`. Solución: poner `\` antes de cada corchete o usar un heredoc.

---

## Schema reference rápido

```
categories:    id, user_id, name, color, icon, type, is_system
transactions:  id, user_id, date, type, concept, category_id, amount, currency, trm,
               amount_in_base, amount_in_secondary, invoice_id, debt_id, is_tithe_calculated,
               created_at, updated_at
invoices:      id, user_id, transaction_id, date, merchant, total, currency, trm, item_count,
               invoice_number, payment_method, location, notes, attachment_url, created_at
invoice_items: id, invoice_id, name, quantity, unit_price, total_price, sub_category, barcode
debts:         id, user_id, name, creditor, type, original_amount, current_balance, currency,
               interest_rate, monthly_payment, total_installments, paid_installments,
               next_payment_date, notes, created_at
settings:      key, user_id, value
goals:         id, user_id, name, target_amount, current_amount, deadline, currency, color,
               icon, created_at
tithe_payments: id, user_id, date, amount_usd, paid_to, type, notes, transaction_id, created_at
```

---

**Fin del workflow.**
