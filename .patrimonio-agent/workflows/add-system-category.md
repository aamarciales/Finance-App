# Workflow · Agregar categoría sistema

> Cómo agregar una nueva categoría al catálogo de las 22 sistema.

---

## Cuándo

Solo si Andrés explícitamente pide agregar una categoría nueva al catálogo SISTEMA (todas los usuarios la ven). Para categorías personales suyas, él las crea desde la UI.

---

## Paso 1 · Verificar que no existe una similar

Leer las 22 categorías actuales en `src/server/routes/admin.ts` SYSTEM_CATEGORIES. Confirmar que la nueva no es duplicado o sinónimo.

---

## Paso 2 · Decidir tipo + color + icon

Elegir:
- `type: 'income' | 'expense'`
- `color`: hex que combine con paleta (#10B981 verde, #3B82F6 azul, #F59E0B ámbar, #EF4444 rojo, #8B5CF6 violeta, etc.). Evitar colores ya muy usados.
- `icon`: nombre de icono lucide-react (ver https://lucide.dev/icons/).

---

## Paso 3 · Editar src/server/routes/admin.ts

Agregar la entrada al array SYSTEM_CATEGORIES en el lugar lógico (ingresos al final del bloque ingreso, gastos al final del bloque gasto).

```ts
{ name: 'Nueva categoría',  color: '#XXXXXX', icon: 'icon-name', type: 'expense' as const },
```

---

## Paso 4 · Build

```bash
npm run build
```

Si falla TypeScript, revisar.

---

## Paso 5 · Decidir si reseed

El seed solo corre si NO hay categorías sistema. Si Andrés ya tiene las viejas, agregar la nueva al seed NO la inserta en su DB automáticamente.

Opciones:

**Opción A — Inserción directa**: SQL directo para agregar solo esa categoría a su user.

```bash
npx wrangler d1 execute patrimonio-db --remote --command="INSERT INTO categories (user_id, name, color, icon, type, is_system) VALUES ('user_3DEHVwNjURaZfTfhcPTS0rNLOer', 'Nueva categoría', '#XXXXXX', 'icon-name', 'expense', 1);"
```

**Opción B — Re-seed completo**: solo si el catálogo cambió mucho. Wipe + seed. Pierde categorías custom del usuario.

**Opción C — Esperar al próximo wipe**: si Andrés va a re-importar pronto, agregar al seed y se aplicará en el próximo import.

Yo iría por **A** salvo que el cambio sea grande.

---

## Paso 6 · Push

```bash
git add src/server/routes/admin.ts
git commit -m "feat(categories): add 'Nueva categoría' to system catalog"
git push origin main
```

---

## Paso 7 · Verificación

Andrés abre `/categorias` o crea una transacción nueva y debe ver la nueva categoría disponible.

---

**Fin del workflow.**
