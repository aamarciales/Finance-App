# Cómo usar este bundle

> Andrés, lee esto primero. Te explica qué hay en el bundle, dónde poner cada archivo, y cómo arrancar la próxima sesión sin gastar tokens en explicaciones.

---

## Qué hay en este bundle

```
.
├── handoff/
│   ├── PATRIMONIO-HANDOFF-V5.md   ← handoff de esta sesión
│   └── TODO.md                    ← lista viva de pendientes
└── .patrimonio-agent/
    ├── README.md                  ← documentación del agente
    ├── CLAUDE.md                  ← instrucciones para Claude Code
    ├── AGENTS.md                  ← instrucciones para otras AIs
    ├── workflows/                 ← 6 playbooks invocables
    └── prompts/                   ← 2 prompts especializados
    └── specs/                     ← 1 spec de feature pendiente
```

---

## Paso 1 · Mover los archivos al repo

En tu terminal:

```bash
cd ~/patrimonio

# Crear las carpetas
mkdir -p handoff .patrimonio-agent/workflows .patrimonio-agent/prompts .patrimonio-agent/specs

# Copiar los archivos del bundle (ajusta el path según donde lo bajaste)
cp ~/Downloads/agent-bundle/handoff/*.md handoff/
cp ~/Downloads/agent-bundle/.patrimonio-agent/*.md .patrimonio-agent/
cp ~/Downloads/agent-bundle/.patrimonio-agent/workflows/*.md .patrimonio-agent/workflows/
cp ~/Downloads/agent-bundle/.patrimonio-agent/prompts/*.md .patrimonio-agent/prompts/
cp ~/Downloads/agent-bundle/.patrimonio-agent/specs/*.md .patrimonio-agent/specs/
```

Verifica:

```bash
find handoff .patrimonio-agent -type f -name "*.md" | sort
```

Deberían aparecer 12 archivos.

---

## Paso 2 · Commitear

```bash
cd ~/patrimonio
git add handoff/ .patrimonio-agent/
git commit -m "docs(agent): add handoff V5, TODO, and agent workflows/prompts/specs"
git push origin main
```

---

## Paso 3 · Arreglar TRM manualmente (Bug H)

Hay un bug pendiente: las transacciones COP tienen `trm=1` por error del import. Esto hace que el dashboard muestre USD enormes.

Sigue paso a paso `.patrimonio-agent/workflows/fix-trm-manual.md` que copiaste al repo. Son ~7 pasos cortos con SQL listo.

Si prefieres, arrancas la próxima sesión y le pides a la AI "ejecuta el workflow fix-trm-manual". La AI lee el archivo y lo ejecuta paso por paso.

---

## Paso 4 · Arrancar la próxima sesión (con cualquier AI)

### Opción A · Próxima sesión con Claude Code en tu Mac

1. Abre terminal en `~/patrimonio`
2. `claude --dangerously-skip-permissions`
3. Le dices: "Lee `.patrimonio-agent/CLAUDE.md` y `handoff/PATRIMONIO-HANDOFF-V5.md`. Después dime qué entiendes del estado del proyecto."
4. La AI lee, te resume, y te pregunta qué hacer

### Opción B · Próxima sesión en chat web de Claude

1. Abre un chat nuevo en claude.ai
2. Sube los 3 archivos clave:
   - `handoff/PATRIMONIO-HANDOFF-V5.md`
   - `handoff/TODO.md`
   - `.patrimonio-agent/CLAUDE.md`
3. Le pegas al chat: "Lee estos 3 archivos. Estoy continuando trabajo sobre la app Patrimonio (sesión 6). Resume el estado actual y dime qué workflows tienes disponibles. Espera mi instrucción siguiente antes de hacer nada."

### Opción C · Próxima sesión con Cursor / Cody / otra AI

1. Abre el repo en el editor que sea
2. Pídele que lea `.patrimonio-agent/AGENTS.md`, después `handoff/PATRIMONIO-HANDOFF-V5.md`, después `TODO.md`
3. Pídele que resuma antes de hacer cambios

---

## Paso 5 · Cómo invocar los workflows

Cualquier AI con acceso al repo puede ejecutar workflows. Sintaxis:

> "Andrés: ejecuta el workflow `fix-trm-manual`"

La AI:
1. Lee `.patrimonio-agent/workflows/fix-trm-manual.md`
2. Ejecuta paso 1, te muestra resultado
3. Te pregunta si continuar con paso 2
4. Y así hasta el final

Workflows disponibles:
- `fix-trm-manual` — corregir TRMs mal calculadas en D1
- `bug-diagnosis` — diagnosticar un bug
- `feature-implementation` — implementar feature del backlog
- `release-deploy` — deploy con verificación
- `add-system-category` — agregar categoría sistema
- `manual-d1-query` — protocolo seguro para queries D1

---

## Paso 6 · Cómo invocar los prompts

Para tareas one-shot:

> "Andrés: usa el prompt `generate-import-json` sobre `mi-csv-nuevo.csv`"
>
> "Andrés: usa el prompt `verify-import-integrity` para validar el último import"

---

## Paso 7 · Tu rol entre sesiones

Eres el "product owner" + "deploy operator". Las AIs proponen, tú aprueba. Las AIs nunca hacen commits ni push sin tu OK.

Si una sesión deja algo a medias, la próxima AI lee el handoff actualizado y sabe dónde continuar.

Cuando una sesión cierre cosas grandes, **pídele que actualice TODO.md y/o cree el handoff V6**.

---

## Lo que la próxima AI debe saber al instante

Resumen de 30 segundos para que una AI nueva entienda el contexto:

> "Soy Andrés, freelancer de BRIX Templates. Construí Patrimonio (app de finanzas personales) con varias instancias de Claude. Stack: Vite + React + Cloudflare Pages + D1 + Hono + Clerk. Está en producción en `https://finance-app-678.pages.dev`. Tengo bugs vivos (G, H bloqueantes; C2/D/E pospuestos), features grandes pendientes (F2 diezmos, F4 wallets, F5 recurrentes, F6 attachments). El handoff V5 tiene todo el detalle. Los workflows del agente cubren las tareas repetitivas. Tu trabajo es ayudarme a cerrar bugs y avanzar features sin romper lo que ya funciona."

---

## Nota sobre tokens / costo

Cada vez que arranques una sesión nueva, la AI lee el handoff y los archivos relevantes. Eso usa tokens, pero **mucho menos que reexplicarle el contexto cada vez**. Después de leer, la AI puede hacer cambios sin recargar todo en cada turno.

Si vas a una sesión corta (1 bug), basta con el handoff + 1 workflow.
Si vas a una sesión larga (feature nueva), pídele que lea handoff + TODO + spec correspondiente.

---

**Fin del README. Buena suerte con el resto de la app.**
