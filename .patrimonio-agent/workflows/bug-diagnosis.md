# Workflow · Diagnóstico de bug

> Protocolo paso a paso para diagnosticar un bug de la app sin asumir cosas. Aplica a Claude Code o cualquier AI.

---

## Cuándo usar este workflow

Andrés reporta: "X no funciona", "me sale error Y", "esperaba Z y vi W". Antes de proponer fix, ejecuta este protocolo.

---

## Paso 1 · Reproducir el síntoma

Pide a Andrés:
- Captura de pantalla del error o estado actual
- URL exacta donde ocurre
- Pasos para reproducir
- Si es error de runtime, el stack trace o mensaje

NO asumas el síntoma. Usuarios suelen describir el problema de forma vaga.

---

## Paso 2 · Identificar la capa

¿El bug está en frontend, backend, o D1?

- **Frontend**: error en consola del navegador, layout roto, componente que crashea, datos visibles pero mal formateados
- **Backend**: status 4xx/5xx, error de auth, datos que no llegan, validación zod fallando
- **D1**: filas faltantes, datos desactualizados, FK rota

Si dudas, mira la pestaña Network del DevTools (request al `/api/...` y su response).

---

## Paso 3 · Buscar el código relevante

Antes de proponer fix:

```bash
# Frontend: buscar el componente
grep -rn "<componente target>" src/components/ src/pages/

# Backend: buscar el endpoint
grep -rn "endpoint-name" src/server/routes/

# Modelo: confirmar campos
grep -A 20 "tabla_target = sqliteTable" src/server/schema.ts
```

Lee el código completo del archivo target (no solo las líneas relevantes). Muchos bugs se entienden viendo el flujo entero.

---

## Paso 4 · Hipótesis con evidencia

Antes de proponer fix, formula 1-3 hipótesis y di **qué evidencia te haría confirmarlas o descartarlas**.

Ejemplo bueno:
> Hipótesis A: el componente intenta `invoice.items.length` antes de cargar items.
> Evidencia para confirmar: en el código del componente `InvoiceModal.tsx`, el render usa `items.length` sin guard de `items?.length`.

Ejemplo malo:
> Probablemente es un problema de async, le pongo un `?.` y listo.

---

## Paso 5 · Verificar la hipótesis

Mira el código y confirma. Si la hipótesis es correcta, propón fix. Si no, vuelve al paso 4 con otra hipótesis.

NO propongas fixes a hipótesis sin verificar. Sesión 5 perdió 30 minutos asumiendo un bug en CSV currency cuando el bug real era zod `.optional()` vs `.nullable()`.

---

## Paso 6 · Proponer fix mínimo

El fix debe:
- Tocar el menor número de archivos posible
- No introducir nuevos patrones (sigue el estilo del archivo existente)
- Tener una verificación clara: cómo Andrés sabe que funcionó

---

## Paso 7 · Build + push

Solo después de que Andrés apruebe el plan:
1. `npm run build`
2. Si verde, `git add ... && git commit -m "fix(...): ..." && git push`
3. Esperar Cloudflare deploy
4. Pedir a Andrés verificación visual en producción

---

## Paso 8 · Documentar

Si el bug fue interesante (no trivial), agregar al TODO.md:
- Bug nombre
- Síntoma
- Causa real
- Lección (si aplica)

---

## Anti-patrones (NO hacer)

- "Probablemente es X" → fix → otro fix → otro fix. Cada iteración sin verificación es una pérdida de contexto.
- Proponer agregar try/catch o `?.` sin entender por qué falla.
- Leer solo las primeras 30 líneas del archivo y proponer fix.
- Buscar en Stack Overflow antes de leer el código del proyecto.

---

**Fin del workflow.**
