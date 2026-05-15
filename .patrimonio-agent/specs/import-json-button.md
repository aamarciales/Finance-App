# Spec · Botón "Importar JSON" en Settings

> Reemplaza el flujo actual de import (script Python con token sacado del navegador) por un botón en `/settings`.

---

## Contexto

Hoy el import requiere:
1. Generar JSON con `csv_to_json.py`
2. Sacar token Clerk del navegador
3. Correr `import_bulk.py` desde terminal

Este flujo no escala para Andrés ni sus testers.

---

## Resultado deseado

En `/settings`, sección "Datos & Privacidad" (donde está "Exportar JSON" y "Borrar datos"), agregar un botón "**Importar JSON**". Al click:

1. File picker que acepta solo `.json`
2. Lee el archivo en cliente (no upload a servidor)
3. Valida que tiene la estructura mínima (claves `invoices`, `transactions`, `debts`, `settings`)
4. Muestra preview en modal: "Vas a importar X transacciones, Y facturas, Z deudas. Esto BORRA tus datos actuales. Confirmar?"
5. Si Andrés confirma, hace `POST /api/admin/import-bulk` con el body
6. Toast de progreso ("Importando..." con spinner)
7. Toast final con stats: "Importadas X tx, Y facturas, Z deudas, W ítems"
8. Invalida queries de TanStack Query para que el dashboard se refresque

---

## Cambios técnicos

### Archivos nuevos

- `src/components/settings/ImportJsonDialog.tsx` — modal con file picker + preview + confirmación

### Archivos modificados

- `src/pages/Settings.tsx` — agregar botón que abre el dialog

### Endpoint backend

Ya existe: `POST /api/admin/import-bulk`. No requiere cambios.

---

## Detalles de UI

```
[Datos & Privacidad section]

Tus datos están almacenados de forma segura en la nube y sincronizados entre dispositivos.

[Exportar JSON]  [Importar JSON]  [Borrar datos]
```

El botón "Importar JSON" usa el mismo estilo que "Exportar JSON" (outline, ícono Upload de lucide-react).

### Modal "Importar JSON"

```
Importar datos desde JSON

[Drag & drop o click para elegir archivo]
                ↓
Una vez elegido el archivo:

✓ Archivo válido: patrimonio-import-2026-05-09.json
   - 8 facturas con 83 ítems
   - 45 transacciones sueltas
   - 3 deudas
   - 0 categorías custom

⚠ ATENCIÓN: Importar este JSON va a BORRAR todos tus datos actuales
y reemplazarlos con el contenido del archivo.

[Cancelar]  [Importar y reemplazar]
```

Botón "Importar y reemplazar" en color rojo/danger. Confirmation requirida (tipo input "IMPORTAR" o checkbox "Entiendo que esto borra mis datos").

---

## Validaciones

En el cliente, antes de enviar:

1. JSON válido
2. Tiene al menos una de las claves: `transactions`, `invoices`, `debts`
3. Si tiene `transactions`, cada una tiene `date`, `concept`, `amount`, `currency`, `category` (string), `type`
4. Si tiene `invoices`, cada una tiene `date`, `merchant`, `total`, `currency`, `category`, `items` (array)
5. **Validar que no hay `trm: 1` en filas COP** (Bug H prevention). Si hay, abortar con error explicativo.

---

## Manejo de errores

- Archivo no es JSON válido → "El archivo no es JSON válido"
- Estructura incorrecta → "El JSON no tiene la estructura esperada (transactions, invoices, debts...)"
- Backend devuelve error 5xx → mostrar mensaje del backend en toast danger
- Backend devuelve `success: false` con mensaje → mostrar mensaje
- TRMs incorrectas en filas COP → "Algunas transacciones COP tienen TRM inválida (=1). Corrige el JSON antes de importar."

---

## No incluir en esta spec (ir en Bloque 6+)

- Subir attachments (R2)
- Importar parcialmente (solo transacciones nuevas, no wipe total)
- Importar ZIP con archivos
- Diff entre JSON y datos actuales

---

## Verificación al cierre

- [ ] Build verde
- [ ] Andrés puede subir el JSON y ver el preview
- [ ] El import funciona end-to-end
- [ ] Dashboard refresca automáticamente al final
- [ ] Si el JSON tiene TRM inválida, lo detecta antes de enviar al backend

---

**Fin de la spec.**
