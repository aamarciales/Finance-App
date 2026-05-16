import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, inArray } from 'drizzle-orm'
import * as schema from '../schema'
import { getEquivalentAmounts } from '../../lib/currency'
import type { AppEnv } from '../types'

export const tithePaymentsRouter = new Hono<AppEnv>()

// GET /api/tithe-payments
tithePaymentsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.tithePayments.findMany({
    where: (tp, { eq }) => eq(tp.userId, auth.userId),
    orderBy: (tp, { desc }) => [desc(tp.date)],
  })

  return c.json(results)
})

// POST /api/tithe-payments — Registrar entrega (pay commitments)
tithePaymentsRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const { date, commitmentIds, amountUsd, amountCop, currency, trm, destination, attachmentUrl, notes } = body

  if (!commitmentIds?.length) {
    return c.json({ error: 'Selecciona al menos un compromiso' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  // Validate commitments belong to user and are pending
  const commitments = await db.query.titheCommitments.findMany({
    where: (tc, { eq, and, inArray }) => and(
      eq(tc.userId, auth.userId),
      inArray(tc.id, commitmentIds),
    ),
  })

  const invalidCommitments = commitments.filter(tc => tc.status !== 'pending')
  if (invalidCommitments.length > 0) {
    return c.json({ error: 'Algunos compromisos ya fueron pagados' }, 400)
  }
  if (commitments.length !== commitmentIds.length) {
    return c.json({ error: 'Algunos compromisos no existen o no te pertenecen' }, 400)
  }

  // Find "Diezmo" category for the expense transaction
  const diezmoCat = await db.query.categories.findFirst({
    where: (cat, { eq, and }) => and(eq(cat.userId, auth.userId), eq(cat.name, 'Diezmo')),
  })
  if (!diezmoCat?.id) {
    return c.json({ error: 'No existe la categoría "Diezmo"' }, 400)
  }

  // Create expense transaction
  const rates = { trm, eurToUsd: 1.05 }
  const { amountInBase, amountInSecondary } = getEquivalentAmounts(amountUsd, currency || 'USD', rates)

  const txResult = await db.insert(schema.transactions).values({
    userId: auth.userId,
    date,
    type: 'expense',
    concept: `Diezmo & Ofrenda — ${commitments.length} compromiso${commitments.length > 1 ? 's' : ''}`,
    categoryId: diezmoCat.id,
    amount: amountUsd,
    currency: currency || 'USD',
    trm: trm || 1,
    amountInBase,
    amountInSecondary,
    isTitheCalculated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning()

  // Create tithe_payment
  const paymentResult = await db.insert(schema.tithePayments).values({
    userId: auth.userId,
    date,
    amountUsd,
    amountCop: amountCop ?? null,
    currency: currency || 'USD',
    paidTo: destination || 'Iglesia',
    type: 'both',
    notes: notes ?? null,
    attachmentUrl: attachmentUrl ?? null,
    transactionId: txResult[0].id,
    createdAt: new Date().toISOString(),
  }).returning()

  // Mark commitments as paid
  for (const commitment of commitments) {
    await db.update(schema.titheCommitments).set({
      status: 'paid',
      tithePaymentId: paymentResult[0].id,
    }).where(eq(schema.titheCommitments.id, commitment.id))
  }

  return c.json({ payment: paymentResult[0], transaction: txResult[0], paidCount: commitments.length })
})

// POST /api/tithe-payments/debt-payment — Registrar abono a deuda espiritual
tithePaymentsRouter.post('/debt-payment', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const { date, amountUsd, currency, trm } = body

  if (!amountUsd || amountUsd <= 0) {
    return c.json({ error: 'Monto inválido' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  // Find Diezmo category
  const diezmoCat = await db.query.categories.findFirst({
    where: (cat, { eq, and }) => and(eq(cat.userId, auth.userId), eq(cat.name, 'Diezmo')),
  })
  if (!diezmoCat?.id) {
    return c.json({ error: 'No existe la categoría "Diezmo"' }, 400)
  }

  // Create expense transaction
  const rates = { trm: trm || 1, eurToUsd: 1.05 }
  const { amountInBase, amountInSecondary } = getEquivalentAmounts(amountUsd, currency || 'USD', rates)

  await db.insert(schema.transactions).values({
    userId: auth.userId,
    date,
    type: 'expense',
    concept: 'Abono deuda espiritual (diezmo histórico)',
    categoryId: diezmoCat.id,
    amount: amountUsd,
    currency: currency || 'USD',
    trm: trm || 1,
    amountInBase,
    amountInSecondary,
    isTitheCalculated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // Decrease titheDebtUsd in settings
  const debtSetting = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.key, 'titheDebtUsd'), eq(s.userId, auth.userId)),
  })

  const currentDebt = debtSetting?.value != null ? Number(debtSetting.value) : 0
  const newDebt = Math.max(0, currentDebt - amountUsd)

  if (debtSetting) {
    await db.update(schema.settings).set({ value: newDebt })
      .where(and(eq(schema.settings.key, 'titheDebtUsd'), eq(schema.settings.userId, auth.userId)))
  } else {
    await db.insert(schema.settings).values({
      key: 'titheDebtUsd',
      userId: auth.userId,
      value: newDebt,
    })
  }

  return c.json({ previousDebt: currentDebt, amountPaid: amountUsd, remainingDebt: newDebt })
})

// DELETE /api/tithe-payments/:id
tithePaymentsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })

  // Find the payment
  const payment = await db.query.tithePayments.findFirst({
    where: (tp, { eq, and }) => and(eq(tp.id, id), eq(tp.userId, auth.userId)),
  })

  if (!payment) {
    return c.json({ error: 'Pago no encontrado' }, 404)
  }

  // Revert linked commitments to pending
  await db.update(schema.titheCommitments).set({
    status: 'pending',
    tithePaymentId: null,
  }).where(eq(schema.titheCommitments.tithePaymentId, id))

  // Delete the associated transaction if exists
  if (payment.transactionId) {
    await db.delete(schema.transactions).where(
      and(eq(schema.transactions.id, payment.transactionId), eq(schema.transactions.userId, auth.userId))
    )
  }

  // Delete the payment
  await db.delete(schema.tithePayments).where(
    and(eq(schema.tithePayments.id, id), eq(schema.tithePayments.userId, auth.userId))
  )

  return c.json({ success: true })
})
