import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/schema'
import type { Currency } from '@/types/domain'

export interface GoalFormData {
  name: string
  description?: string
  iconKey: string
  color: string
  targetAmount: number
  currentAmount: number
  currency: Currency
  monthlyContribution?: number
  targetDate?: string
}

export function useGoals() {
  const goals = useLiveQuery(() => db.goals.toArray())

  async function addGoal(data: GoalFormData) {
    await db.goals.add({
      ...data,
      createdAt: new Date().toISOString(),
    })
    toast.success('Meta creada')
  }

  async function updateGoal(id: number, data: GoalFormData) {
    await db.goals.update(id, data)
    toast.success('Meta actualizada')
  }

  async function deleteGoal(id: number) {
    await db.goals.delete(id)
    toast.success('Meta eliminada')
  }

  async function contributeToGoal(id: number, amount: number) {
    const goal = await db.goals.get(id)
    if (!goal) return
    const newAmount = goal.currentAmount + amount
    await db.goals.update(id, { currentAmount: newAmount })
    if (newAmount >= goal.targetAmount) {
      toast.success(`¡Meta "${goal.name}" completada!`)
    } else {
      toast.success('Abono registrado')
    }
  }

  return {
    goals: goals ?? [],
    loading: goals === undefined,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
  }
}
