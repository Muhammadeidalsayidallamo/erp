import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../utils/calculations'

export interface Supplier {
  id: string
  name: string
  contactPhone: string
  company: string
  supplyType: string // e.g. "أقمشة", "أحبار", "ورق"
  totalDebt: number  // Total money we owe them
  totalPaid: number  // Total money we paid them
  balance: number    // Negative means we owe them, positive means overpaid
  createdAt: string
}

export interface SupplierTransaction {
  id: string
  supplierId: string
  amount: number
  type: 'debt' | 'payment' // 'debt' implies we bought something and owe them, 'payment' is us paying them
  date: string
  notes: string
  referenceId?: string
}

interface SuppliersState {
  suppliers: Supplier[]
  transactions: SupplierTransaction[]
  
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'totalDebt' | 'totalPaid' | 'balance'>) => void
  updateSupplier: (id: string, data: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  
  addTransaction: (data: Omit<SupplierTransaction, 'id' | 'date'>) => void
  deleteTransaction: (id: string) => void
  deleteTransactionByReference: (refId: string) => void
  
  recalculateBalances: () => void
  clearAll: () => void
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      transactions: [],

      addSupplier: (data) => set(state => ({
        suppliers: [...state.suppliers, {
          ...data,
          id: uid(),
          createdAt: new Date().toISOString().split('T')[0],
          totalDebt: 0,
          totalPaid: 0,
          balance: 0
        }]
      })),

      updateSupplier: (id, data) => set(state => ({
        suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...data } : s)
      })),

      deleteSupplier: (id) => set(state => ({
        suppliers: state.suppliers.filter(s => s.id !== id),
        transactions: state.transactions.filter(t => t.supplierId !== id)
      })),

      addTransaction: (data) => {
        const newId = uid()
        const todayStr = new Date().toISOString().split('T')[0]
        
        set(state => ({
          transactions: [...state.transactions, {
            ...data,
            id: newId,
            date: todayStr
          }]
        }))
        
        // Link to Treasury if it's a payment
        if (data.type === 'payment') {
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            const supplier = get().suppliers.find(s => s.id === data.supplierId)
            useTreasuryStore.getState().addTransaction({
              amount: data.amount,
              type: 'expense_supplier',
              isIncome: false,
              date: new Date().toISOString(),
              notes: `سداد للمورد: ${supplier?.name || 'غير معروف'} - ${data.notes || ''}`,
              referenceId: newId
            })
          })
        }
        
        get().recalculateBalances()
      },

      deleteTransaction: (id) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }))
        get().recalculateBalances()
      },

      deleteTransactionByReference: (refId) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.referenceId !== refId)
        }))
        get().recalculateBalances()
      },

      recalculateBalances: () => set(state => {
        const newSuppliers = state.suppliers.map(supplier => {
          const supplierTx = state.transactions.filter(t => t.supplierId === supplier.id)
          const totalDebt = supplierTx.filter(t => t.type === 'debt').reduce((s, t) => s + t.amount, 0)
          const totalPaid = supplierTx.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0)
          const balance = totalPaid - totalDebt // -500 means we owe them 500
          
          return { ...supplier, totalDebt, totalPaid, balance }
        })
        return { suppliers: newSuppliers }
      }),
      clearAll: () => set({ suppliers: [], transactions: [] }),
    }),
    {
      name: 'ppf-suppliers',
    }
  )
)
