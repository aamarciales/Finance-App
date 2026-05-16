import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import { getEquivalentAmounts } from '../../lib/currency'
import type { AppEnv } from '../types'

export const tithePaymentsRouter = new Hono<AppEnv>()

type DbClient = ReturnType<typeof drizzle<typeof schema>>

async function findDiezmoCategories(db: DbClient, userId: string) {
  return db.query.categories.findMany({
    where: (cat, { eq, and, or }) => and(
      eq(cat.userId, userId),
      or(
        eq(cat.name, 'Diezmo'),
        eq(cat.name, 'Diezmo y Ofrenda'),
        eq(cat.name, 'Ofrendas'),
        eq(cat.name, 'Ofrenda'),
      ),
    ),
  })
}

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

  const commitments = await db.query.titheCommitments.findMany({
    where: (tc, { eq, and, inArray }) => and(
      eq(tc.userId, auth.userId),
      inArray(tc.id, commitmentIds),
    ),
  })

  const alreadyPaid = commitments.filter(tc => tc.status === 'paid')
  if (alreadyPaid.length > 0) {
    return c.json({ error: 'Algunos compromisos ya fueron pagados' }, 400)
  }
  if (commitments.length !== commitmentIds.length) {
    return c.json({ error: 'Algunos compromisos no existen o no te pertenecen' }, 400)
  }

  const diezmoCats = await findDiezmoCategories(db, auth.userId)
  const diezmoCat = diezmoCats[0]
  if (!diezmoCat?.id) {
    return c.json({ error: 'No existe la categoría "Diezmo"' }, 400)
  }

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

  for (const commitment of commitments) {
    await db.insert(schema.commitmentPayments).values({
      commitmentId: commitment.id,
      paymentId: paymentResult[0].id,
      amountUsd: commitment.totalAmount,
      createdAt: new Date().toISOString(),
    })
    await db.update(schema.titheCommitments).set({ status: 'paid' })
      .where(eq(schema.titheCommitments.id, commitment.id))
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

  const diezmoCats = await findDiezmoCategories(db, auth.userId)
  const diezmoCat = diezmoCats[0]
  if (!diezmoCat?.id) {
    return c.json({ error: 'No existe la categoría "Diezmo"' }, 400)
  }

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

// POST /api/tithe-payments/link-existing — link transaction to commitments
tithePaymentsRouter.post('/link-existing', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const { transactionId, commitmentIds } = body

  if (!transactionId || !commitmentIds?.length) {
    return c.json({ error: 'Selecciona una transacción y al menos un compromiso' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const tx = await db.query.transactions.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, transactionId), eq(t.userId, auth.userId)),
  })

  if (!tx) {
    return c.json({ error: 'Transacción no encontrada' }, 404)
  }

  const diezmoCats = await findDiezmoCategories(db, auth.userId)
  const diezmoCatIds = new Set(diezmoCats.map(c => c.id))
  if (!diezmoCatIds.has(tx.categoryId)) {
    return c.json({ error: 'La transacción no es de la categoría Diezmo' }, 400)
  }

  const commitments = await db.query.titheCommitments.findMany({
    where: (tc, { eq, and, inArray }) => and(
      eq(tc.userId, auth.userId),
      inArray(tc.id, commitmentIds),
    ),
  })

  const validCommitments = commitments.filter(tc => tc.status === 'pending')

  if (validCommitments.length === 0) {
    return c.json({ error: 'No hay compromisos pendientes' }, 400)
  }

  const paymentResult = await db.insert(schema.tithePayments).values({
    userId: auth.userId,
    date: tx.date,
    amountUsd: tx.amountInBase,
    amountCop: tx.amountInSecondary || null,
    currency: tx.currency,
    paidTo: 'Transacción existente',
    type: 'both',
    notes: `Vinculado a transacción #${tx.id}: ${tx.concept}`,
    transactionId: tx.id,
    createdAt: new Date().toISOString(),
  }).returning()

  for (const commitment of validCommitments) {
    await db.insert(schema.commitmentPayments).values({
      commitmentId: commitment.id,
      paymentId: paymentResult[0].id,
      amountUsd: commitment.totalAmount,
      createdAt: new Date().toISOString(),
    })
    await db.update(schema.titheCommitments).set({ status: 'paid' })
      .where(eq(schema.titheCommitments.id, commitment.id))
  }

  return c.json({
    payment: paymentResult[0],
    linkedCount: validCommitments.length,
    transactionId: tx.id,
  })
})

// POST /api/tithe-payments/debt-link — link transaction as spiritual debt payment
tithePaymentsRouter.post('/debt-link', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const { transactionId } = body

  if (!transactionId) {
    return c.json({ error: 'Selecciona una transacción' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const tx = await db.query.transactions.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, transactionId), eq(t.userId, auth.userId)),
  })

  if (!tx) {
    return c.json({ error: 'Transacción no encontrada' }, 404)
  }

  const diezmoCats = await findDiezmoCategories(db, auth.userId)
  const diezmoCatIds = new Set(diezmoCats.map(c => c.id))
  if (!diezmoCatIds.has(tx.categoryId)) {
    return c.json({ error: 'La transacción no es de la categoría Diezmo' }, 400)
  }

  // Decrease titheDebtUsd
  const debtSetting = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.key, 'titheDebtUsd'), eq(s.userId, auth.userId)),
  })

  const currentDebt = debtSetting?.value != null ? Number(debtSetting.value) : 0
  const newDebt = Math.max(0, currentDebt - tx.amountInBase)

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

  return c.json({
    previousDebt: currentDebt,
    amountUsed: tx.amountInBase,
    remainingDebt: newDebt,
  })
})

// DELETE /api/tithe-payments/:id
tithePaymentsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })

  const payment = await db.query.tithePayments.findFirst({
    where: (tp, { eq, and }) => and(eq(tp.id, id), eq(tp.userId, auth.userId)),
  })

  if (!payment) {
    return c.json({ error: 'Pago no encontrado' }, 404)
  }

  // Find affected commitments
  const affectedLinks = await db.query.commitmentPayments.findMany({
    where: (cp, { eq }) => eq(cp.paymentId, id),
    columns: { commitmentId: true },
  })
  const affectedCommitmentIds = affectedLinks.map(l => l.commitmentId)

  // Delete commitment_payments
  await db.delete(schema.commitmentPayments)
    .where(eq(schema.commitmentPayments.paymentId, id))

  // Revert commitments to pending
  for (const cid of affectedCommitmentIds) {
    await db.update(schema.titheCommitments).set({ status: 'pending' })
      .where(eq(schema.titheCommitments.id, cid))
  }

  // Delete the associated transaction
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
