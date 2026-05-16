# Patrimonio · TODO

> Lista viva de pendientes. Actualizada sesión 8 (2026-05-16).

---

## Bugs activos

- [ ] CSV import: verificar que usa "Total Item" (con IVA) y no "Unit Price" (sin IVA). Andrés reportó que el total importado es menor que el real. (Investigado: parser usa columna correcta, puede ser issue específico de un CSV)

---

## Mejoras UX pendientes

- [x] Botón "Duplicar categoría" en `/categories` — Done: commit 9e8b63a
- [x] Botón para asociar transacción existente a compromisos de diezmo (link manual) — Done: commit 85b3bb8
- [x] Wizard "Otro" plataforma: reset customPlatform cuando se cierra el wizard — Done: commit 9e8b63a

---

## Backlog próximas sesiones

### Sistema F4 — Wallets/Cuentas
- [ ] Tabla `accounts`, balances iniciales, FK en transacciones
- [ ] Migración de `paymentMethod` (string) a FK
- [ ] Conciliación

### Sistema F5 — Pagos recurrentes
- [ ] Tabla `subscriptions`, alertas, auto-creación de transacciones

### Sistema F6 — Storage attachments
- [ ] Cloudflare R2, viewer en popup, export ZIP

---

## Mejoras técnicas
- [x] Bundle splitting (warning Vite >500kB) — Done: commit 1992c9a. Main bundle: 1527kB → 769kB
- [ ] Migrar Clerk middleware deprecado (`@hono/clerk-auth`) a equivalente moderno

---

**Fin del TODO.**
