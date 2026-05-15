# `.patrimonio-agent/` — Carpeta del agente

> Esta carpeta contiene todas las instrucciones y workflows necesarios para que cualquier AI (Claude Code, Cursor, Cody, otra) trabaje sobre la app Patrimonio sin pisar lo que otra AI ya hizo.

---

## Estructura

```
.patrimonio-agent/
├── CLAUDE.md            ← instrucciones para Claude Code (auto-leído)
├── AGENTS.md            ← versión genérica para otras AIs
├── README.md            ← este archivo
├── workflows/           ← playbooks invocables paso por paso
│   ├── fix-trm-manual.md
│   ├── bug-diagnosis.md
│   ├── feature-implementation.md
│   ├── release-deploy.md
│   ├── add-system-category.md
│   └── manual-d1-query.md
├── prompts/             ← prompts especializados para tareas concretas
│   ├── generate-import-json.md
│   └── verify-import-integrity.md
└── specs/               ← specs de features pendientes
    └── import-json-button.md
```

Adicionalmente, fuera de esta carpeta pero relacionado:

```
handoff/
├── PATRIMONIO-HANDOFF-V5.md  ← handoff de la última sesión
├── PATRIMONIO-HANDOFF-V4.md  ← histórico
└── TODO.md                   ← lista viva de pendientes
```

---

## Cómo arrancar una sesión nueva con cualquier AI

### Si la AI es Claude Code

1. Abre Claude Code en `~/patrimonio`
2. La primera ejecución leerá automáticamente `CLAUDE.md` (este folder)
3. Le dices: "Lee `handoff/PATRIMONIO-HANDOFF-V5.md` y dime qué quieres saber antes de arrancar"
4. La AI debería responder con el resumen de bugs vivos y preguntarte qué quieres hacer

### Si la AI es Cursor / Cody / otra

1. Le pegas al chat: "Lee `.patrimonio-agent/AGENTS.md`, después `handoff/PATRIMONIO-HANDOFF-V5.md`, después `handoff/TODO.md`. Resume el estado actual del proyecto y los bugs vivos. Espera mi siguiente instrucción."
2. Validas que entendió antes de pedirle hacer cambios

### Si vuelves a un chat web de Claude

1. Subes los 3 archivos: `CLAUDE.md`, `PATRIMONIO-HANDOFF-V5.md`, `TODO.md`
2. Le dices: "Lee estos 3 archivos. Estoy continuando una sesión de trabajo sobre la app Patrimonio. Antes de hacer nada, dime qué entiendes del estado actual y qué workflows tienes disponibles."

---

## Cómo invocar workflows

Cuando le digas a la AI "ejecuta el workflow X" o "haz un X", debe:

1. Buscar el archivo en `.patrimonio-agent/workflows/X.md`
2. Leer todo el archivo
3. Ejecutar paso por paso, mostrando el output de cada uno
4. Pedir confirmación entre pasos críticos (UPDATE/DELETE/push)

Ejemplo de invocación:

> "Andrés: ejecuta el workflow fix-trm-manual"
> AI: lee `workflows/fix-trm-manual.md` → muestra los pasos → empieza por Paso 1 (diagnóstico) → te muestra resultado → pregunta si continuar con Paso 2.

---

## Cómo invocar prompts

Los prompts son tareas one-shot. Para invocarlos:

> "Andrés: usa el prompt generate-import-json sobre `mi-csv.csv`"

La AI lee `prompts/generate-import-json.md` y aplica las reglas para generar el JSON.

---

## Cómo trabajar entre AIs sin pisarse

### Regla 1 · Las AIs solo modifican código tras aprobación tuya

Cualquier AI debe pedir confirmación antes de:
- Crear/modificar archivos del repo
- Hacer commits
- Push a main
- Modificar D1 (UPDATE/DELETE)

### Regla 2 · Documentar en TODO.md cualquier decisión nueva

Si la AI X toma una decisión de diseño/producto, agrega entrada en `TODO.md` sección "Decisiones tomadas". Así la AI Y de la siguiente sesión la respeta.

### Regla 3 · Cerrar handoff al final de cada sesión

Si la sesión cerró bugs o agregó features, crear/actualizar el handoff:
- Si los cambios fueron menores: actualizar `PATRIMONIO-HANDOFF-V5.md`
- Si los cambios fueron grandes: crear `PATRIMONIO-HANDOFF-V6.md` y archivar el V5

### Regla 4 · No tocar otras AIs' commits sin entender

Si una AI ve un commit de otra que parece raro, pregunta antes de revertir. Hay decisiones que parecen errores pero son intencionales.

### Regla 5 · Bitácora en TODO.md

Cada sesión deja una nota en TODO.md:

```markdown
## Sesión 6 (2026-05-XX) — Claude Sonnet 4 vía Claude Code
- Cerrado: Bug H, Bug G
- Empezado: Botón import JSON (incompleto, falta validación)
- Decisión nueva: validar TRM en backend antes de aceptar transacción
```

---

## Archivos generados (NO en git)

Los archivos generados durante import (CSV, JSON, scripts Python) viven fuera del repo:
- `~/Downloads/csv_to_json.py`
- `~/Downloads/import_bulk.py`
- `~/Downloads/patrimonio-import-*.json`
- `~/Downloads/patrimonio-backup-*.json`

Si quieres versionarlos, puedes moverlos a `tools/` (carpeta del repo, gitignored si quieres). Pero NO son parte del agente.

---

## Cuándo actualizar esta carpeta

Actualizar `CLAUDE.md` o `AGENTS.md` cuando:
- Cambia una regla operativa importante
- Aparece un anti-patrón que no estaba documentado
- Cambia el stack de la app

Crear nuevo workflow cuando:
- Hay una tarea repetitiva que se hizo 2-3 veces (vale la pena consolidarla)
- Hay un protocolo de seguridad que merece documentarse

Crear nuevo prompt cuando:
- Hay una tarea específica que requiere reglas detalladas (categorización, generación de archivos, etc.)

Crear nueva spec cuando:
- Hay una feature aprobada en TODO que vale la pena describir antes de implementarla

---

**Fin del README.**
