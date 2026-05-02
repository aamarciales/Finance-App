# Patrimonio · App de finanzas personales

> Aplicación web de finanzas personales **multi-moneda (USD/COP)** con OCR de facturas, seguimiento de diezmos y ofrendas, metas de ahorro, deudas, e impuestos colombianos. Diseñada para freelancers que cobran en USD viviendo en Colombia.

---

## 📋 Tabla de contenidos

1. [Contexto del usuario](#contexto-del-usuario)
2. [Stack técnico](#stack-técnico)
3. [Sistema de diseño](#sistema-de-diseño)
4. [Arquitectura](#arquitectura)
5. [Modelo de datos (IndexedDB)](#modelo-de-datos-indexeddb)
6. [Features detalladas por sección](#features-detalladas-por-sección)
7. [Lógica de negocio crítica](#lógica-de-negocio-crítica)
8. [OCR de facturas](#ocr-de-facturas)
9. [Importación CSV](#importación-csv)
10. [Sección de impuestos](#sección-de-impuestos)
11. [Responsive y mobile](#responsive-y-mobile)
12. [Plan de implementación por fases](#plan-de-implementación-por-fases)

---

## Contexto del usuario

- **Andrés** — freelancer venezolano residente en Colombia (Bogotá).
- **Ingresos**: principalmente en USD vía Wise/transferencias internacionales (BRIX Templates u otros clientes), eventualmente sueldo en COP.
- **Gastos**: mayormente en COP (vida cotidiana en Colombia).
- **Compromiso espiritual**: adventista, devuelve diezmo (10%) y da ofrendas (10% sobre freelance, 5% sobre sueldo regular).
- **Objetivo de la app**: control total de sus finanzas con visibilidad multi-moneda, drill-down de facturas (foto → ítems), y herramientas de ahorro/inversión y planificación tributaria.

---

## Stack técnico

### Core
- **Vite** + **React 18** + **TypeScript** (strict mode)
- **Tailwind CSS** con tokens personalizados (ver [Sistema de diseño](#sistema-de-diseño))
- **shadcn/ui** para componentes base (Button, Dialog, Input, Select, Tabs, Toast, etc.)

### Estado y datos
- **Dexie.js** — wrapper de IndexedDB para persistencia local
- **TanStack Query** (React Query) — cache y sincronización del estado del servidor (TRM API)
- **Zustand** — estado UI global ligero (tema, filtros activos, modales)

### Formularios y validación
- **react-hook-form** + **zod** — formularios tipados con validación

### Visualización
- **Recharts** — gráficas (line, bar, doughnut, stacked bar)
- **lucide-react** — iconos

### Utilidades
- **date-fns** — manejo de fechas en español
- **papaparse** — parser CSV
- **dinero.js v2** — manejo seguro de montos monetarios (evita errores de coma flotante)

### Externos (opcionales pero recomendados)
- **Banco de la República** API pública para TRM oficial diaria
- **Anthropic SDK** (`@anthropic-ai/sdk`) — OCR de facturas con Claude vision
- **Cloudflare Workers** — proxy para proteger la API key de Anthropic

### Dev tooling
- **ESLint** + **Prettier**
- **Vitest** para tests unitarios de lógica crítica (cálculos de diezmo, conversión de moneda, etc.)

---

## Sistema de diseño

### Filosofía
**Minimalismo cálido tipo Mercury × revista financiera.** Fondo crema en lugar de blanco puro (cómodo para uso diario), serif editorial para títulos y números grandes, monospace para cifras, acento verde profundo y dorado tenue. Cero gradientes ruidosos, cero "AI slop".

### Tokens de color (Tailwind config)

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: '#fafaf7',           // fondo de la app
        surface: '#ffffff',       // fondo de cards
        'surface-2': '#f4f3ee',   // fondo secundario / hover
        'surface-3': '#ecebe4',
        border: '#e8e6df',
        'border-strong': '#d4d1c7',
        text: '#1a1a17',
        'text-muted': '#6b6960',
        'text-faint': '#9a978d',
        accent: '#2d4a3e',        // verde profundo principal
        'accent-hover': '#1f3329',
        'accent-soft': '#d9e2dc',
        warm: '#c4621d',          // naranja terracota
        'warm-soft': '#f5e4d3',
        danger: '#a83e2b',
        'danger-soft': '#f0d9d2',
        gold: '#b8923a',          // diezmo y ofrendas
        'gold-soft': '#ede2c5',
        info: '#4a6e8a',
        'info-soft': '#d8e2eb',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '12px',
      },
    },
  },
}
```

### Tipografía

Cargar desde Google Fonts en `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
```

**Reglas de uso**:
- **Fraunces** (serif): títulos grandes (`page-title`, `card-title`, valores KPI grandes). Usa `font-style: italic` para acentos especiales (ej. el nombre del usuario en el saludo, o palabras destacadas en banners).
- **Geist** (sans): UI general, labels, párrafos, botones.
- **JetBrains Mono**: TODA cifra numérica (montos, TRM, fechas en formato corto, porcentajes). Esto garantiza alineación perfecta y look profesional.

### Espaciado y radios
- Cards: `padding: 22px 24px`, `border-radius: 10px`, `border: 1px solid var(--border)`.
- Botones: `padding: 8px 14px`, `border-radius: 6px`.
- Inputs: `padding: 9px 12px`, `border-radius: 6px`.

### Componentes especiales

#### Tarjeta de diezmo
Fondo gradiente cálido `linear-gradient(160deg, #fbf7ed 0%, #f5ecd3 100%)`, borde dorado tenue, tipografía italic en el total, nota citando escritura en estilo editorial.

#### Banner de insight (dashboard)
Fondo verde profundo `linear-gradient(135deg, #1a3a2e 0%, #2d4a3e 100%)`, texto crema `#f0ede4`, énfasis en dorado claro `#d4c693`, halo radial sutil arriba a la derecha.

#### KPI cards
Fondo blanco, valor grande en serif (Fraunces 26px), label en uppercase pequeño con letter-spacing, secondary line en monospace, badge de tendencia (↗ +12.4%) flotando arriba a la derecha.

### Iconografía
**Lucide React**, stroke `1.8px` por defecto, `2px` para acciones, opacidad 0.85 en estados normales.

---

## Arquitectura

### Estructura de carpetas

```
patrimonio/
├── src/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MobileNav.tsx       # menú desplegable mobile
│   │   │   ├── TopBar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── transactions/
│   │   │   ├── TxList.tsx
│   │   │   ├── TxRow.tsx
│   │   │   ├── TxFormDialog.tsx
│   │   │   └── InvoiceDetailDialog.tsx
│   │   ├── charts/
│   │   │   ├── CashflowChart.tsx
│   │   │   ├── CategoryDoughnut.tsx
│   │   │   ├── TrendBars.tsx
│   │   │   └── TitheHistory.tsx
│   │   ├── kpi/
│   │   │   └── KpiCard.tsx
│   │   ├── tithe/
│   │   │   └── TitheSummaryCard.tsx
│   │   ├── upload/
│   │   │   ├── ImageDropzone.tsx
│   │   │   ├── CsvDropzone.tsx
│   │   │   └── OcrPreviewDialog.tsx
│   │   └── common/
│   │       ├── Money.tsx           # componente de display de montos
│   │       ├── Badge.tsx
│   │       └── EmptyState.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Invoices.tsx
│   │   ├── Import.tsx
│   │   ├── Categories.tsx
│   │   ├── Tithe.tsx
│   │   ├── Goals.tsx
│   │   ├── Debts.tsx
│   │   ├── Taxes.tsx
│   │   └── Settings.tsx
│   ├── db/
│   │   ├── schema.ts               # Dexie schema
│   │   ├── seed.ts                 # datos de ejemplo
│   │   └── migrations.ts
│   ├── hooks/
│   │   ├── useTransactions.ts
│   │   ├── useTRM.ts
│   │   ├── useTithe.ts
│   │   ├── useGoals.ts
│   │   ├── useDebts.ts
│   │   └── useSettings.ts
│   ├── lib/
│   │   ├── currency.ts             # conversiones, dinero.js helpers
│   │   ├── tithe.ts                # cálculos de diezmo y ofrendas
│   │   ├── tax-co.ts               # umbrales DIAN, UVT, etc.
│   │   ├── ocr.ts                  # cliente OCR (Anthropic)
│   │   ├── csv-parser.ts           # parsers por banco
│   │   ├── format.ts               # formatters de moneda, fecha, %
│   │   └── trm-api.ts              # cliente Banco de la República
│   ├── stores/
│   │   └── ui-store.ts             # zustand
│   ├── types/
│   │   ├── domain.ts               # Transaction, Invoice, Goal, Debt, etc.
│   │   └── api.ts
│   ├── routes/
│   │   └── index.tsx               # React Router
│   ├── App.tsx
│   └── main.tsx
├── public/
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Routing

Usar **React Router v6**. Rutas:
- `/` → Dashboard
- `/transactions`
- `/invoices`
- `/invoices/:id` → detalle
- `/import`
- `/categories`
- `/tithe`
- `/goals`
- `/debts`
- `/taxes`
- `/settings`

---

## Modelo de datos (IndexedDB)

Usa **Dexie.js**. Define schema versionado para futuras migraciones.

### Tablas

```typescript
// src/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Transaction {
  id?: number;                          // auto-increment
  date: string;                         // ISO 8601
  type: 'expense' | 'income_freelance' | 'income_salary' | 'transfer' | 'tithe_payment' | 'offering_payment';
  concept: string;
  categoryId: number;                   // FK
  amount: number;                       // monto en moneda original (en cents para precisión)
  currency: 'COP' | 'USD';
  trm: number;                          // TRM del día (COP por USD)
  amountInBase: number;                 // siempre en USD (moneda base configurada)
  amountInSecondary: number;            // siempre en COP
  notes?: string;
  invoiceId?: number;                   // FK opcional → Invoice
  attachmentIds?: number[];             // FK → Attachment
  isRecurring?: boolean;
  recurringId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id?: number;
  transactionId: number;                // FK
  merchant: string;                     // ej. "D1 Chapinero"
  branch?: string;
  date: string;
  total: number;                        // en cents
  currency: 'COP' | 'USD';
  trm: number;
  itemCount: number;
  ocrConfidence?: number;               // 0-100, si vino de OCR
  rawOcrData?: object;                  // backup del JSON original
  createdAt: string;
}

export interface InvoiceItem {
  id?: number;
  invoiceId: number;                    // FK
  name: string;                         // "Arroz Diana 5kg"
  quantity: number;                     // 1, 2, 3...
  unitPrice?: number;                   // opcional
  totalPrice: number;                   // en cents
  subCategory?: string;                 // "Despensa", "Frutas", "Aseo"
  notes?: string;
}

export interface Category {
  id?: number;
  name: string;                         // "Supermercado", "Comida fuera"
  parentId?: number;                    // para subcategorías
  color: string;                        // hex
  icon: string;                         // nombre lucide
  type: 'expense' | 'income';
  isSystem: boolean;                    // categorías por defecto no se borran
}

export interface Attachment {
  id?: number;
  type: 'image' | 'pdf' | 'csv';
  filename: string;
  mimeType: string;
  size: number;                         // bytes
  blob: Blob;                           // archivo en IndexedDB
  thumbnail?: Blob;                     // para imágenes
  transactionId?: number;
  invoiceId?: number;
  createdAt: string;
}

export interface Goal {
  id?: number;
  name: string;
  description?: string;
  iconKey: string;                      // 'shield', 'laptop', 'plane', etc.
  color: string;
  targetAmount: number;                 // en cents
  currentAmount: number;
  currency: 'USD' | 'COP';
  monthlyContribution?: number;
  targetDate?: string;
  createdAt: string;
}

export interface Debt {
  id?: number;
  name: string;
  creditor: string;
  type: 'credit_card' | 'personal_loan' | 'family_loan' | 'mortgage' | 'other';
  originalAmount: number;
  currentBalance: number;
  currency: 'COP' | 'USD';
  interestRate: number;                 // % E.A.
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  nextPaymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface TithePayment {
  id?: number;
  date: string;
  destination: string;                  // "Iglesia Bogotá Central"
  tithesAmount: number;                 // diezmo en cents
  offeringsAmount: number;              // ofrendas en cents
  currency: 'USD' | 'COP';
  trm: number;
  notes?: string;
  txId: number;                         // FK → Transaction
}

export interface TRMRecord {
  date: string;                         // PK 'YYYY-MM-DD'
  rate: number;
  source: 'banrep' | 'manual' | 'wise';
  fetchedAt: string;
}

export interface ExchangeOperation {
  id?: number;
  date: string;
  fromCurrency: 'USD' | 'COP';
  toCurrency: 'USD' | 'COP';
  fromAmount: number;
  toAmount: number;
  effectiveRate: number;                // rate REAL al que cambió (no TRM oficial)
  platform?: string;                    // "Wise", "Binance P2P", "Banco"
  fees?: number;
  notes?: string;
}

export interface Setting {
  key: string;                          // PK
  value: any;                           // JSON
}

// settings keys esperados:
// - 'baseCurrency' → 'USD' | 'COP'
// - 'secondaryCurrency'
// - 'titheConfig' → { freelanceTithe: 10, freelanceOffering: 10, salaryTithe: 10, salaryOffering: 5, destination: '...' }
// - 'taxProfile' → { residentStatus: 'resident', regime: 'simple', activityCode: '...', isVATResponsible: false, validatedByAccountant: false }
// - 'ocrProvider' → 'claude' | 'tesseract' | 'off'
// - 'autoCategorize' → boolean
// - 'monthlyTaxProvisionRate' → 0.02

export class PatrimonioDB extends Dexie {
  transactions!: Table<Transaction, number>;
  invoices!: Table<Invoice, number>;
  invoiceItems!: Table<InvoiceItem, number>;
  categories!: Table<Category, number>;
  attachments!: Table<Attachment, number>;
  goals!: Table<Goal, number>;
  debts!: Table<Debt, number>;
  tithePayments!: Table<TithePayment, number>;
  trmRecords!: Table<TRMRecord, string>;
  exchangeOps!: Table<ExchangeOperation, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('PatrimonioDB');
    this.version(1).stores({
      transactions: '++id, date, type, categoryId, currency, invoiceId, [date+type]',
      invoices: '++id, transactionId, date, merchant',
      invoiceItems: '++id, invoiceId, subCategory',
      categories: '++id, name, type, parentId',
      attachments: '++id, transactionId, invoiceId, type',
      goals: '++id, targetDate',
      debts: '++id, type, nextPaymentDate',
      tithePayments: '++id, date, txId',
      trmRecords: 'date',
      exchangeOps: '++id, date',
      settings: 'key',
    });
  }
}

export const db = new PatrimonioDB();
```

### Categorías por defecto (seed)

```typescript
const DEFAULT_CATEGORIES = [
  { name: 'Supermercado', color: '#2d4a3e', icon: 'shopping-cart', type: 'expense' },
  { name: 'Comida fuera', color: '#b8923a', icon: 'utensils', type: 'expense' },
  { name: 'Transporte', color: '#c4621d', icon: 'car', type: 'expense' },
  { name: 'Servicios', color: '#5a4ea0', icon: 'globe', type: 'expense' },
  { name: 'Salud', color: '#4a6e8a', icon: 'heart-pulse', type: 'expense' },
  { name: 'Educación', color: '#7a4a6e', icon: 'book-open', type: 'expense' },
  { name: 'Hogar', color: '#8a6a4a', icon: 'home', type: 'expense' },
  { name: 'Diezmo', color: '#b8923a', icon: 'shield', type: 'expense' },
  { name: 'Ofrendas', color: '#d4b974', icon: 'heart', type: 'expense' },
  { name: 'Deuda', color: '#a83e2b', icon: 'credit-card', type: 'expense' },
  { name: 'Impuestos', color: '#4a6e8a', icon: 'file-text', type: 'expense' },
  { name: 'Otros', color: '#9a978d', icon: 'more-horizontal', type: 'expense' },
  { name: 'Freelance', color: '#2d4a3e', icon: 'briefcase', type: 'income' },
  { name: 'Sueldo', color: '#2d4a3e', icon: 'wallet', type: 'income' },
  { name: 'Otros ingresos', color: '#9a978d', icon: 'plus-circle', type: 'income' },
];
```

---

## Features detalladas por sección

> **Importante**: el HTML estático `patrimonio-app.html` en este repo es la **referencia visual y de comportamiento autoritativa**. Tu trabajo es replicar fielmente su look, layout, tipografía y micro-interacciones, pero con datos reales desde IndexedDB.

### 1. Dashboard (`/`)
- Saludo dinámico ("Buenos días/tardes/noches, *Andrés*").
- Subtítulo con mes y año actual en español.
- Banner de insight (regla simple: comparar gasto del mes vs promedio de los últimos 3 meses por categoría top).
- 4 KPIs: Ingresos, Gastos, Disponible, Tasa efectiva del mes.
  - Cada KPI muestra valor primario + equivalente en moneda secundaria + badge de tendencia vs mes anterior.
- Gráfica de cashflow (línea, 6 meses, ingresos vs gastos).
- Tarjeta de diezmo y ofrendas pendientes.
- Lista de últimas 6-8 transacciones (clic en factura abre drill-down).
- Doughnut de distribución del gasto por categoría con leyenda lateral.

### 2. Transacciones (`/transactions`)
- Tabla completa con filtros: período, tipo, categoría, búsqueda por concepto.
- Tabs: Todas / Ingresos / Gastos / Recurrentes.
- Columnas: Fecha, Concepto, Categoría (badge), Monto, Equivalente, TRM, acciones.
- Click en fila con `invoiceId` → abre `InvoiceDetailDialog`.
- Paginación o virtualización (`react-virtual`) si hay >100 filas.
- Botón "+ Nueva transacción" abre `TxFormDialog`.

### 3. Facturas (`/invoices`)
- Grid de cards (3 columnas en desktop, 1 en mobile).
- Cada card: ícono de categoría, badge con cantidad de ítems, nombre del establecimiento, fecha, total COP, equivalente USD.
- Click → abre `InvoiceDetailDialog` con:
  - Header: nombre, fecha, hora, TRM del día.
  - Summary: ítems, total COP, total USD.
  - Lista completa de ítems con sub-categoría.
  - Strip de adjuntos (foto factura, PDF, etc.) con opción de añadir más.
  - Botones: Editar, Cerrar.

### 4. Importar (`/import`)
Dos zonas paralelas:

**Zona 1: Foto de factura (OCR)**
- Dropzone que acepta JPG/PNG/HEIC/PDF.
- Al soltar → muestra spinner "Procesando imagen…".
- Llama a `lib/ocr.ts` → endpoint Cloudflare Worker que invoca Claude vision.
- Recibe JSON estructurado → abre `OcrPreviewDialog` con confianza, datos extraídos editables, y botón "Confirmar y crear transacción".
- Al confirmar → crea Invoice + InvoiceItems + Transaction + Attachment (la foto original).

**Zona 2: CSV/XLSX**
- Dropzone para extractos bancarios.
- Detección automática del banco por columnas (Bancolombia, Davivienda, Wise, Binance).
- Si no detecta → wizard de mapeo de columnas (qué columna es fecha, monto, concepto, etc.).
- Vista previa antes de importar → permite excluir filas.
- Importación masiva con progreso.

**Lista de importaciones recientes** abajo: archivo, tipo, fecha, cantidad de transacciones, estado.

### 5. Categorías (`/categories`)
- Stacked bar chart de tendencia por categoría (últimos 3-6 meses).
- Lista de top categorías con barras de progreso relativas, totales acumulados, ítem count.
- Filtro de período: Mes / Trimestre / Año.

### 6. Diezmo & Ofrendas (`/tithe`)
- Título grande con frase escritural.
- 4 KPIs: Diezmo del mes, Ofrendas del mes, Devuelto este mes (vs pendiente), Total año en curso.
- Configuración por tipo de ingreso (lectura — la edición está en Settings):
  - Card freelance: 10% + 10% (verde)
  - Card sueldo regular: 10% + 5% (dorado)
- Histórico mensual (gráfica de barras agrupadas: diezmo vs ofrendas).
- Tabla de devoluciones pasadas: fecha, concepto, destino, diezmo, ofrenda, total USD.
- Botón "+ Registrar devolución" → modal:
  - Fecha, tipo (mensual / pacto / proyecto), destino, diezmo USD, ofrenda USD.
  - Crea TithePayment + Transaction (categoría Diezmo u Ofrendas).

### 7. Metas de ahorro (`/goals`)
- Grid de cards (3 columnas).
- Cada card: ícono, nombre, descripción, valor actual, valor objetivo, %, barra de progreso, aporte mensual estimado, fecha estimada de logro.
- Botón "+ Nueva meta" → modal con campos: nombre, ícono (selector), color, monto objetivo, moneda, aporte mensual, fecha objetivo.
- Card de "Sugerencia para Andrés" con cálculo dinámico:
  - `disponibleMensual = ingresoPromedio - diezmoPromedio - ofrendaPromedio - gastosFijosPromedio - cuotasDeudasMensuales`
  - Si destinas X% a metas, ¿cuándo terminas cada una?

### 8. Deudas (`/debts`)
- 4 KPIs: Deuda total, Cuota mensual total (con % de ingresos), Intereses año en curso, Estimación libre de deudas.
- Tabla cronograma: deuda, acreedor, saldo, cuota, tasa, progreso (barra + cuotas pagadas), próximo pago.
- Card de estrategia recomendada: aplicar método **avalancha** (priorizar deudas con tasa más alta).
- Botón "+ Nueva deuda" → modal con campos completos.

### 9. Impuestos (`/taxes`)
Ver sección [Sección de impuestos](#sección-de-impuestos) más abajo.

### 10. Ajustes (`/settings`)
Tabs o secciones:
- **Monedas**: moneda base, secundaria, fuente de TRM.
- **Diezmo y ofrendas**: porcentajes editables, destino predeterminado.
- **Perfil tributario**: residencia, régimen, actividad económica, si es responsable de IVA, checkbox "validado por contador".
- **Datos & privacidad**: exportar JSON, importar backup, borrar todo.
- **Importación**: provider de OCR, categorización automática.

---

## Lógica de negocio crítica

### `lib/currency.ts`

Usa **dinero.js v2** o **decimal.js** para evitar errores de coma flotante. **NUNCA hagas `0.1 + 0.2` con números nativos** para montos.

```typescript
export function convertAmount(
  amount: number,
  fromCurrency: 'USD' | 'COP',
  toCurrency: 'USD' | 'COP',
  trm: number
): number {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === 'USD' && toCurrency === 'COP') return amount * trm;
  if (fromCurrency === 'COP' && toCurrency === 'USD') return amount / trm;
  throw new Error('Invalid currency pair');
}

// Tasa efectiva ponderada del mes
// Solo cuenta operaciones REALES de cambio (USD→COP o COP→USD), no compras directas.
export function calculateEffectiveRate(operations: ExchangeOperation[]): number {
  const usdToCop = operations.filter(op => op.fromCurrency === 'USD');
  if (usdToCop.length === 0) return 0;
  const totalUSD = usdToCop.reduce((sum, op) => sum + op.fromAmount, 0);
  const totalCOP = usdToCop.reduce((sum, op) => sum + op.toAmount, 0);
  return totalCOP / totalUSD;
}
```

### `lib/tithe.ts`

```typescript
import { db } from '@/db/schema';

interface TitheConfig {
  freelanceTithe: number;      // %
  freelanceOffering: number;
  salaryTithe: number;
  salaryOffering: number;
}

export function calculateTitheForIncome(
  incomeAmount: number,
  incomeType: 'income_freelance' | 'income_salary',
  config: TitheConfig
): { tithe: number; offering: number; total: number; pctTotal: number } {
  if (incomeType === 'income_freelance') {
    const tithe = incomeAmount * (config.freelanceTithe / 100);
    const offering = incomeAmount * (config.freelanceOffering / 100);
    return {
      tithe,
      offering,
      total: tithe + offering,
      pctTotal: config.freelanceTithe + config.freelanceOffering,
    };
  } else {
    const tithe = incomeAmount * (config.salaryTithe / 100);
    const offering = incomeAmount * (config.salaryOffering / 100);
    return {
      tithe,
      offering,
      total: tithe + offering,
      pctTotal: config.salaryTithe + config.salaryOffering,
    };
  }
}

// Pendiente de devolver = lo apartado por todos los ingresos del mes − lo ya devuelto
export async function getPendingTithe(
  monthStart: string,
  monthEnd: string
): Promise<{ pendingTithe: number; pendingOffering: number; total: number }> {
  const incomes = await db.transactions
    .where('date').between(monthStart, monthEnd)
    .filter(t => t.type === 'income_freelance' || t.type === 'income_salary')
    .toArray();

  const config = (await db.settings.get('titheConfig'))?.value as TitheConfig;

  let totalTithe = 0;
  let totalOffering = 0;

  for (const income of incomes) {
    // Siempre calculado en USD (moneda base)
    const { tithe, offering } = calculateTitheForIncome(
      income.amountInBase,
      income.type as any,
      config
    );
    totalTithe += tithe;
    totalOffering += offering;
  }

  const payments = await db.tithePayments
    .where('date').between(monthStart, monthEnd).toArray();

  const paidTithe = payments.reduce((sum, p) => sum + p.tithesAmount, 0);
  const paidOffering = payments.reduce((sum, p) => sum + p.offeringsAmount, 0);

  return {
    pendingTithe: Math.max(0, totalTithe - paidTithe),
    pendingOffering: Math.max(0, totalOffering - paidOffering),
    total: Math.max(0, (totalTithe + totalOffering) - (paidTithe + paidOffering)),
  };
}
```

### `lib/trm-api.ts`

Banco de la República expone TRM oficial vía dataset abierto:
```
https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde='YYYY-MM-DDT00:00:00.000'
```

```typescript
export async function fetchTRM(date: string): Promise<number | null> {
  // Intenta cache local primero
  const cached = await db.trmRecords.get(date);
  if (cached) return cached.rate;

  try {
    const url = `https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde='${date}T00:00:00.000'`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.[0]?.valor) {
      const rate = parseFloat(data[0].valor);
      await db.trmRecords.put({ date, rate, source: 'banrep', fetchedAt: new Date().toISOString() });
      return rate;
    }
  } catch (e) {
    console.error('TRM fetch failed', e);
  }
  return null;
}
```

---

## OCR de facturas

### Arquitectura

Frontend → Cloudflare Worker → Anthropic API → respuesta JSON.

**No pongas la API key de Anthropic en el frontend bajo ninguna circunstancia.** Usa un Cloudflare Worker (Andrés ya tiene experiencia con esto):

```javascript
// worker.js
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    // Validación básica de origen
    const origin = request.headers.get('Origin');
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });

    const { imageBase64, mimeType } = await request.json();

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: OCR_PROMPT },
          ],
        }],
      }),
    });

    const data = await claudeRes.json();
    const text = data.content?.[0]?.text || '';
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

    return new Response(JSON.stringify(json), {
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  },
};
```

### Prompt para OCR

```text
Eres un asistente que extrae datos estructurados de fotos de facturas de supermercados y comercios colombianos. Analiza la imagen y devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura:

