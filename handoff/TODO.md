# Patrimonio · TODO

> Lista viva de pendientes. Actualizada sesión 7 (2026-05-16).

---

## Bugs activos

- [ ] CSV import: verificar que usa "Total Item" (con IVA) y no "Unit Price" (sin IVA). Andrés reportó que el total importado es menor que el real.

---

## Mejoras UX pendientes

- [ ] Botón "Duplicar categoría" en `/categories`
- [ ] Botón para asociar transacción existente a compromisos de diezmo (link manual)
- [ ] Wizard "Otro" plataforma: reset customPlatform cuando se cierra el wizard

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
- [ ] Bundle splitting (warning Vite >500kB)
- [ ] Migrar Clerk middleware deprecado (`@hono/clerk-auth`) a equivalente moderno

---

**Fin del TODO.**
