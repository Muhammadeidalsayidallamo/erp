import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, today } from '../utils/calculations'

export interface ExpenseSingleItem {
  id: string
  date: string
  category: string
  note: string
  receiptNo: string
  amount: number | ''
}

export interface ExpenseSheet {
  id: string
  title: string
  reportDate: string
  personName: string
  fundAmount: number | ''
  items: ExpenseSingleItem[]
  status: 'draft' | 'saved'
  updatedAt: string
}

interface ExpensesSheetState {
  sheets: ExpenseSheet[]
  saveSheet: (sheet: ExpenseSheet) => void
  deleteSheet: (id: string) => void
  clearAll: () => void
}

export const useExpensesSheetStore = create<ExpensesSheetState>()(
  persist(
    (set, get) => ({
      sheets: [],

      saveSheet: (sheet) => {
        const prevSheet = get().sheets.find(s => s.id === sheet.id)
        const updatedSheet = { ...sheet, updatedAt: new Date().toISOString() }

        set((state) => {
          const existingIdx = state.sheets.findIndex(s => s.id === sheet.id)
          if (existingIdx >= 0) {
            const newSheets = [...state.sheets]
            newSheets[existingIdx] = updatedSheet
            return { sheets: newSheets }
          }
          return { sheets: [updatedSheet, ...state.sheets] }
        })

        // ── Link to Treasury when status is 'saved' ─────────────────────────
        if (sheet.status === 'saved') {
          const totalAmount = sheet.items.reduce((s, i) => s + Number(i.amount || 0), 0)
          if (totalAmount > 0) {
            import('./useTreasuryStore').then(({ useTreasuryStore }) => {
              useTreasuryStore.getState().addTransaction({
                amount: totalAmount,
                type: 'expense_other',
                isIncome: false,
                date: sheet.reportDate
                  ? new Date(sheet.reportDate).toISOString()
                  : new Date().toISOString(),
                notes: `كشف مصاريف: ${sheet.title} — ${sheet.personName}`,
                referenceId: `expense-sheet-${sheet.id}`,
              })
            })
          }
        } else if (prevSheet?.status === 'saved' && sheet.status === 'draft') {
          // Downgraded to draft → remove from treasury
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            useTreasuryStore.getState().deleteTransactionByReference(`expense-sheet-${sheet.id}`)
          })
        }
      },

      deleteSheet: (id) => {
        set((state) => ({
          sheets: state.sheets.filter(s => s.id !== id)
        }))
        // Remove treasury entry if it was a saved sheet
        import('./useTreasuryStore').then(({ useTreasuryStore }) => {
          useTreasuryStore.getState().deleteTransactionByReference(`expense-sheet-${id}`)
        })
      },

      clearAll: () => set({ sheets: [] }),
    }),
    {
      name: 'ppf-expenses-sheets',
    }
  )
)