{
  "merchant": "string — nombre del establecimiento (D1, Éxito, Carulla, Olímpica, Jumbo, etc.)",
  "branch": "string — sucursal o ubicación si es visible, sino null",
  "date": "YYYY-MM-DD — fecha de la compra",
  "time": "HH:MM — hora si es visible, sino null",
  "total": número — total final de la factura en pesos colombianos (sin separadores de miles, sin símbolo),
  "currency": "COP",
  "itemCount": número — cantidad total de líneas de ítems,
  "items": [
    {
      "name": "string — nombre legible del producto",
      "quantity": número — cantidad,
      "unitPrice": número o null,
      "totalPrice": número — precio total de esa línea,
      "subCategory": "Despensa" | "Frutas" | "Verduras" | "Refrigerados" | "Panadería" | "Aseo" | "Bebidas" | "Snacks" | "Carnes" | "Otros"
    }
  ],
  "confidence": número entre 0 y 100 — qué tan seguro estás de la extracción
}

Reglas:
- Si la imagen no es una factura legible, devuelve { "error": "no_invoice_detected" }.
- Los precios en Colombia usan punto como separador de miles. "$184.520" significa 184520 pesos.
- Si un ítem aparece varias veces, agrúpalo y suma quantity.
- subCategory debe ser una de las opciones listadas. Si dudas, usa "Otros".
- NO inventes datos. Si algo no es legible, omítelo o usa null.
```

### Cliente frontend

```typescript
// lib/ocr.ts
export async function ocrInvoice(file: File): Promise<OcrResult> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type;

  const res = await fetch(import.meta.env.VITE_OCR_WORKER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });

  if (!res.ok) throw new Error('OCR request failed');
  return res.json();
}
```

---

## Importación CSV

### Bancos soportados (configuración)

```typescript
// src/lib/csv-parser.ts
export const BANK_PROFILES = {
  bancolombia: {
    name: 'Bancolombia',
    detect: (headers: string[]) => headers.includes('FECHA') && headers.includes('VALOR') && headers.includes('DESCRIPCIÓN'),
    columns: { date: 'FECHA', concept: 'DESCRIPCIÓN', amount: 'VALOR' },
    dateFormat: 'dd/MM/yyyy',
    amountSign: 'sign',  // ya viene con signo
    currency: 'COP',
  },
  davivienda: {
    name: 'Davivienda',
    detect: (headers: string[]) => headers.includes('Fecha') && headers.includes('Valor Operación'),
    columns: { date: 'Fecha', concept: 'Concepto', amount: 'Valor Operación' },
    dateFormat: 'yyyy-MM-dd',
    amountSign: 'split',  // hay columna de débito y crédito
    currency: 'COP',
  },
  wise: {
    name: 'Wise',
    detect: (headers: string[]) => headers.includes('TransferWise ID') || headers.includes('Date'),
    columns: { date: 'Date', concept: 'Description', amount: 'Amount' },
    dateFormat: 'yyyy-MM-dd',
    amountSign: 'sign',
    currency: 'detect',  // viene en columna Currency
  },
  binance_p2p: {
    name: 'Binance P2P',
    detect: (headers: string[]) => headers.includes('Order Number') && headers.includes('Fiat Type'),
    columns: { date: 'Created Time', concept: 'Counterparty', amount: 'Fiat Amount' },
    dateFormat: 'yyyy-MM-dd HH:mm:ss',
    amountSign: 'positive',
    currency: 'detect',
  },
};
```

### Categorización automática

Para CSVs, usa reglas simples por keywords:

```typescript
const CATEGORY_RULES = [
  { keywords: ['d1', 'éxito', 'olímpica', 'carulla', 'jumbo', 'ara'], categoryName: 'Supermercado' },
  { keywords: ['rappi', 'didi food', 'uber eats', 'mcdonalds', 'kfc'], categoryName: 'Comida fuera' },
  { keywords: ['uber', 'didi', 'cabify', 'transmilenio'], categoryName: 'Transporte' },
  { keywords: ['movistar', 'claro', 'tigo', 'enel', 'codensa', 'epm'], categoryName: 'Servicios' },
  // ...
];
```

Si el usuario corrige una categorización, guarda la regla y aplícala en futuras importaciones (machine learning artesanal).

---

## Sección de impuestos

### Disclaimer obligatorio
Mostrar siempre arriba de la página:
> Esta sección es una herramienta de seguimiento basada en topes oficiales DIAN. **No constituye asesoría tributaria.** Como extranjero residente y freelancer recibiendo pagos en USD, tu situación tiene matices que requieren validación con un contador.

### Datos de referencia (`lib/tax-co.ts`)

```typescript
// Valor UVT por año — ACTUALIZAR ANUALMENTE
export const UVT_BY_YEAR: Record<number, number> = {
  2024: 47065,
  2025: 49799,        // proyectado, validar con resolución DIAN
  2026: 49799,        // placeholder
};

