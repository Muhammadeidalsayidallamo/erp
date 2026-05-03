import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../utils/calculations'

export interface Client {
  id: string
  name: string
  phone: string
  company: string
  totalDebt: number
  totalPaid: number
  balance: number // Negative means client owes us money, positive means we owe them
  createdAt: string
}

export interface Transaction {
  id: string
  clientId: string
  orderId: string | null
  amount: number
  type: 'debt' | 'payment' // 'debt' implies client owes us for an order, 'payment' is them paying us
  date: string
  notes: string
}

interface ClientsState {
  clients: Client[]
  transactions: Transaction[]
  
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'totalDebt' | 'totalPaid' | 'balance'>) => void
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void
  
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void
  updateTransaction: (id: string, data: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  deleteTransactionsByOrder: (orderId: string) => void
  removeDebt: (orderId: string) => void
  recalculateBalances: () => void
  clearAll: () => void
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      clients: [],
      transactions: [],

      addClient: (data) => set(state => ({
        clients: [...state.clients, {
          ...data,
          id: uid(),
          createdAt: new Date().toISOString().split('T')[0],
          totalDebt: 0,
          totalPaid: 0,
          balance: 0
        }]
      })),

      updateClient: (id, data) => set(state => ({
        clients: state.clients.map(c => c.id === id ? { ...c, ...data } : c)
      })),

      deleteClient: (id) => set(state => ({
        clients: state.clients.filter(c => c.id !== id),
        transactions: state.transactions.filter(t => t.clientId !== id)
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

        // Link to Treasury if it's a payment from client
        if (data.type === 'payment') {
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            const client = get().clients.find(c => c.id === data.clientId)
            useTreasuryStore.getState().addTransaction({
              amount: data.amount,
              type: 'income_client',
              isIncome: true,
              date: new Date().toISOString(),
              notes: `تحصيل من عميل: ${client?.name || 'غير معروف'} - ${data.notes || ''}`,
              referenceId: newId
            })
          })
        }

        get().recalculateBalances()
      },

      updateTransaction: (id, data) => {
        set(state => ({
          transactions: state.transactions.map(t => t.id === id ? { ...t, ...data } : t)
        }))
        get().recalculateBalances()
      },

      deleteTransaction: (id) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }))
        get().recalculateBalances()
      },

      deleteTransactionsByOrder: (orderId: string) => {
        set(state => ({
          transactions: state.transactions.filter(t => !(t.orderId === orderId && t.type === 'debt'))
        }))
        get().recalculateBalances()
      },

      removeDebt: (orderId: string) => {
        set(state => ({
          transactions: state.transactions.filter(t => !(t.orderId === orderId && t.type === 'debt'))
        }))
        get().recalculateBalances()
      },

      recalculateBalances: () => set(state => {
        const newClients = state.clients.map(client => {
          const clientTx = state.transactions.filter(t => t.clientId === client.id)
          const totalDebt = clientTx.filter(t => t.type === 'debt').reduce((s, t) => s + t.amount, 0)
          const totalPaid = clientTx.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0)
          const balance = totalPaid - totalDebt
          return { ...client, totalDebt, totalPaid, balance }
        })
        return { clients: newClients }
      }),
      clearAll: () => set({ clients: [], transactions: [] }),
    }),
    {
      name: 'ppf-clients',
    }
  )
)
