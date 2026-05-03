import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid, today } from '../utils/calculations'

export type TreasuryTransactionType =
  | 'income_client'    // Payment received from a client
  | 'income_other'     // Outside income
  | 'expense_supplier' // Payment given to a supplier for goods
  | 'expense_salary'   // Employee salaries
  | 'expense_factory'  // Electricity, Rent, Maintenance
  | 'expense_other'    // Petty cash

export interface TreasuryTransaction {
  id: string
  amount: number
  type: TreasuryTransactionType
  isIncome: boolean
  date: string
  notes: string
  referenceId?: string // Optional link to Client/Supplier/Order ID
}

interface TreasuryState {
  balance: number
  transactions: TreasuryTransaction[]
  addTransaction: (tx: Omit<TreasuryTransaction, 'id' | 'date'> & { date?: string }) => void
  updateTransaction: (id: string, data: Partial<TreasuryTransaction>) => void
  deleteTransaction: (id: string) => void
  deleteTransactionByReference: (refId: string) => void
  recalculateBalance: () => void
  clearAll: () => void
  generateCashFlowReport: (month: number, year: number) => {
    month: number;
    year: number;
    openingBalance: number;
    closingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    byCategory: {
      clientPayments: number;
      supplierPayments: number;
      salaries: number;
      factoryExpenses: number;
      otherExpenses: number;
    };
    dailyFlow: { date: string; income: number; expense: number; balance: number }[];
  }
}

export const useTreasuryStore = create<TreasuryState>()(
  persist(
    (set, get) => ({
      balance: 0,
      transactions: [],

      addTransaction: (tx) => {
        set(state => {
          const existingIdx = tx.referenceId ? state.transactions.findIndex(t => t.referenceId === tx.referenceId) : -1
          
          if (existingIdx >= 0) {
            const updatedTransactions = [...state.transactions]
            updatedTransactions[existingIdx] = {
              ...updatedTransactions[existingIdx],
              amount: tx.amount,
              isIncome: tx.isIncome,
              type: tx.type,
              date: tx.date || updatedTransactions[existingIdx].date,
              notes: tx.notes
            }
            return { transactions: updatedTransactions }
          }

          const newTx = {
            ...tx,
            id: uid(),
            date: tx.date || new Date().toISOString()
          }
          return {
            transactions: [...state.transactions, newTx]
          }
        })
        get().recalculateBalance()
      },

      updateTransaction: (id, data) => {
        set(state => ({
          transactions: state.transactions.map(t => t.id === id ? { ...t, ...data } : t)
        }))
        get().recalculateBalance()
      },

      deleteTransaction: (id) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }))
        get().recalculateBalance()
      },

      deleteTransactionByReference: (refId) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.referenceId !== refId)
        }))
        get().recalculateBalance()
      },

      recalculateBalance: () => {
        set(state => {
          const balance = state.transactions.reduce((acc, tx) => {
            return tx.isIncome ? acc + tx.amount : acc - tx.amount
          }, 0)
          return { balance }
        })
      },

      generateCashFlowReport: (month: number, year: number) => {
        const { transactions } = get()
        
        // Boundaries
        const startOfMonth = new Date(year, month - 1, 1).toISOString()
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString()
        
        // 1. Calculate opening balance (all transactions before startOfMonth)
        const openingBalance = transactions
          .filter(t => t.date < startOfMonth)
          .reduce((acc, t) => t.isIncome ? acc + t.amount : acc - t.amount, 0)
          
        // 2. Filter month transactions
        const monthTx = transactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth)
        
        let totalIncome = 0
        let totalExpenses = 0
        const byCategory = {
          clientPayments: 0,
          supplierPayments: 0,
          salaries: 0,
          factoryExpenses: 0,
          otherExpenses: 0
        }
        
        monthTx.forEach(t => {
          if (t.isIncome) {
            totalIncome += t.amount
            if (t.type === 'income_client') byCategory.clientPayments += t.amount
          } else {
            totalExpenses += t.amount
            if (t.type === 'expense_supplier') byCategory.supplierPayments += t.amount
            else if (t.type === 'expense_salary') byCategory.salaries += t.amount
            else if (t.type === 'expense_factory') byCategory.factoryExpenses += t.amount
            else byCategory.otherExpenses += t.amount
          }
        })
        
        const netFlow = totalIncome - totalExpenses
        const closingBalance = openingBalance + netFlow
        
        // 3. Generate daily flow
        const daysInMonth = new Date(year, month, 0).getDate()
        const dailyFlow = []
        let currentBalance = openingBalance
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayPrefix = dayStr
          
          const dayTxs = monthTx.filter(t => t.date.startsWith(dayPrefix))
          const dayInc = dayTxs.filter(t => t.isIncome).reduce((a, b) => a + b.amount, 0)
          const dayExp = dayTxs.filter(t => !t.isIncome).reduce((a, b) => a + b.amount, 0)
          
          currentBalance = currentBalance + dayInc - dayExp
          
          dailyFlow.push({
            date: dayStr,
            income: dayInc,
            expense: dayExp,
            balance: currentBalance
          })
        }
        
        return {
          month,
          year,
          openingBalance,
          closingBalance,
          totalIncome,
          totalExpenses,
          netFlow,
          byCategory,
          dailyFlow
        }
      },

      clearAll: () => set({ transactions: [], balance: 0 }),
    }),
    {
      name: 'ppf-treasury',
    }
  )
)