export const TAX_THRESHOLDS_UVT = {
  declareIncome: 1400,           // tope ingresos brutos para declarar renta
  declarePatrimony: 4500,        // tope patrimonio líquido
  vatResponsible: 3500,          // tope ingresos para ser responsable de IVA
  simpleRegimeMax: 100000,       // tope superior Régimen Simple
};

// Tarifas Régimen Simple por categoría de actividad económica (8 categorías oficiales)
export const SIMPLE_REGIME_RATES = {
  category4_services: [          // Servicios profesionales, consultoría
    { uptoUVT: 6000, rate: 0.059 },
    { uptoUVT: 15000, rate: 0.084 },
    { uptoUVT: 30000, rate: 0.106 },
    { uptoUVT: 100000, rate: 0.114 },
  ],
  // categorías 1, 2, 3, 5, 6, 7, 8...
};

export function getCurrentUVT(): number {
  return UVT_BY_YEAR[new Date().getFullYear()] || UVT_BY_YEAR[2025];
}

export function uvtToCOP(uvt: number, year?: number): number {
  return uvt * (UVT_BY_YEAR[year || new Date().getFullYear()]);
}

export function calculateProgress(annualGrossIncomeCOP: number, thresholdUVT: number): number {
  const thresholdCOP = uvtToCOP(thresholdUVT);
  return Math.min(100, (annualGrossIncomeCOP / thresholdCOP) * 100);
}
```

### Calendario de obligaciones (Régimen Simple)
Régimen Simple paga **anticipos bimestrales** (formulario 2593) y **declaración anual consolidada**.

```typescript
export const TAX_CALENDAR_SIMPLE_2026 = [
  { name: 'Bimestre 1', period: 'ene-feb', deadline: '2026-05-15', form: '2593' },
  { name: 'Bimestre 2', period: 'mar-abr', deadline: '2026-07-15', form: '2593' },
  { name: 'Bimestre 3', period: 'may-jun', deadline: '2026-09-15', form: '2593' },
  { name: 'Bimestre 4', period: 'jul-ago', deadline: '2026-11-17', form: '2593' },
  { name: 'Bimestre 5', period: 'sep-oct', deadline: '2027-01-19', form: '2593' },
  { name: 'Bimestre 6', period: 'nov-dic', deadline: '2027-03-17', form: '2593' },
  { name: 'Declaración anual', period: 'año 2026', deadline: '2027-04-XX', form: '260' },
];
```

### Provisión automática
- Por defecto: 2% de cada ingreso bruto registrado va a una "bolsa virtual" de impuestos pendientes.
- Configurable en Settings.
- Se muestra como KPI en la página de impuestos: "Provisión actual: $X — suficiente para cubrir tus próximas obligaciones".

---

## Responsive y mobile

### Breakpoints
```js
// Tailwind defaults
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### Layout

