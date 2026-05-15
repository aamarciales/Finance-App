# Workflow · Fix TRM manual en D1

> Corrige las TRMs mal calculadas en transacciones COP que quedaron con `trm=1` tras el import bulk de sesión 5. Andrés puede ejecutar esto directamente sin chat.

---

## Contexto del problema

Después del import del 9 mayo 2026, todas las transacciones e invoices con `currency=COP` quedaron con `trm=1`. Eso hace que `amountInBase = amount/1 = amount`, tratando los pesos colombianos como si fueran USD. Resultado: dashboard muestra USD 1.000.000 en Vivienda en lugar de USD ~267.

## TRMs aproximadas a usar

| Mes | TRM (COP/USD) | Justificación |
|---|---|---|
| Abril 2026 | 3625.49 | Valor visto en transacciones del 15-abril del CSV original |
| Mayo 2026 | 3747.10 | Valor que muestra el sidebar de la app (TRM HOY · 9 MAY) |

Si quieres TRM exacta por día, consulta `https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde='2026-04-15T00:00:00.000'`.

---

## Paso 1 · Diagnóstico

Verifica cuántas filas tienen el bug:

```bash
cd ~/patrimonio
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) as total_rotas FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"
```

Esperado: número grande (probablemente 40+).

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT COUNT(*) as facturas_rotas FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"
```

Esperado: 8 (todas las facturas Mas x Menos).

---

## Paso 2 · Backup antes de tocar

Exporta el JSON desde `/settings` y guárdalo como `patrimonio-backup-pre-trm-fix.json`. Es tu rollback si algo sale mal.

---

## Paso 3 · Update transacciones de abril COP

```bash
npx wrangler d1 execute patrimonio-db --remote --command="UPDATE transactions SET trm = 3625.49, amount_in_base = ROUND(amount / 3625.49, 4), amount_in_secondary = amount WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 AND date >= '2026-04-01' AND date < '2026-05-01';"
```

Verifica:

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT date, concept, amount, trm, amount_in_base FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND date >= '2026-04-01' AND date < '2026-05-01' ORDER BY date LIMIT 5;"
```

Espero ver `trm = 3625.49` y `amount_in_base` en valores razonables (ej. para 1.000.000 COP debería ser ~275.81).

---

## Paso 4 · Update transacciones de mayo COP

```bash
npx wrangler d1 execute patrimonio-db --remote --command="UPDATE transactions SET trm = 3747.10, amount_in_base = ROUND(amount / 3747.10, 4), amount_in_secondary = amount WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 AND date >= '2026-05-01' AND date < '2026-06-01';"
```

Verifica igual que paso 3.

---

## Paso 5 · Update facturas de abril COP

```bash
npx wrangler d1 execute patrimonio-db --remote --command="UPDATE invoices SET trm = 3625.49 WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 AND date >= '2026-04-01' AND date < '2026-05-01';"
```

## Paso 6 · Update facturas de mayo COP

```bash
npx wrangler d1 execute patrimonio-db --remote --command="UPDATE invoices SET trm = 3747.10 WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 AND date >= '2026-05-01' AND date < '2026-06-01';"
```

---

## Paso 7 · Verificación final

```bash
npx wrangler d1 execute patrimonio-db --remote --command="SELECT 'tx_rotas' as t, COUNT(*) as n FROM transactions WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1 UNION ALL SELECT 'inv_rotas', COUNT(*) FROM invoices WHERE user_id='user_3DEHVwNjURaZfTfhcPTS0rNLOer' AND currency='COP' AND trm <= 1;"
```

Ambos deben dar `0`.

---

## Paso 8 · Verificación visual

Recarga `https://finance-app-678.pages.dev/` con Cmd+Shift+R. El dashboard debería mostrar números coherentes:
- Gastos del mes (mayo) en USD: algo como USD 470 (no millones)
- Vivienda en USD: ~267 USD (no 1 millón)
- Diezmo y ofrenda pendientes coherente

---

## Si algo sale mal

Re-importa el backup vía `/settings` → "Borrar datos" → re-correr el import desde JSON (cuando Bug H del backend esté arreglado, sin el bug de trm=1).

---

## Después del fix

Anota en `TODO.md` que Bug H está corregido en datos pero NO en código. La próxima sesión debe:

1. Agregar guard al backend (POST /transactions, POST /invoices, POST /admin/import-bulk): si `currency='COP'` y `trm<=1`, abortar con error 400.
2. Agregar guard al `csv_to_json.py`: nunca generar JSON con `trm: 1` en filas COP.

---

**Fin del workflow.**
