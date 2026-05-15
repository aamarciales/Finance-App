# Patrimonio · Instrucciones operativas para Claude Code

> Este archivo es leído automáticamente por Claude Code cuando arranca en este repo. También aplica a otros runners que respeten convenciones similares (ver `AGENTS.md` para versión genérica).

---

## Quién es el usuario

Andrés. Freelancer técnico, par técnico contigo. Ver `handoff/PATRIMONIO-HANDOFF-V5.md` sección 1 para detalles.

---

## Reglas operativas (no negociables)

### Antes de cualquier cambio

1. **Lee el handoff más reciente** en `handoff/PATRIMONIO-HANDOFF-V5.md` (o el que tenga el número mayor).
2. **Lee el TODO** en `handoff/TODO.md` para conocer bugs vivos y decisiones tomadas.
3. **Si vas a editar un archivo, primero lo abres y lees con `view` o `cat`**. No asumas la estructura.
4. **Si vas a usar un endpoint, primero verifica que existe con `grep` en `src/server/routes/`**. No inventes endpoints.
5. **Si vas a usar un campo de DB, primero verifica el schema en `src/server/schema.ts`**. Los nombres son en inglés (`creditor`, no `acreedor`).

### Antes de hacer commit

1. **Build verde obligatorio**: `npm run build` debe pasar sin errores TypeScript.
2. **Verificación visual del usuario**: ningún commit hasta que Andrés confirme que el cambio se ve bien en producción.
3. **Mensajes de commit con prefijo conventional**: `feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, etc.

### Cuando hagas tool calls

1. **Bash con `--no-pager` para git**: `git --no-pager log`, `git --no-pager diff`. Si no, less se queda esperando input.
2. **Wrangler corre desde `~/patrimonio`**, no desde `~/Downloads` ni otra carpeta.
3. **Para diff de un solo archivo grande, usa `view` con `view_range`**, no `cat`.

### Cuando le hables a Andrés

1. **No repitas lo que ya está en el handoff** salvo que sea relevante al momento.
2. **Cuando le des opciones, da una recomendación clara**. "A o B" sin opinión es ruido.
3. **No uses íconos ni emojis** salvo que él los use primero.
4. **Cuando hagas preguntas estructuradas, considera `ask_user_input_v0` si está disponible**.
5. **Honestidad sobre tradeoffs y errores**. No es necesario maquillar.

---

## Reglas negativas (cosas que NO debes hacer)

1. **No asumir cómo funciona la app sin verificar**. La app la construyeron varias instancias antes que tú. Tu memoria de cómo "debería ser" es de otras apps.
2. **No usar `trm: 1` para transacciones COP**. Es matemáticamente imposible. Aborta o pide TRM real.
3. **No tocar otros users en D1**. Filtra siempre por userId.
4. **No commits sin verificación visual** del usuario.
5. **No mezclar bugs con features grandes** en una misma sesión.
6. **No empezar Sistema F2 (Diezmos)** sin las 5 respuestas de producto previas (ver TODO).
7. **No usar `cat` con archivos binarios** (PDFs, imágenes). Usa view.
8. **No olvidar `git add` antes de commit** cuando creas archivos nuevos.
9. **No proponer borrar IndexedDB residual** sin confirmar primero qué guarda y qué se pierde.
10. **No reproducir contenido protegido por copyright** en respuestas.

---

## Formatos preferidos

### Para prompts a otras AIs (Cursor, Cody, etc.)

- Markdown sin íconos.
- Inglés técnico.
- Pasos numerados con consecuencias explícitas si se saltan.
- Ejemplos concretos antes de pedir abstractos.

### Para conversación con Andrés

- Español natural.
- Bloques cortos. No párrafos de 10 líneas.
- Listas con `-` o números, no bullets gráficos.
- Code fences para comandos.
- Disclaimers solo cuando son útiles, no por reflejo.

### Para código

- TypeScript strict. Sin `any` salvo justificación.
- Componentes funcionales con hooks. Sin clases.
- Tailwind v4 con CSS variables (mira `src/index.css`).
- shadcn/ui preset "nova" para componentes base.
- Imports absolutos con alias `@/...`.

---

## Cómo usar los workflows

`.patrimonio-agent/workflows/` tiene playbooks especializados. Cada uno es un MD con pasos numerados que el usuario puede invocar:

- `fix-trm-manual.md` — corregir TRM mal calculadas en D1 vía SQL directo
- `bug-diagnosis.md` — protocolo para diagnosticar un bug de la app
- `feature-implementation.md` — implementar una feature siguiendo plan-código-build-deploy-verify
- `release-deploy.md` — deploy a Cloudflare Pages con verificación
- `add-system-category.md` — agregar una categoría sistema al catálogo
- `manual-d1-query.md` — protocolo seguro para queries directas en D1

Si Andrés escribe "ejecuta el workflow X" o "haz un fix-trm", lee el MD correspondiente y ejecútalo paso por paso.

---

## Cómo usar los prompts especializados

`.patrimonio-agent/prompts/` tiene prompts específicos que pueden invocarse para tareas concretas:

- `generate-import-json.md` — generar JSON canónico desde CSV de finanzas
- `verify-import-integrity.md` — verificar que un import quedó coherente
- `audit-tithe-config.md` — auditar que titheConfig esté limpio

---

## Cuándo es OK delegar a un subagente

Para Claude Code: tareas mecánicas y deterministas que no requieren contexto del proyecto. Ejemplos:
- Correr tests
- Formatear código (`npm run lint`, `prettier`)
- Generar migration de Drizzle
- Build check

Para tareas que requieran entender el dominio (modelo de datos, decisiones de producto, flujos de Andrés), NO delegar. Hacerlo en el thread principal.

---

## Estructura de carpetas relevantes

```
patrimonio/
├── .patrimonio-agent/        ← este folder, instrucciones del agente
│   ├── CLAUDE.md             ← este archivo
│   ├── AGENTS.md             ← versión genérica para otros runners
│   ├── workflows/            ← playbooks invocables
│   ├── prompts/              ← prompts especializados
│   └── specs/                ← specs de features pendientes
├── handoff/                  ← handoffs de sesiones (V4, V5, ...) y TODO
├── src/
│   ├── server/
│   │   ├── schema.ts         ← VERDAD del modelo de datos
│   │   └── routes/           ← endpoints disponibles
│   ├── pages/                ← páginas de la app
│   ├── components/           ← componentes
│   ├── hooks/                ← custom hooks
│   └── lib/                  ← utilities
├── functions/api/[[route]].ts ← entry point Hono
├── drizzle/                  ← migraciones SQL
├── tools/                    ← scripts de import/export (csv_to_json.py, etc)
└── wrangler.toml
```

---

## Formato de los handoffs

Cada N sesiones, el handoff se renumera. El más reciente es el que vale.
- `handoff/PATRIMONIO-HANDOFF-V5.md` (sesión 5)
- `handoff/PATRIMONIO-HANDOFF-V4.md` (sesión 4, histórico)
- `handoff/TODO.md` (siempre vivo)

---

**Fin de las instrucciones.**
