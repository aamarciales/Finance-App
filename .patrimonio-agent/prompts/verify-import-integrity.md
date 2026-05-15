# Prompt · Verificar integridad de import

> Tras hacer un import bulk, validar que todo quedó coherente en D1.

---

## Cuándo usar

Tras correr `import_bulk.py` o el botón de import (cuando exista), antes de declarar "import completo".

---

## Checklist de verificaciones

### 1. Conteos coherentes

```bash
cd ~/patrimonio
npx wrangler d1 execute patrimonio-db --remote --command="SELECT 'transactions', COUNT(*) FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer') UNION ALL SELECT 'debts', COUNT(*) FROM debts WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' UNION ALL SELECT 'categories', COUNT(*) FROM categories WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer';"
```

Comparar contra el JSON original. `transactions` debe ser `looseTransactions + invoicesCount`.

### 2. Sin TRM inválida (Bug H prevention)

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) as bad_trm FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"
```

Debe ser `0`.

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) as bad_trm_inv FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"
```

Debe ser `0`.

### 3. Sin transacciones huérfanas con invoiceId roto

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT t.id, t.concept FROM transactions t WHERE t.user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND t.invoice_id IS NOT NULL AND t.invoice_id NOT IN (SELECT id FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer');"
```

Debe estar vacío.

### 4. Sin invoices huérfanas (sin transaction_id)

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT i.id, i.merchant FROM invoices i WHERE i.user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND i.transaction_id NOT IN (SELECT id FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer');"
```

Debe estar vacío.

### 5. Sin items huérfanos (sin invoice)

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer');"
```

Debe ser `0` (asumiendo no hay otros usuarios afectados).

### 6. titheConfig usa IDs reales

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT value FROM settings WHERE key='titheConfig' AND user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer';"
```

El JSON debe tener `tithePercentByIncomeCategory: { "<id_numerico>": {...} }`. Si tiene nombres en lugar de IDs, está mal.

Validar que cada ID existe:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT id, name, type FROM categories WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND type='income';"
```

Comparar con los IDs del titheConfig.

### 7. Verificación visual

Andrés abre `https://finance-app-678.pages.dev/` con Cmd+Shift+R. Verifica:

- [ ] Dashboard: KPIs en montos coherentes (no millones de USD)
- [ ] /transactions: 53 filas (45 sueltas + 8 facturas)
- [ ] /invoices: 8 facturas Mas x Menos con sus ítems
- [ ] /debts: 3 deudas con saldos coherentes
- [ ] /diezmos: muestra pendiente acorde a ingresos
- [ ] /settings: muestra config de diezmo correcta

---

## Si alguna verificación falla

Reportar a Andrés con el query que falló y el dato esperado vs real. NO seguir trabajando hasta que el dato esté íntegro.

---

**Fin del prompt.**
