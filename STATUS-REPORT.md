# STATUS REPORT — Patrimonio
> Generated 2026-05-17 against PATRIMONIO-HANDOFF-V4.md (handoff commit `4765463`)

---

## 1. Commits since handoff

**57 commits** between `4765463` and `ba5cf7a` (2026-05-15 to 2026-05-17).

### 2026-05-15 (session 4–5)
| Hash | Message |
|------|---------|
| `6a9b804` | docs: cierre sesión 3 - handoff V4 + tabs dashboard + nota Cobro deuda |
| `814f75f` | fix(settings): align export JSON labels with endpoints (Bug F) |
| `be288ec` | feat(import): expand invoice schema and clean system categories catalog (22 cats) |
| `f403a63` | feat(admin): add bulk-import endpoint for one-shot data import |
| `cd48b99` | fix(invoices): fetch real invoice data in QuickView instead of stub (Bug G) |
| `8692c59` | fix(api): add TRM validation guard for COP transactions (Bug H) |
| `144da23` | feat(settings): add Import JSON button with preview and validation |
| `d62ad3a` | fix(transactions): invalidate queries after intl payment wizard (Bug D) |
| `ffa93ac` | fix(wizard): use effective rate instead of official TRM for conversion pair |
| `99dec36` | fix(settings): use FileUp icon for import button consistency |
| `c2c52fc` | fix(wizard): back button as top-left icon, shorten confirm button |
| `914a35e` | fix(wizard): fix dialog positioning and layout structure |
| `42bbf5d` | fix(transactions): use category color in badges instead of hardcoded tone (Bug E) |
| `7ead8aa` | fix(categories): fix color editing with native color picker + add PUT endpoint |
| `c83c584` | docs: update TODO - all session 6 bugs closed |
| `0883ba3` | feat(invoices): add CSV import for invoices with item preview |
| `57af53a` | feat(dashboard): add period tabs (weekly, monthly, quarterly, semester, yearly, all-time) |
| `6123efc` | Fix wizard checkboxes and dashboard tabs clipping |
| `e5ac58b` | Add Plenti platform and custom input for "Otro" in wizard |
| `f935570` | Implement tithe commitments system (F2) |
| `d5108fa` | Fix build errors in tithe system |
| `8b8f546` | Fix tithe UX: category matching, payment history, generate button |
| `011e00c` | Fix generate commitments: use hook-level useApi instead of dynamic import |
| `d696acb` | Improve tithe commitments: show concept, COP equivalent, auto-refresh |
| `85b3bb8` | Add link existing transactions to tithe commitments |
| `9e8b63a` | Add duplicate category button and fix wizard platform reset |
| `0cbe7c3` | Fix tithe: remove unnecessary dynamic import, optimize link-existing query |
| `1992c9a` | Add bundle splitting for vendor dependencies |
| `b876d71` | Fix CSV invoice import: use totalPrice (with tax) for unitPrice |

### 2026-05-16 (session 6–10)
| Hash | Message |
|------|---------|
| `7c44d82` | Multi-payment tithe commitments: support partial payments |
| `d3bdf84` | Fix link-existing/debt-link: use dynamic status from commitment_payments |
| `5f3629d` | Simplify tithe system: binary pending/paid, combined debt total on dashboard |
| `6e4ec05` | Add debt status for commitments, delete payments, debt section table |
| `6a35e33` | Simplify tithe flow: link-only payments, fix cache sync, auto-recalc commitments |
| `6b1a367` | Add duplicate transaction button with pre-filled form |
| `b88ab64` | Add inline category creation in transaction form |
| `56ddf6f` | Add R2 file storage, OCR with Claude Vision, and transaction attachments |
| `48868d6` | Fix data integrity: missing DB columns, type mismatches, security |
| `71b2ef7` | Fix attachment preservation, add error boundary, polish tithe/debt/report |
| `4451a4a` | Fix wizard state reset, remove dead nav items |
| `9c6992a` | Fix debt payment dialog, remove unused dependencies |
| `5dbd9a4` | Replace framer-motion with CSS transitions, save 126KB |
| `c5ab7d3` | Fix Cloudflare build: remove incompatible lockfile |
| `1353f1f` | Multi-payment tithe commitments with dynamic status |
| `c67edea` | Use inArray instead of raw SQL for commitment payments query |
| `e49cda9` | Invoice attachments, settings UX, new user flow |
| `ee4c51f` | Invoice UX: side-by-side layout, stepper polish, save fix |
| `f5da239` | Fix file uploads: add Clerk Bearer token to fetch calls |
| `addb011` | Fix invoice uploads: add branch column, improve error handling |
| `7f4bb74` | Fix invoice validation UX + support service bill CSVs |
| `92ccc7e` | Fix invoice edit validation: null subCategory causing all items to fail |
| `cc2f893` | Invoice upload: progress bar, fixed-size sticky attachment area |
| `e9dafcd` | Add file attachment support to CSV invoice import |
| `c7613ad` | Show invoice soporte in QuickView + paperclip indicator on cards |
| `a8a55ae` | Settings: add capital disponible section, remove deuda espiritual |
| `747f7af` | Fix transaction delete: cascade tithe commitment cleanup + show errors |

