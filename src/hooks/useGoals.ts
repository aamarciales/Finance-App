import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApi } from '@/lib/api'
import { useAuthReady } from '@/hooks/useAuthReady'
import type { Currency, Goal } from '@/types/domain'

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
  const api = useApi()
  const authReady = useAuthReady()
  const queryClient = useQueryClient()

  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals'),
    enabled: authReady,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  }

  const { mutateAsync: addGoalMutate } = useMutation({
    mutationFn: async (data: GoalFormData) => {
      await api.post('/goals', data)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Goal created')
    }
  })

  const { mutateAsync: updateGoalMutate } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GoalFormData }) => {
      await api.put(`/goals/${id}`, data)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Goal updated')
    }
  })

  const { mutateAsync: deleteGoalMutate } = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/goals/${id}`)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Goal deleted')
    }
  })

  const { mutateAsync: contributeToGoalMutate } = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const goal = goals?.find(g => g.id === id)
      if (!goal) return
      const newAmount = goal.currentAmount + amount
      await api.put(`/goals/${id}`, { currentAmount: newAmount })
      return { newAmount, goalName: goal.name, targetAmount: goal.targetAmount }
    },
    onSuccess: (result) => {
      if (!result) return
      invalidateAll()
      if (result.newAmount >= result.targetAmount) {
        toast.success(`Goal "${result.goalName}" completed!`)
      } else {
        toast.success('Contribution recorded')
      }
    }
  })

  return {
    goals: goals ?? [],
    loading: loadingGoals,
    addGoal: async (data: GoalFormData) => addGoalMutate(data),
    updateGoal: async (id: number, data: GoalFormData) => updateGoalMutate({ id, data }),
    deleteGoal: async (id: number) => deleteGoalMutate(id),
    contributeToGoal: async (id: number, amount: number) => contributeToGoalMutate({ id, amount }),
  }
}
