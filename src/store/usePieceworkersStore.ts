import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Pieceworker {
  id: string
  name: string
  phone: string
  role: string // e.g., خياط، مقصدار، تشطيب
  joinDate: string
}

export interface ProductionTicket {
  id: string
  workerId: string
  date: string
  orderId: string
  orderNumber: string
  modelName: string
  type: 'whole' | 'stage'
  stageName?: string // Only if type === 'stage'
  quantity: number
  pricePerPiece: number
  totalAmount: number // quantity * pricePerPiece
  notes: string
  isPaid?: boolean
}

export interface PieceworkerAdvance {
  id: string
  workerId: string
  date: string
  amount: number
  notes: string
}

export interface PieceworkerPayment {
  id: string
  workerId: string
  date: string
  amount: number
  notes: string
}

interface PieceworkersState {
  workers: Pieceworker[]
  tickets: ProductionTicket[]
  advances: PieceworkerAdvance[]
  payments: PieceworkerPayment[]
  
  addWorker: (w: Pieceworker) => void
  updateWorker: (id: string, w: Partial<Pieceworker>) => void
  deleteWorker: (id: string) => void
  
  addTicket: (t: ProductionTicket) => void
  deleteTicket: (id: string) => void
  
  payPieceworker: (ticketId: string) => void
  payAllUnpaid: (workerId?: string) => void

  addAdvance: (a: PieceworkerAdvance) => void
  deleteAdvance: (id: string) => void
  
  addPayment: (p: PieceworkerPayment) => void
  deletePayment: (id: string) => void
}

export const usePieceworkersStore = create<PieceworkersState>()(
  persist(
    (set) => ({
      workers: [],
      tickets: [],
      advances: [],
      payments: [],
      
      addWorker: (w) => set((s) => ({ workers: [...s.workers, w] })),
      updateWorker: (id, updates) => set((s) => ({
        workers: s.workers.map(w => w.id === id ? { ...w, ...updates } : w)
      })),
      deleteWorker: (id) => set((s) => ({
        workers: s.workers.filter(w => w.id !== id),
        tickets: s.tickets.filter(t => t.workerId !== id),
        advances: s.advances.filter(a => a.workerId !== id),
        payments: s.payments.filter(p => p.workerId !== id),
      })),
      
      addTicket: (t) => set((s) => ({ tickets: [...s.tickets, t] })),
      deleteTicket: (id) => set((s) => ({ tickets: s.tickets.filter(t => t.id !== id) })),
      
      payPieceworker: (ticketId) => {
        set((s) => {
          const ticket = s.tickets.find(t => t.id === ticketId)
          if (!ticket || ticket.isPaid) return s
          
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            const worker = s.workers.find(w => w.id === ticket.workerId)
            useTreasuryStore.getState().addTransaction({
              amount: ticket.totalAmount,
              type: 'expense_salary',
              isIncome: false,
              date: new Date().toISOString(),
              notes: `دفع حساب تشغيل (عمال القطعة) - ${worker?.name || 'عامل'} - أوردر ${ticket.orderNumber}`,
              referenceId: ticketId
            })
          })

          return {
            tickets: s.tickets.map(t => t.id === ticketId ? { ...t, isPaid: true } : t)
          }
        })
      },

      payAllUnpaid: (workerId) => {
        set((s) => {
          const unpaidTickets = s.tickets.filter(t => !t.isPaid && (!workerId || t.workerId === workerId))
          if (unpaidTickets.length === 0) return s

          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            const treasury = useTreasuryStore.getState()
            
            // To avoid too many individual transactions, we could group them or add them one by one.
            // Adding one by one keeps the referenceId correct for each ticket.
            unpaidTickets.forEach(ticket => {
              const worker = s.workers.find(w => w.id === ticket.workerId)
              treasury.addTransaction({
                amount: ticket.totalAmount,
                type: 'expense_salary',
                isIncome: false,
                date: new Date().toISOString(),
                notes: `دفع حساب تشغيل (عمال القطعة) - ${worker?.name || 'عامل'} - أوردر ${ticket.orderNumber}`,
                referenceId: ticket.id
              })
            })
          })

          const unpaidIds = new Set(unpaidTickets.map(t => t.id))
          return {
            tickets: s.tickets.map(t => unpaidIds.has(t.id) ? { ...t, isPaid: true } : t)
          }
        })
      },

      addAdvance: (a) => set((s) => ({ advances: [...s.advances, a] })),
      deleteAdvance: (id) => set((s) => ({ advances: s.advances.filter(a => a.id !== id) })),
      
      addPayment: (p) => set((s) => ({ payments: [...s.payments, p] })),
      deletePayment: (id) => set((s) => ({ payments: s.payments.filter(p => p.id !== id) })),
    }),
    { name: 'protex-pieceworkers' }
  )
)