### 2026-05-17 (session 11–current)
| Hash | Message |
|------|---------|
| `5caf73f` | Tithe delete protection + multi-account capital |
| `8df1d4c` | Add Google Gemini OCR + camera capture for mobile |
| `6cb930b` | Fix OCR error details + always-visible save buttons |
| `ce286f9` | Allow deleting income with pending (unpaid) tithe commitments |
| `ccf2d60` | Add OpenAI as OCR provider (GPT-4o-mini Vision) |
| `243b323` | Add JSON response format to OpenAI OCR call |
| `1effc80` | Fix OCR prompt: prevent currency conversion of amounts |
| `819d370` | Fix OCR: handle Colombian number format (dot as thousands separator) |
| `ba5cf7a` | Fix OCR: separate line total from unit price, improve prompt |

---

## 2. Bugs from handoff section "Bugs vivos al cerrar sesión 3"

### Bug C parte 2 — Orphan titheConfig IDs

**Handoff said:** Code doesn't warn when there are orphan IDs in titheConfig. App silently falls to default.

**Verdict: CLOSED**

- `src/lib/tithe.ts:3` — `warnedCategoryIds` Set for deduplication
- `src/lib/tithe.ts:32-47` — DEV-only `console.warn` when categoryId not found in config but `tithePercentByIncomeCategory` is non-empty
- `src/server/routes/admin.ts:87-90` — `wipe-my-data` deletes ALL settings rows including `titheConfig`, so wipe + reseed won't leave orphans

### Bug D — Transaction list not refreshing after intl payment wizard

**Handoff said:** After completing wizard, list requires F5 to show new rows.

**Verdict: CLOSED**

- Commit `d62ad3a` added the fix
- `src/components/transactions/IntlPaymentWizard.tsx:25` — imports `useQueryClient`
- `src/components/transactions/IntlPaymentWizard.tsx:174` — `const queryClient = useQueryClient()`
- `src/components/transactions/IntlPaymentWizard.tsx:207` — `await queryClient.invalidateQueries()` called after success

### Bug E — Category colors not reflecting in transaction badges

**Handoff said:** Editing a category color doesn't update badge colors in the transaction table.

**Verdict: CLOSED**

- Commit `42bbf5d` added the fix
- `src/components/common/Badge.tsx:28-52` — `hexToSoftBg()` helper + `color` prop with inline styles
- `src/components/transactions/TransactionsTable.tsx:183` — `<Badge color={tx.category.color}>` passes actual category color

---

## 3. Features added not in handoff plan

### 3a. Tithe Commitments System (F2)
- **Commits:** `f935570` through `1353f1f` (14+ commits)
- **Files:** `src/server/schema.ts`, `src/server/routes/tithe*.ts`, `src/pages/Tithe.tsx`, `src/hooks/useTithe*.ts`, `src/components/tithe/*`, dashboard hooks
- **Status:** Functional. Multi-payment support, dynamic status (pending/partial/paid/debt), commitment_payments junction table, link existing transactions, auto-generate from income.

### 3b. R2 File Storage & Attachments
- **Commits:** `56ddf6f`, `f5da239`, `addb011`, `cc2f893`, `e9dafcd`, `c7613ad`
- **Files:** `src/server/routes/files.ts`, `src/components/invoices/InvoiceFormDialog.tsx`, `src/components/invoices/InvoiceQuickView.tsx`, `src/components/invoices/ImportCsvDialog.tsx`, `src/components/transactions/TxFormDialog.tsx`
- **Status:** Functional. R2 bucket `patrimonio-files`, XHR upload with progress bar, soportes shown in QuickView and paperclip indicators on cards. 6 commits to fix the upload chain (auth, missing column, null vs undefined).