**Desktop (≥1024px)**: sidebar fija de 240px a la izquierda + contenido principal.

**Tablet (768-1023px)**: sidebar colapsada a íconos (60px), tooltips al hover. O alternativamente, sidebar oculta + topbar con botón hamburguesa.

**Mobile (<768px)**:
- Sidebar oculta completamente.
- Topbar fija arriba con: logo + título de página + botón hamburguesa a la derecha.
- Al tocar hamburguesa → **menú desplegable lateral** (slide-in desde la izquierda) con overlay oscuro semi-transparente detrás.
- Al tocar overlay o un ítem del menú → se cierra.
- Animación suave: `transform: translateX(-100%) → translateX(0)` con `transition: 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Ítems del menú: misma estructura que la sidebar desktop, mismos íconos y labels.

### Componente `MobileNav.tsx` esperado

```tsx
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';  // o usa CSS puro

export function MobileNav({ items, activeRoute }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="md:hidden">
        <Menu />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-surface-2 z-50 p-5 overflow-y-auto"
            >
              <button onClick={() => setOpen(false)} className="mb-6"><X /></button>
              {/* nav items */}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Adaptaciones por página

- **KPI grid**: 4 columnas → 2 columnas (md) → 1 columna (sm).
- **Row 2-cols**: 1.6fr/1fr → 1 columna apilada.
- **Tablas**: scroll horizontal en mobile, o transformar a cards apiladas.
- **Modales**: ocupan 90% del viewport en mobile, con padding ajustado.
- **Charts**: altura reducida, leyendas debajo.
- **Topbar actions**: botón "Nueva transacción" se vuelve un FAB (floating action button) abajo a la derecha en mobile.

### Touch targets
Mínimo 44x44px para todo elemento clickeable en mobile.

---

## Plan de implementación por fases

### Fase 1 — Fundación (día 1)
1. `npm create vite@latest patrimonio -- --template react-ts`
2. Instalar dependencias core (Tailwind, shadcn, Dexie, Recharts, etc.).
3. Configurar Tailwind con tokens del sistema de diseño.
4. Cargar fuentes en `index.html`.
5. Crear `AppShell` con sidebar desktop + mobile nav.
6. Setup de React Router con todas las rutas (páginas vacías).
7. Setup Dexie con schema y seed de categorías.
8. Crear componente `<Money>` (display de montos con moneda).

### Fase 2 — Datos básicos (día 2)
1. Hooks `useTransactions`, `useSettings`, `useTRM`.
2. Página Transacciones (tabla completa, filtros, tabs).
3. `TxFormDialog` con react-hook-form + zod.
4. Categorías por defecto + página Categorías básica.
5. Seed de datos de ejemplo realistas (al menos 30 transacciones, 3 facturas, 2 deudas, 3 metas).

### Fase 3 — Dashboard y visualizaciones (día 3)
1. KPIs del dashboard con cálculos reales.
2. Gráficas (CashflowChart, CategoryDoughnut).
3. Lista de últimas transacciones.
4. Banner de insight con regla simple.
5. TRM API con cache.

### Fase 4 — Facturas y drill-down (día 4)
1. Página Facturas con grid.
2. `InvoiceDetailDialog` con ítems y adjuntos.
3. Sistema de Attachments (Blob storage en IndexedDB).

### Fase 5 — Diezmo, metas, deudas (día 5)
1. `lib/tithe.ts` completo.
2. Página Diezmo con histórico y registro de devoluciones.
3. Página Metas con progreso dinámico y sugerencia.
4. Página Deudas con cronograma y estrategia.

### Fase 6 — Importación (día 6)
1. Cloudflare Worker para OCR (deploy aparte).
2. `ImageDropzone` + `OcrPreviewDialog`.
3. `CsvDropzone` + parsers por banco.
4. Categorización automática por keywords.

### Fase 7 — Impuestos (día 7)
1. `lib/tax-co.ts` con UVT y umbrales.
2. Página Impuestos con KPIs, topes, calendario, provisión.
3. Configuración de perfil tributario en Settings.

### Fase 8 — Pulido (día 8)
1. Animaciones de entrada (Framer Motion en cards).
2. Estados vacíos en cada lista.
3. Toasts en cada acción.
4. Atajos de teclado (`N` para nueva tx, `/` para búsqueda).
5. Dark mode (opcional).
6. Tests unitarios de `lib/` (currency, tithe, tax).

---

## Notas finales para el desarrollador

- **El HTML estático `patrimonio-app.html` es la verdad visual.** Cuando dudes sobre look o comportamiento, ábrelo y replica.
- **No uses números nativos JS para montos.** Usa `dinero.js` o multiplica todo por 100 y guarda en cents.
- **TRM siempre es COP por USD.** Nunca al revés. Si el usuario configura USD como base, los montos en moneda base están en USD; los equivalentes secundarios en COP.
- **Diezmos se calculan sobre ingresos brutos en USD (moneda base)**, no sobre el monto convertido a COP. Así el compromiso es estable independiente de la TRM del día.
- **Toda fecha en español.** Usa `date-fns/locale/es`.
- **Cero datos personales en el código.** Todo viene del seed (que se reemplaza con datos reales) o de IndexedDB.
- **Cuando agregues una feature nueva**, primero piensa: ¿esto cabe en la filosofía minimalista cálida? Si la respuesta es "podría ser más vistoso", redúcela.

---

**Última actualización**: mayo 2026
**Versión spec**: 0.1
**Mantenido por**: Andrés
