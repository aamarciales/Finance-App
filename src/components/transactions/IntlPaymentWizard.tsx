import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Globe, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { getEquivalentAmounts } from '@/lib/currency'
import { calculateTitheForIncome } from '@/lib/tithe'
import { useSettings } from '@/hooks/useSettings'

import { CURRENCIES } from '@/lib/validators'
import type { Category, Currency } from '@/types/domain'

const PLATFORMS = ['Wise', 'PayPal', 'Transferencia bancaria', 'Binance', 'Plenti', 'Otro'] as const

const step1Schema = z.object({
  date: z.string().min(1),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  amount: z.number({ message: 'Monto obligatorio' }).positive(),
  currency: z.enum(CURRENCIES),
  incomeCategoryId: z.number().positive(),
  platform: z.string().min(1),
})

type Step1Values = z.infer<typeof step1Schema>

interface WizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  rates: { trm: number; eurToUsd: number }
}

interface FeeConfig {
  enabled: boolean
  receiveFee: number
  sendFee: number
  platformName?: string
}

interface ConversionConfig {
  enabled: boolean
  toCurrency: Currency
  receivedAmount: number
}

export function IntlPaymentWizard({ open, onOpenChange, categories, rates }: WizardProps) {
  const [step, setStep] = useState(1)
  const [originFees, setOriginFees] = useState<FeeConfig>({ enabled: false, receiveFee: 0, sendFee: 0 })
  const [intermediateFees, setIntermediateFees] = useState<FeeConfig>({ enabled: false, receiveFee: 0, sendFee: 0, platformName: '' })
  const [conversion, setConversion] = useState<ConversionConfig>({ enabled: false, toCurrency: 'COP', receivedAmount: 0 })
  const [customPlatform, setCustomPlatform] = useState(false)

  const { settings } = useSettings()

  const incomeCategories = useMemo(() => categories.filter((c) => c.type === 'income'), [categories])

  const {
    register,
    control,
    handleSubmit: handleSubmitStep1,
    watch,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      concept: '',
      amount: 0,
      currency: 'USD',
      incomeCategoryId: 0,
      platform: 'Wise',
    },
  })

  const step1 = watch()

  const totalFees = useMemo(() => {
    const origin = originFees.enabled ? originFees.receiveFee + originFees.sendFee : 0
    const inter = intermediateFees.enabled ? intermediateFees.receiveFee + intermediateFees.sendFee : 0
    return origin + inter
  }, [originFees, intermediateFees])

  const amountAfterFees = useMemo(() => Math.max(0, step1.amount - totalFees), [step1.amount, totalFees])

  const effectiveRate = useMemo(() => {
    if (!conversion.enabled || amountAfterFees === 0) return 0
    return conversion.receivedAmount / amountAfterFees
  }, [conversion, amountAfterFees])

  const trmDelta = useMemo(() => {
    if (!conversion.enabled || effectiveRate === 0) return null
    if (step1.currency === 'USD' && conversion.toCurrency === 'COP') {
      const diff = effectiveRate - rates.trm
      return { diff, label: `Tasa efectiva $${effectiveRate.toFixed(0)} vs TRM $${rates.trm.toFixed(0)}` }
    }
    return null
  }, [conversion, effectiveRate, rates.trm, step1.currency])

  const titheInfo = useMemo(() => {
    if (!settings || step < 5) return null
    if (!step1.incomeCategoryId || step1.incomeCategoryId <= 0 || !step1.amount || step1.amount <= 0) return null
    return calculateTitheForIncome(step1.amount, step1.incomeCategoryId, settings)
  }, [settings, step, step1.amount, step1.incomeCategoryId])

  const pendingTxs = useMemo(() => {
    const txs: Array<{ label: string; type: string; amount: number; currency: string; categoryName: string }> = []

    txs.push({ label: `+${step1.currency} ${step1.amount.toFixed(2)}  ${step1.concept}`, type: 'income', amount: step1.amount, currency: step1.currency, categoryName: incomeCategories.find(c => c.id === step1.incomeCategoryId)?.name ?? '' })

    if (originFees.enabled) {
      if (originFees.receiveFee > 0) txs.push({ label: `−${step1.currency} ${originFees.receiveFee.toFixed(2)}  Comisión recibir (${step1.platform})`, type: 'expense', amount: originFees.receiveFee, currency: step1.currency, categoryName: 'Comisiones bancarias' })
      if (originFees.sendFee > 0) txs.push({ label: `−${step1.currency} ${originFees.sendFee.toFixed(2)}  Comisión envío (${step1.platform})`, type: 'expense', amount: originFees.sendFee, currency: step1.currency, categoryName: 'Comisiones bancarias' })
    }

    if (intermediateFees.enabled) {
      const name = intermediateFees.platformName || 'Intermedia'
      if (intermediateFees.receiveFee > 0) txs.push({ label: `−${step1.currency} ${intermediateFees.receiveFee.toFixed(2)}  Comisión recibir (${name})`, type: 'expense', amount: intermediateFees.receiveFee, currency: step1.currency, categoryName: 'Comisiones bancarias' })
      if (intermediateFees.sendFee > 0) txs.push({ label: `−${step1.currency} ${intermediateFees.sendFee.toFixed(2)}  Comisión envío (${name})`, type: 'expense', amount: intermediateFees.sendFee, currency: step1.currency, categoryName: 'Comisiones bancarias' })
    }

    if (conversion.enabled && conversion.receivedAmount > 0) {
      txs.push({ label: `−${step1.currency} ${amountAfterFees.toFixed(2)}  Transfer ${step1.currency} → ${conversion.toCurrency}`, type: 'transfer', amount: amountAfterFees, currency: step1.currency, categoryName: 'Transferencias' })
      txs.push({ label: `+${conversion.toCurrency} ${conversion.receivedAmount.toFixed(0)}  Recibido en ${conversion.toCurrency}`, type: 'transfer', amount: conversion.receivedAmount, currency: conversion.toCurrency, categoryName: 'Transferencias' })
    }

    if (titheInfo && titheInfo.tithe > 0) {
      txs.push({ label: `−${step1.currency} ${titheInfo.tithe.toFixed(2)}  Diezmo`, type: 'expense', amount: titheInfo.tithe, currency: step1.currency, categoryName: 'Diezmo' })
    }
    if (titheInfo && titheInfo.offering > 0) {
      txs.push({ label: `−${step1.currency} ${titheInfo.offering.toFixed(2)}  Ofrenda`, type: 'expense', amount: titheInfo.offering, currency: step1.currency, categoryName: 'Ofrendas' })
    }

    return txs
  }, [step1, originFees, intermediateFees, conversion, amountAfterFees, titheInfo, incomeCategories])

  const [checkedTxs, setCheckedTxs] = useState<Record<number, boolean>>({})

  const isTxChecked = (i: number) => checkedTxs[i] !== false

  const api = useApi()
  const queryClient = useQueryClient()

  async function handleConfirm() {
    const groupId = crypto.randomUUID()

    try {
      for (let i = 0; i < pendingTxs.length; i++) {
        const tx = pendingTxs[i]
        if (!isTxChecked(i)) continue
        const cat = categories.find((c) => c.name === tx.categoryName)
        if (!cat?.id) continue

        const isConversionTx = conversion.enabled && tx.type === 'transfer'
        const txTrm = (isConversionTx && step1.currency === 'USD' && conversion.toCurrency === 'COP' && effectiveRate > 0)
          ? effectiveRate
          : rates.trm
        const txRates = { trm: txTrm, eurToUsd: rates.eurToUsd }

        const { amountInBase, amountInSecondary } = getEquivalentAmounts(tx.amount, tx.currency as Currency, txRates)
        await api.post('/transactions', {
          date: step1.date,
          type: tx.type,
          concept: tx.label.replace(/[+\-]\w+\s[\d.]+\s{2}/, '').trim(),
          categoryId: cat.id,
          amount: tx.amount,
          currency: tx.currency,
          trm: txTrm,
          amountInBase,
          amountInSecondary,
          transferGroupId: groupId,
        })
      }
      toast.success(`Pago internacional registrado con ${pendingTxs.filter((_, i) => isTxChecked(i)).length} movimientos`)
      await queryClient.invalidateQueries()
      onOpenChange(false)
      setStep(1)
    } catch (e) {
      toast.error('Ocurrió un error guardando las transacciones')
    }
  }

  const STEP_TITLES = [
    'Pago bruto recibido',
    'Comisiones de origen',
    'Plataforma intermedia',
    'Cambio de moneda',
    'Resumen y confirmación',
  ]

  function goBack() {
    if (step > 1) setStep(step - 1)
  }

  const footer = (() => {
    if (step === 1) return (
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="wizard-step-1">Siguiente</Button>
      </DialogFooter>
    )
    if (step === 2) return (
      <DialogFooter>
        <Button onClick={() => setStep(3)}>Siguiente</Button>
      </DialogFooter>
    )
    if (step === 3) return (
      <DialogFooter>
        <Button onClick={() => setStep(4)}>Siguiente</Button>
      </DialogFooter>
    )
    if (step === 4) return (
      <DialogFooter>
        <Button onClick={() => setStep(5)}>Siguiente</Button>
      </DialogFooter>
    )
    return (
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={handleConfirm}>Confirmar</Button>
      </DialogFooter>
    )
  })()

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) setCustomPlatform(false)
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-default transition-colors -ml-1"
                aria-label="Atrás"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <Globe className="h-5 w-5" />
            Recibir pago internacional
          </DialogTitle>
          <p className="text-[12px] text-text-muted">Paso {step} de 5 — {STEP_TITLES[step - 1]}</p>
        </DialogHeader>

        <div className="overflow-y-auto -mx-4 px-4 flex-1">
          {step === 1 && (
            <form id="wizard-step-1" onSubmit={handleSubmitStep1(() => setStep(2))} className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Fecha</Label>
                <Input type="date" {...register('date')} />
              </div>
              <div className="grid gap-1.5">
                <Label>Cliente / Concepto</Label>
                <Input {...register('concept')} placeholder="Ej. Pago freelance BRIX" />
                {errors.concept && <p className="text-[12px] text-danger-strong">{errors.concept.message}</p>}
              </div>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <div className="grid gap-1.5">
                  <Label>Monto</Label>
                  <Input type="number" step="any" {...register('amount', { valueAsNumber: true })} className="font-mono" />
                  {errors.amount && <p className="text-[12px] text-danger-strong">{errors.amount.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label>Moneda</Label>
                  <Controller name="currency" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Categoría de ingreso</Label>
                <Controller name="incomeCategoryId" control={control} render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="grid gap-1.5">
                <Label>Plataforma origen</Label>
                <Controller name="platform" control={control} render={({ field }) => (
                  customPlatform ? (
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="Nombre de la plataforma"
                      autoFocus
                    />
                  ) : (
                    <Select value={field.value} onValueChange={(v) => {
                      if (v === 'Otro') {
                        field.onChange('')
                        setCustomPlatform(true)
                      } else {
                        field.onChange(v)
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )
                )} />
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="grid gap-4 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={originFees.enabled} onCheckedChange={(v) => setOriginFees(f => ({ ...f, enabled: !!v }))} />
                <span className="text-[13px]">¿Te cobraron comisiones al recibir o enviar?</span>
              </label>
              {originFees.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Comisión por recibir ({step1.currency})</Label>
                    <Input type="number" step="any" value={originFees.receiveFee} onChange={(e) => setOriginFees(f => ({ ...f, receiveFee: Number(e.target.value) || 0 }))} className="font-mono" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Comisión por enviar ({step1.currency})</Label>
                    <Input type="number" step="any" value={originFees.sendFee} onChange={(e) => setOriginFees(f => ({ ...f, sendFee: Number(e.target.value) || 0 }))} className="font-mono" />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={intermediateFees.enabled} onCheckedChange={(v) => setIntermediateFees(f => ({ ...f, enabled: !!v }))} />
                <span className="text-[13px]">¿Pasó por una segunda plataforma?</span>
              </label>
              {intermediateFees.enabled && (
                <>
                  <div className="grid gap-1.5">
                    <Label>Nombre de la plataforma</Label>
                    <Input value={intermediateFees.platformName} onChange={(e) => setIntermediateFees(f => ({ ...f, platformName: e.target.value }))} placeholder="Ej. Plenti" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Comisión recibir ({step1.currency})</Label>
                      <Input type="number" step="any" value={intermediateFees.receiveFee} onChange={(e) => setIntermediateFees(f => ({ ...f, receiveFee: Number(e.target.value) || 0 }))} className="font-mono" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Comisión envío ({step1.currency})</Label>
                      <Input type="number" step="any" value={intermediateFees.sendFee} onChange={(e) => setIntermediateFees(f => ({ ...f, sendFee: Number(e.target.value) || 0 }))} className="font-mono" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={conversion.enabled} onCheckedChange={(v) => setConversion(c => ({ ...c, enabled: !!v }))} />
                <span className="text-[13px]">¿Cambiaste a otra moneda?</span>
              </label>
              {conversion.enabled && (
                <>
                  <div className="grid grid-cols-[1fr_1fr] gap-3">
                    <div className="grid gap-1.5">
                      <Label>De</Label>
                      <Input value={step1.currency} disabled />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>A</Label>
                      <Select value={conversion.toCurrency} onValueChange={(v) => setConversion(c => ({ ...c, toCurrency: v as Currency }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.filter(c => c !== step1.currency).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-md bg-surface-2 px-3 py-2 text-[12px] text-text-muted">
                    Monto convertido: {step1.currency} {amountAfterFees.toFixed(2)}
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Monto recibido en {conversion.toCurrency}</Label>
                    <Input type="number" step="any" value={conversion.receivedAmount} onChange={(e) => setConversion(c => ({ ...c, receivedAmount: Number(e.target.value) || 0 }))} className="font-mono" />
                  </div>
                  {effectiveRate > 0 && (
                    <p className="text-[12px] text-text-muted">
                      Tasa efectiva: {effectiveRate.toFixed(2)} {step1.currency}/{conversion.toCurrency}
                    </p>
                  )}
                  {trmDelta && (
                    <p className={`text-[12px] ${trmDelta.diff < 0 ? 'text-danger-strong' : 'text-brand'}`}>
                      {trmDelta.label}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                {pendingTxs.map((tx, i) => (
                  <label key={i} className="flex items-center gap-2 text-[13px]">
                    <Checkbox
                      checked={isTxChecked(i)}
                      onCheckedChange={(v) => setCheckedTxs(prev => ({ ...prev, [i]: !!v }))}
                    />
                    <span>{tx.label}</span>
                  </label>
                ))}
              </div>

              {titheInfo && (
                <div className="border-t border-border pt-3 text-[12px] text-text-muted">
                  <p>Diezmo a apartar ({titheInfo.tithe.toFixed(0)}%): {step1.currency} {titheInfo.tithe.toFixed(2)}</p>
                  <p>Ofrenda a apartar ({titheInfo.offering.toFixed(0)}%): {step1.currency} {titheInfo.offering.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {footer}
      </DialogContent>
    </Dialog>
  )
}