### 3c. OCR System (Claude, Gemini, OpenAI)
- **Commits:** `56ddf6f`, `8df1d4c`, `ccf2d60`, `243b323`, `1effc80`, `819d370`, `ba5cf7a`
- **Files:** `src/server/routes/files.ts` (OCR handler), `src/lib/ocr.ts`, `src/components/import/ImageDropzone.tsx`, `src/components/import/OcrPreviewDialog.tsx`, `src/pages/Settings.tsx`
- **Status:** Functional but OCR accuracy with Colombian receipts is still being tuned. The prompt has been revised 4 times to handle COP number formatting (dot as thousands separator). No post-OCR validation (no sum check, no tolerance). Confidence value comes from the model, not independently calculated. See Section 4 for full detail.

### 3d. Camera Capture ("Tomar Foto")
- **Commits:** `8df1d4c`
- **Files:** `src/components/import/ImageDropzone.tsx`
- **Status:** Functional. Uses `<input capture="environment">` for mobile camera access.

### 3e. Multi-Account Capital
- **Commits:** `a8a55ae` (single amount), `5caf73f` (multi-account)
- **Files:** `src/types/domain.ts`, `src/pages/Settings.tsx`, `src/hooks/useDashboard.ts`, `src/components/kpi/KpiCard.tsx`, `src/pages/Dashboard.tsx`, `src/components/common/CapitalDetailDialog.tsx`
- **Status:** Functional. Backwards-compatible with single `availableCapitalAmount`. Detail dialog shows account breakdown on Dashboard KPI click.

### 3f. Dashboard Period Tabs
- **Commits:** `57af53a`, `6123efc`
- **Files:** `src/pages/Dashboard.tsx`, `src/hooks/useDashboard.ts`
- **Status:** Functional. Monthly, weekly, quarterly, semester, yearly, all-time.

### 3g. CSV Invoice Import
- **Commits:** `0883ba3`, `b876d71`, `7f4bb74`, `e9dafcd`
- **Files:** `src/components/invoices/ImportCsvDialog.tsx`, `src/lib/csv-parser.ts`
- **Status:** Functional. Supports product invoices and service/utility bills (Claro, EPM). File attachment upload during import. Known issue from feedback: CSV may read unit price instead of total with tax (see `feedback-csv-taxes.md`).

### 3h. Inline Category Creation
- **Commits:** `b88ab64`
- **Files:** `src/components/transactions/TxFormDialog.tsx`
- **Status:** Functional. Create categories directly from transaction form.

### 3i. Duplicate Transaction
- **Commits:** `6b1a367`
- **Files:** `src/pages/Transactions.tsx`, `src/components/transactions/TransactionsTable.tsx`, `src/components/transactions/TxFormDialog.tsx`
- **Status:** Functional. Pre-fills form from existing transaction.

### 3j. Bundle Splitting & Performance
- **Commits:** `5dbd9a4` (remove framer-motion, save 126KB), `1992c9a` (vendor bundle splitting), `c5ab7d3` (Cloudflare build fix)
- **Status:** Applied. Framer-motion replaced with CSS transitions.

### 3k. Tithe-Linked Delete Protection
- **Commits:** `747f7af` (cascade delete), `ce286f9` (changed to block only when payments exist)
- **Files:** `src/server/routes/transactions.ts`
- **Status:** Functional. Blocks deletion only when tithe commitment has linked payments. Allows deletion of income with pending (unpaid) commitments, cascade-deleting the commitment.

### 3l. Import JSON (Full Data Restore)
- **Commits:** `144da23`
- **Files:** `src/components/settings/ImportJsonDialog.tsx`
- **Status:** Functional. Preview + validation before importing.

---

## 4. OCR System Current State

### Provider selection
- **Three providers available:** OpenAI (gpt-4o-mini), Google Gemini (gemini-2.0-flash), Claude (claude-sonnet-4-20250514)
- **Default:** `off` (user must select a provider in Settings and provide their own API key)
- **Provider routing:** Server reads `ocrProvider` from user's settings row in D1, routes to the selected provider's API
- **Claude** uses server-side `ANTHROPIC_API_KEY` env var; **Gemini** and **OpenAI** use user-stored API keys from `settings` table

### Key files
| Component | File |
|-----------|------|
| OCR prompt | `src/server/routes/files.ts:106-130` (`OCR_PROMPT` constant) |
| Route handler | `src/server/routes/files.ts:132-220` (`POST /api/files/ocr`) |
| Client library | `src/lib/ocr.ts` |
| Image upload UI | `src/components/import/ImageDropzone.tsx` |
| Camera capture | `src/components/import/ImageDropzone.tsx` (separate `<input capture="environment">`) |
| Result preview | `src/components/import/OcrPreviewDialog.tsx` |
| Provider setting | `src/pages/Settings.tsx` ("Importación inteligente" section) |

