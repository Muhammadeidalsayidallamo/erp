import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DailyExpense {
  id: string
  date: string
  description: string
  category: string
  amount: number
  notes?: string
}

interface DailyExpensesState {
  expenses: DailyExpense[]
  addExpense: (expense: DailyExpense) => void
  deleteExpense: (id: string) => void
  clearAll: () => void
}

export const useDailyExpensesStore = create<DailyExpensesState>()(
  persist(
    (set) => ({
      expenses: [],
      
      addExpense: (expense) => set((state) => ({
        expenses: [
          expense,
          ...state.expenses
        ]
      })),
      
      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id)
      })),
      
      clearAll: () => set({ expenses: [] }),
    }),
    {
      name: 'ppf-daily-expenses',
    }
  )
)
