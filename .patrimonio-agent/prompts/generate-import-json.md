# Prompt · Generar JSON de import desde CSV

> Prompt para usar cuando Andrés tiene un CSV nuevo y quiere generarle el JSON canónico para importar a la app.

---

## Cuándo usar

- Andrés trae un CSV con sus finanzas (formato igual al de `finanzas_abril_mayo_2026_actualizado.csv`).
- Pide generar el JSON para subir a la app.

---

## Contrato del JSON

Estructura completa esperada:

```json
{
  "version": "1.0",
  "exportedAt": "2026-05-XX...",
  "meta": {
    "baseCurrency": "USD",
    "secondaryCurrency": "COP"
  },
  "categories": [],
  "invoices": [
    {
      "externalId": "<numero_factura>",
      "date": "YYYY-MM-DD",
      "merchant": "string",
      "currency": "COP|USD|EUR",
      "total": number,
      "trm": number,
      "category": "<categoría sistema>",
      "paymentMethod": "string|null",
      "notes": "string|null",
      "items": [
        {
          "name": "string",
          "quantity": number,
          "unitPrice": number,
          "totalPrice": number,
          "subCategory": "<categoría sistema>",
          "barcode": null
        }
      ],
      "transaction": {
        "concept": "string",
        "description": null,
        "notes": "string|null"
      }
    }
  ],
  "transactions": [
    {
      "externalId": null,
      "date": "YYYY-MM-DD",
      "type": "income|expense|debt_payment|transfer",
      "concept": "string",
      "description": "string|null",
      "amount": number,
      "currency": "COP|USD|EUR",
      "category": "<categoría sistema>",
      "trm": number,
      "bankFeeUsd": number|null,
      "merchant": "string|null",
      "paymentMethod": "string|null",
      "status": "completed",
      "notes": "string|null",
      "debtRef": "string|null"
    }
  ],
  "debts": [
    {
      "name": "string",
      "creditor": "string",
      "type": "credit_card|personal_loan|family_loan",
      "originalAmount": number,
      "currentBalance": number,
      "currency": "COP|USD|EUR",
      "interestRate": number|null,
      "monthlyPayment": number|null,
      "totalInstallments": number|null,
      "paidInstallments": number|null,
      "nextPaymentDate": "YYYY-MM-DD|null",
      "notes": "string|null"
    }
  ],
  "settings": {
    "titheConfig": {
      "tithePercentByIncomeCategory": {
        "Freelance": { "tithe": 10, "offering": 10 },
        "Sueldo": { "tithe": 10, "offering": 5 },
        "Otros ingresos": { "tithe": 10, "offering": 10 },
        "Adelanto": { "tithe": 10, "offering": 10 },
        "Cobro deuda": { "tithe": 0, "offering": 0 }
      },
      "defaultTithe": 10,
      "defaultOffering": 10,
      "destination": "Iglesia local"
    }
  }
}
```

---

## Reglas críticas

### TRM (NO repetir Bug H)

- Para `currency = USD`: `trm` = TRM del día (3.625.49 para abril 2026, 3.747.10 para mayo 2026)
- Para `currency = COP`: `trm` = TRM del día (NUNCA `1`, eso es para USD)
- Para `currency = EUR`: `trm` = TRM COP/USD del día

Si el CSV tiene la columna `Tasa_Cambio_USD_COP` con valor, usarlo.
Si no la tiene, asumir TRM aproximada del mes (3.625 abril, 3.747 mayo).

### Categorías

Solo usar nombres del catálogo de 22:
```
Gasto: Supermercado, Comida fuera, Vivienda, Servicios, Suscripciones, Transporte,
       Salud, Educación, Hogar, Cuidado personal, Diezmo y Ofrenda, Deuda,
       Impuestos, Comisiones bancarias, Mascotas, Otros, Transferencias
Ingreso: Sueldo, Freelance, Adelanto, Cobro deuda, Otros ingresos
```

Mapeo de CSV → catálogo limpio:
- `Mercado/*` → `Supermercado`
- `Iglesia/Diezmo` o `Iglesia/Ofrenda` → `Diezmo y Ofrenda`
- `Hogar/*` → `Hogar`
- `Vivienda/*` → `Vivienda`
- `Telefonia/*` y `Servicios/*` → `Servicios`
- `Suscripciones/*` y `Pagos Recurrentes/*` → `Suscripciones`
- `Mascotas/*` → `Mascotas`
- `Deuda/*` → `Deuda`
- `Transferencia/*` → `Transferencias`
- `Comisiones_bancarias/*` o `Comisiones bancarias/*` → `Comisiones bancarias`
- `Perdida/*` → `Otros`
- `Prestamo/*` (cuando es préstamo OTORGADO a otros) → `Otros`
- `Sueldo/*` → `Sueldo`
- `Freelance/*` → `Freelance`
- `Adelanto/*` → `Adelanto`
- `Cobro Deuda/*` → `Cobro deuda`
- `Otros/Personal` (en ingresos) → `Otros ingresos`

### Currency

Solo `COP | USD | EUR`. Si el CSV tiene PEN, convertir a COP usando `Monto_COP` ya calculado, y dejar nota: "Pago original en S/ X PEN".

### Tipo interno (transactions.type)

- CSV `Ingreso` → `income`
- CSV `Pago_deuda` o categoría `Deuda` → `debt_payment`
- CSV `Transferencia` o categoría `Transferencias` → `transfer`
- CSV `Diezmo`, `Ofrenda` → `expense` (categoría "Diezmo y Ofrenda")
- Resto → `expense`

### Iglesia NO se trata como factura

Si hay filas con mismo `Numero_Factura` pero todas son de Categoria=Iglesia, NO agruparlas. Cada Diezmo y Ofrenda es transacción independiente.

### Agrupación factura

Solo agrupar como invoice si hay 2+ filas con mismo `Numero_Factura` y NO son todas de Iglesia. La transacción de la factura tiene `concept = "Compra <merchant>"` o similar, y los ítems van en `items[]` con su `subCategory`.

### Pagos a deudas

Si la transacción es categoría `Deuda` y el concepto/notas mencionan al acreedor (Tio Bairon, Motorola, Nu Bank), agregar `debtRef` con el nombre exacto de la deuda (ej. "Préstamo Tío Bairon").

### Deudas espirituales

Excluir filas de la sección 2 con categoría "Religiosa". Esas las maneja F2.

### Sección 3 (capital) y 4 (recurrentes)

Ignorar. Documentar como referencia. Capital va a F4, recurrentes a F5.

---

## Output

Generar el JSON con `python3 csv_to_json.py input.csv output.json` (script en `tools/`). Imprimir reporte con conteos y warnings.

---

## Validación post-generación

Antes de pasarle el JSON a Andrés:

```bash
python3 -c "
import json
d = json.load(open('output.json'))

# Validar TRMs
for tx in d['transactions']:
    if tx['currency'] == 'COP' and tx.get('trm', 0) <= 1:
        print(f'WARN: tx COP con trm inválida: {tx[\"concept\"]}')

for inv in d['invoices']:
    if inv['currency'] == 'COP' and inv.get('trm', 0) <= 1:
        print(f'WARN: invoice COP con trm inválida: {inv[\"merchant\"]}')

print('Validación OK' if 'WARN' not in str(open('output.json').read()) else 'Hay warnings, revisar')
"
```

Si hay warnings, NO pasar el JSON a Andrés. Arreglar el script y regenerar.

---

**Fin del prompt.**