### How images are sent
- Image converted to **base64** server-side (line 144-145)
- **OpenAI:** Sent as `data:{mime};base64,{data}` inline URL with `detail: "high"`
- **Gemini:** Sent as `inline_data` with `mime_type` and `data` (raw base64, no data URI prefix)
- **Claude:** Sent as `source: { type: "base64", media_type, data }` in Anthropic format
- No image resizing or compression before sending

### Post-OCR validation
- **None.** No sum check, no item count validation, no total tolerance.
- The total in the preview dialog is computed client-side as `sum(quantity * price)` — if OCR returns wrong quantities or prices, the total will be wrong with no warning to the user.

### Confidence calculation
- **Model-reported.** The prompt asks the model to include a `confidence` field (0.0-1.0). This is the model's self-assessment, not an independent calculation.
- Displayed in OcrPreviewDialog as a badge: >0.9 green, >0.7 gold, else red.

### OpenAI-specific config
- Model: `gpt-4o-mini`
- `response_format: { type: 'json_object' }` forces valid JSON output
- `max_tokens: 1024`
- Error handling parses OpenAI error JSON for API key issues and quota/billing errors

### Known OCR issues
1. **Colombian number format:** Prompt has been revised 4 times. Latest version explicitly explains dot-as-thousands-separator with examples. Still producing incorrect amounts per user report (2026-05-17).
2. **No post-validation:** If the model misreads a total, there's no cross-check against the receipt's stated total.
3. **`lineTotal` field:** Recently added to prompt and OcrItem interface to separate unit price from line total. Effectiveness not yet confirmed by user.

---

## 5. Outstanding TODO / FIXME in code

Only **2** found:

| File | Line | Content |
|------|------|---------|
| `src/lib/format.ts` | 9 | `TODO: integrar dinero.js cuando` — formatting uses manual division, mentions future dinero.js integration |
| `src/lib/tax-co.ts` | 5 | `TODO: verify when DIAN publishes` — 2026 UVT value hardcoded, needs verification when DIAN publishes |

No FIXME, XXX, or HACK comments found. No console.error paths that look unfinished (all error handlers return meaningful responses).

---

## 6. Migrations applied

| File | Description |
|------|-------------|
| `0000_slim_ma_gnuci.sql` | Initial schema: categories, debts, invoice_items, invoices, settings, tithe_payments, transactions |
| `0001_handy_black_cat.sql` | Create `commitment_payments` junction table; migrate existing `tithe_payment_id` refs from `tithe_commitments` |
| `0002_certain_felicia_hardy.sql` | Create `tithe_commitments` table; add `amount_cop`, `currency`, `attachment_url` to `tithe_payments` |
| `0003_motionless_triathlon.sql` | Add `barcode` to invoice_items; add `invoice_number`, `payment_method`, `location`, `notes`, `attachment_url` to invoices |
| `0004_conscious_shotgun.sql` | Add `notes` and `attachments` columns to transactions |
| `0005_attachments.sql` | Create `goals` table |
| `0006_missing_columns.sql` | Add `is_recurring`, `capital_amount`, `interest_amount` to transactions; `is_paid` to debts |
| `0007_goals_columns.sql` | Add `description` and `monthly_contribution` to goals |
| `0008_debts_updated_at.sql` | Add `updated_at` to debts |

---

## 7. Production state

### D1 Tables (13 total)
`_cf_KV`, `categories`, `commitment_payments`, `d1_migrations`, `debts`, `goals`, `invoice_items`, `invoices`, `settings`, `sqlite_sequence`, `tithe_commitments`, `tithe_payments`, `transactions`

### Row counts for user `user_3DEHVwNjURaZfTfhcPTS0rNLOer`

| Table | Rows |
|-------|------|
| transactions | 80 |
| categories | 23 |
| invoices | 12 |
| invoice_items | 114 (global, not user-scoped) |
| tithe_commitments | 14 |
| tithe_payments | 3 |
| commitment_payments | 9 (global, not user-scoped) |
| debts | 3 |
| goals | 1 |
| settings | 6 |

### Handoff vs. now
- Transactions: 9 → **80** (+71)
- Categories: ~12 → **23** (system 22 + custom)
- Tithe commitments: 0 → **14**
- Tithe payments: 2 → **3** (+1)
- Commitment payments: 0 → **9**
- Invoices: 0 → **12**
- Debts: 0 → **3**
- Goals: 0 → **1**
- Settings rows: ~4 → **6** (added ocrProvider, geminiApiKey/openaiApiKey, capitalAccounts)
