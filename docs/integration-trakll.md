# trakll → patrimonio integration

When an invoice is marked **paid** in trakll, trakll POSTs an income transaction to patrimonio (fire-and-forget).

## Endpoint

`POST /api/integrations/trakll/income`

### Auth

Header `X-Integration-Secret` must match `TRAKLL_INTEGRATION_SECRET` (server-to-server; not a Clerk token).

### Body (JSON)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `externalId` | string | yes | trakll invoice id (idempotency key) |
| `amount` | number | yes | Decimal major units (trakll `totalCents / 100`) |
| `currency` | `USD` \| `COP` \| `EUR` | yes | Other trakll currencies are skipped client-side |
| `date` | `YYYY-MM-DD` | yes | Payment date |
| `concept` | string | yes | e.g. `Factura 2026-001 · Client` |
| `clientName` | string | no | |
| `invoiceNumber` | string | no | |
| `issueDate` | `YYYY-MM-DD` | no | |

### Response

- `200 { id, created: true }` — new income transaction
- `200 { id, created: false }` — idempotent replay (same `externalId`)
- `401` — bad or missing secret
- `400` — validation error
- `422` — no income category available
- `503` — `TRAKLL_INTEGRATION_USER_ID` not configured

## Idempotency

Stored in `transactions.notes` as `trakll:invoice:{externalId}`. No extra migration columns.

## Category

1. Settings key `trakllIncomeCategoryId` (number), if set and valid income category
2. Else first income category for the integration user (lowest id)

Set via SQL or future settings UI:

```sql
INSERT INTO settings (key, user_id, value)
VALUES ('trakllIncomeCategoryId', '<clerk_user_id>', 42);
```

## Exchange rates

Server fetches TRM (datos.gov.co) and EUR/USD (Frankfurter) at sync time, then uses `getEquivalentAmounts` like manual income entry. Tithe commitments are auto-created when applicable.

## Env vars (patrimonio)

| Variable | Description |
|----------|-------------|
| `TRAKLL_INTEGRATION_SECRET` | Shared secret (same value as trakll) |
| `TRAKLL_INTEGRATION_USER_ID` | Clerk user id owning synced transactions |

## Env vars (trakll)

| Variable | Description |
|----------|-------------|
| `PATRIMONIO_API_URL` | Base URL including `/api`, e.g. `https://finance-app.example.workers.dev/api` |
| `PATRIMONIO_INTEGRATION_SECRET` | Shared secret |

If either trakll var is unset, sync is disabled (invoice update still succeeds).
