import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../utils/calculations'

export type InventoryCategory = string | 'سيلك سكرين (أحبار/شاشات)' | 'DTF (أفلام/أحبار/بودرة)' | 'ملابس (قماش/خيوط/إكسسوارات)' | 'عام'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  quantity: number       // Current amount in stock
  originalUnit: string   // e.g., 'لتر', 'رول', 'كيلو', 'متر', 'طوب'
  costPerUnit: number    // Used to calculate actual inventory net worth
  minimumStock: number   // Alert threshold
  createdAt: string
  lastUpdated: string
}

export interface InventoryTransaction {
  id: string
  itemId: string
  type: 'in' | 'out'
  quantity: number
  date: string
  reference: string // e.g., 'أوردر سيلك سكرين رقم 10' or 'فاتورة دائنة من المورد فلان'
}

interface InventoryState {
  items: InventoryItem[]
  transactions: InventoryTransaction[]
  
  addItem: (data: Omit<InventoryItem, 'id' | 'createdAt' | 'lastUpdated'>) => void
  updateItem: (id: string, data: Partial<InventoryItem>) => void
  deleteItem: (id: string) => void
  
  // Stock modifiers
  addStock: (itemId: string, quantity: number, costPerUnit: number, reference: string, supplierId?: string, paymentAmount?: number) => void
  deductStock: (itemId: string, quantity: number, reference: string) => void
  clearAll: () => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: [
        // Base seed items
        { id: 'inv-dtf-film', name: 'رول فيلم DTF', category: 'DTF (أفلام/أحبار/بودرة)', quantity: 0, originalUnit: 'رول', costPerUnit: 0, minimumStock: 2, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        { id: 'inv-dtf-ink-c', name: 'حبر DTF ألوان', category: 'DTF (أفلام/أحبار/بودرة)', quantity: 0, originalUnit: 'لتر', costPerUnit: 0, minimumStock: 1, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        { id: 'inv-dtf-powder', name: 'بودرة DTF', category: 'DTF (أفلام/أحبار/بودرة)', quantity: 0, originalUnit: 'كيلو', costPerUnit: 0, minimumStock: 5, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        { id: 'inv-silk-ink', name: 'حبر سيلك سكرين بلاستيسول', category: 'سيلك سكرين (أحبار/شاشات)', quantity: 0, originalUnit: 'كيلو', costPerUnit: 0, minimumStock: 10, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        { id: 'inv-fabric-polo', name: 'قماش بولو (بيكة)', category: 'ملابس (قماش/خيوط/إكسسوارات)', quantity: 0, originalUnit: 'كيلو', costPerUnit: 0, minimumStock: 50, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
      ],
      transactions: [],

      addItem: (data) => set(state => ({
        items: [...state.items, {
          ...data,
          id: uid(),
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }]
      })),

      updateItem: (id, data) => set(state => ({
        items: state.items.map(s => s.id === id ? { ...s, ...data, lastUpdated: new Date().toISOString() } : s)
      })),

      deleteItem: (id) => {
        const itemTransactions = get().transactions.filter(t => t.itemId === id)
        
        // Clean up linked stores
        import('./useTreasuryStore').then(({ useTreasuryStore }) => {
          const treasury = useTreasuryStore.getState()
          itemTransactions.forEach(t => treasury.deleteTransactionByReference(t.id))
        })
        import('./useSuppliersStore').then(({ useSuppliersStore }) => {
          const suppliers = useSuppliersStore.getState()
          itemTransactions.forEach(t => suppliers.deleteTransactionByReference(t.id))
        })

        set(state => ({
          items: state.items.filter(s => s.id !== id),
          transactions: state.transactions.filter(t => t.itemId !== id)
        }))
      },

      addStock: (itemId, quantity, costPerUnit, reference, supplierId, paymentAmount = 0) => {
        const txId = uid()
        set(state => {
          const item = state.items.find(i => i.id === itemId)
          if (!item) return state

          // Calculate new average cost (simplified)
          const totalVal = (item.quantity * item.costPerUnit) + (quantity * costPerUnit)
          const newQty = item.quantity + quantity
          const newAvgCost = newQty > 0 ? totalVal / newQty : costPerUnit

          return {
            items: state.items.map(i => i.id === itemId ? { ...i, quantity: newQty, costPerUnit: newAvgCost, lastUpdated: new Date().toISOString() } : i),
            transactions: [...state.transactions, { id: txId, itemId, type: 'in', quantity, date: new Date().toISOString(), reference }]
          }
        })

        // ── ERP Linking ──
        if (supplierId) {
          const totalCost = quantity * costPerUnit
          
          // 1. Add Debt to Supplier
          import('./useSuppliersStore').then(({ useSuppliersStore }) => {
            useSuppliersStore.getState().addTransaction({
              supplierId,
              amount: totalCost,
              type: 'debt',
              notes: `توريد خامات: ${reference}`,
              referenceId: txId
            })
            
            // 2. If there's a payment made immediately
            if (paymentAmount > 0) {
              useSuppliersStore.getState().addTransaction({
                supplierId,
                amount: paymentAmount,
                type: 'payment',
                notes: `سداد جزئي/كلي عن توريد خامات: ${reference}`,
                referenceId: txId
              })
            }
          })
        } else if (paymentAmount > 0) {
          // If no supplier but still a cash purchase (Petty Cash)
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            useTreasuryStore.getState().addTransaction({
              amount: paymentAmount,
              type: 'expense_factory',
              isIncome: false,
              date: new Date().toISOString(),
              notes: `شراء خامات نقدي (نثرية): ${reference}`,
              referenceId: txId
            })
          })
        }
      },

      deductStock: (itemId, quantity, reference) => {
        set(state => {
          const item = state.items.find(i => i.id === itemId)
          if (!item) return state
          return {
            items: state.items.map(i => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - quantity), lastUpdated: new Date().toISOString() } : i),
            transactions: [...state.transactions, { id: uid(), itemId, type: 'out', quantity, date: new Date().toISOString(), reference }]
          }
        })
      },
      clearAll: () => set(state => ({
        items: state.items.map(i => ({ ...i, quantity: 0, costPerUnit: 0 })),
        transactions: []
      }))
    }),
    {
      name: 'ppf-inventory',
    }
  )
)
