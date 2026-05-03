import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ContractType = 'daily' | 'monthly' | 'piece'
export type OvertimeType = '1x' | '1.5x' | '2x' | 'fixed'

export interface Employee {
  id: string; code: string; fullName: string; factoryName: string
  position: string; department: string; hireDate: string
  contractType: ContractType; baseSalary: number
  avatar?: string // Employee photo
  // Attendance
  workingDaysInMonth: number; actualAttendanceDays: number
  absentUnexcusedDays: number; absentExcusedDays: number; lateMinutes: number
  // Overtime
  overtimeHours: number; overtimeType: OvertimeType; overtimeFixedRate: number
  // Allowances
  transportAllowance: number; mealAllowance: number; housingAllowance: number
  performanceBonus: number; annualBonus: number; incentive: number; commissionPercent: number
  // Deductions
  insuranceRate: number; incomeTaxRate: number
  currentAdvance: number; previousInstallments: number
  factoryPurchases: number; disciplinaryFines: number; otherDeductions: number
  // Computed
  grossSalary: number; netSalary: number
  totalAllowances: number; totalDeductions: number
  insuranceAmount: number; taxAmount: number; overtimePay: number
}

interface EmployeesState {
  employees: Employee[]
  saveEmployee: (e: Employee) => void
  deleteEmployee: (id: string) => void
  nextCode: () => string
  clearAll: () => void
}

const upsert = <T extends { id: string }>(arr: T[], item: T): T[] => {
  const idx = arr.findIndex(x => x.id === item.id)
  if (idx >= 0) { const n = [...arr]; n[idx] = item; return n }
  return [item, ...arr]
}

export const useEmployeesStore = create<EmployeesState>()(
  persist(
    (set, get) => ({
      employees: [],
      saveEmployee: (e) => set(s => ({ employees: upsert(s.employees, e) })),
      deleteEmployee: (id) => set(s => ({ employees: s.employees.filter(x => x.id !== id) })),
      clearAll: () => set({ employees: [] }),
      nextCode: () => {
        const codes = get().employees.map(e => parseInt(e.code.replace('EMP-', '') || '0'))
        const max = codes.length ? Math.max(...codes) : 0
        return `EMP-${String(max + 1).padStart(3, '0')}`
      },
    }),
    { name: 'ppf-employees' }
  )
)
