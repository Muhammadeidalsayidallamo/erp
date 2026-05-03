import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MonthlyPayrollRecord {
  id: string                  // unique record ID
  employeeId: string
  employeeCode: string
  employeeName: string
  factoryName: string
  position: string
  department: string

  // Period
  year: number
  month: number               // 0-based (Jan=0)

  // Salary breakdown
  basePay: number             // يومية × أيام حضور
  overtimePay: number
  totalAllowances: number
  grossSalary: number

  // Deductions
  insuranceAmount: number
  taxAmount: number
  lateDeduction: number
  absentDeduction: number
  currentAdvance: number
  previousInstallments: number
  factoryPurchases: number
  disciplinaryFines: number
  otherDeductions: number
  totalDeductions: number

  // Result
  netSalary: number

  // Overtime detail
  overtimeHours: number
  overtimeType: string
  overtimeRate: number        // السعر الفعلي للساعة المحسوب

  // Attendance detail
  workingDaysInMonth: number
  actualAttendanceDays: number
  absentUnexcusedDays: number
  absentExcusedDays: number
  lateMinutes: number

  savedAt: string             // ISO timestamp
}

interface PayrollState {
  records: MonthlyPayrollRecord[]
  savedMonths: string[] // format: "YYYY-MM"
  saveMonthlyRecords: (recs: MonthlyPayrollRecord[], autoTreasury?: boolean) => void
  markMonthAsSaved: (month: string) => void
  deleteRecord: (id: string) => void
  clearMonth: (year: number, month: number) => void
  getByEmployee: (employeeId: string) => MonthlyPayrollRecord[]
  getByMonth: (year: number, month: number) => MonthlyPayrollRecord[]
  getByRange: (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => MonthlyPayrollRecord[]
  getLatestMonths: (n: number) => MonthlyPayrollRecord[]
  clearAll: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compare two period tuples: returns negative / 0 / positive */
const cmpPeriod = (ay: number, am: number, by: number, bm: number) =>
  ay !== by ? ay - by : am - bm

/** True if record is within [from, to] inclusive */
const inRange = (
  r: MonthlyPayrollRecord,
  fromYear: number, fromMonth: number,
  toYear: number, toMonth: number
) => {
  const after = cmpPeriod(r.year, r.month, fromYear, fromMonth) >= 0
  const before = cmpPeriod(r.year, r.month, toYear, toMonth) <= 0
  return after && before
}

/** Generate unique id */
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      records: [],
      savedMonths: [],

      markMonthAsSaved: (month) => set(s => ({
        savedMonths: s.savedMonths.includes(month) ? s.savedMonths : [...s.savedMonths, month]
      })),

      saveMonthlyRecords: (incoming, autoTreasury = false) => {
        if (!incoming.length) return
        const { year, month } = incoming[0]
        // Remove existing records for this period first (overwrite semantics)
        const kept = get().records.filter(r => !(r.year === year && r.month === month))
        const stamped = incoming.map(r => ({ ...r, id: r.id || uid(), savedAt: new Date().toISOString() }))
        set({ records: [...kept, ...stamped] })

        // ── Auto-post to treasury as expense_salary ──────────────────────────
        if (autoTreasury) {
          // Dynamic import to avoid circular dep
          import('./useTreasuryStore').then(({ useTreasuryStore }) => {
            const totalNet = stamped.reduce((s, r) => s + r.netSalary, 0)
            const MONTH_NAMES = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
            if (totalNet > 0) {
              useTreasuryStore.getState().addTransaction({
                amount: totalNet,
                type: 'expense_salary',
                isIncome: false,
                date: new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`).toISOString(),
                notes: `رواتب موظفين شهر ${MONTH_NAMES[month]} ${year} — ${stamped.length} موظف`,
                referenceId: `payroll-${year}-${month}`,
              })
            }
          })
        }
      },

      deleteRecord: (id) =>
        set(s => ({ records: s.records.filter(r => r.id !== id) })),

      clearMonth: (year, month) => {
        set(s => ({ records: s.records.filter(r => !(r.year === year && r.month === month)) }))
        import('./useTreasuryStore').then(({ useTreasuryStore }) => {
          useTreasuryStore.getState().deleteTransactionByReference(`payroll-${year}-${month}`)
        })
      },

      getByEmployee: (employeeId) =>
        get().records
          .filter(r => r.employeeId === employeeId)
          .sort((a, b) => cmpPeriod(b.year, b.month, a.year, a.month)),

      getByMonth: (year, month) =>
        get().records.filter(r => r.year === year && r.month === month),

      getByRange: (fromYear, fromMonth, toYear, toMonth) =>
        get().records
          .filter(r => inRange(r, fromYear, fromMonth, toYear, toMonth))
          .sort((a, b) => cmpPeriod(b.year, b.month, a.year, a.month)),

      getLatestMonths: (n) => {
        const all = get().records
        if (!all.length) return []
        // Find unique periods, sorted desc
        const periods = [...new Set(all.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`))]
          .sort((a, b) => b.localeCompare(a))
          .slice(0, n)
        return all.filter(r => periods.includes(`${r.year}-${String(r.month).padStart(2, '0')}`))
          .sort((a, b) => cmpPeriod(b.year, b.month, a.year, a.month))
      },

      clearAll: () => set({ records: [], savedMonths: [] }),
    }),
    { name: 'ppf-payroll-history' }
  )
)

// ── Factory: build a MonthlyPayrollRecord from an Employee ────────────────────
// Import Employee type lazily to avoid circular deps
import type { Employee } from './useEmployeesStore'
import { n } from '../utils/calculations'
import { AttendanceSummaryResult } from './useWorkforceStore'

export function buildPayrollRecord(
  emp: Employee,
  year: number,
  month: number,
  workHoursPerDay: number,
  attendanceSummary?: AttendanceSummaryResult
): MonthlyPayrollRecord {
  // Use synced attendance if provided, else manual entry
  const attended = attendanceSummary ? attendanceSummary.actualDays : n(emp.actualAttendanceDays)
  const lateMins = attendanceSummary ? attendanceSummary.totalLateMinutes : n(emp.lateMinutes)
  const otHours = attendanceSummary ? attendanceSummary.totalOvertimeHours : n(emp.overtimeHours)
  const absentUnexcused = attendanceSummary ? attendanceSummary.absentDays : n(emp.absentUnexcusedDays)

  // ── Base pay ──────────────────────────────────────────────────────────────
  const daily = n(emp.baseSalary)
  const basePay = daily * attended
  const hourlyRate = workHoursPerDay > 0 ? daily / workHoursPerDay : 0

  // ── Overtime ─────────────────────────────────────────────────────────────
  let overtimeRate = hourlyRate
  if (emp.overtimeType === '1.5x') overtimeRate = hourlyRate * 1.5
  else if (emp.overtimeType === '2x') overtimeRate = hourlyRate * 2
  else if (emp.overtimeType === 'fixed') overtimeRate = n(emp.overtimeFixedRate)
  const overtimePay = otHours * overtimeRate

  // ── Allowances ────────────────────────────────────────────────────────────
  const totalAllowances =
    n(emp.transportAllowance) + n(emp.mealAllowance) + n(emp.housingAllowance) +
    n(emp.performanceBonus) + n(emp.annualBonus) + n(emp.incentive) +
    (basePay * n(emp.commissionPercent) / 100)

  const grossSalary = basePay + overtimePay + totalAllowances

  // ── Deductions ────────────────────────────────────────────────────────────
  const insuranceAmount = grossSalary * n(emp.insuranceRate) / 100
  const taxableIncome = grossSalary - insuranceAmount
  const taxAmount = taxableIncome * n(emp.incomeTaxRate) / 100

  const workMinutesPerDay = workHoursPerDay * 60
  const lateDeduction = workMinutesPerDay > 0 ? (lateMins / workMinutesPerDay) * daily : 0
  const absentDeduction = absentUnexcused * daily // 1× fine; day already not in basePay → total 2× effect


  const currentAdvance = n(emp.currentAdvance)
  const previousInstallments = n(emp.previousInstallments)
  const factoryPurchases = n(emp.factoryPurchases)
  const disciplinaryFines = n(emp.disciplinaryFines)
  const otherDeductions = n(emp.otherDeductions)

  const totalDeductions =
    insuranceAmount + taxAmount + lateDeduction + absentDeduction +
    currentAdvance + previousInstallments + factoryPurchases + disciplinaryFines + otherDeductions

  const netSalary = Math.max(0, grossSalary - totalDeductions)

  return {
    id: `${emp.id}-${year}-${month}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.fullName,
    factoryName: emp.factoryName || '',
    position: emp.position || '',
    department: emp.department || '',
    year,
    month,
    basePay,
    overtimePay,
    totalAllowances,
    grossSalary,
    insuranceAmount,
    taxAmount,
    lateDeduction,
    absentDeduction,
    currentAdvance,
    previousInstallments,
    factoryPurchases,
    disciplinaryFines,
    otherDeductions,
    totalDeductions,
    netSalary,
    overtimeHours: n(emp.overtimeHours),
    overtimeType: emp.overtimeType,
    overtimeRate,
    workingDaysInMonth: n(emp.workingDaysInMonth),
    actualAttendanceDays: attended,
    absentUnexcusedDays: n(emp.absentUnexcusedDays),
    absentExcusedDays: n(emp.absentExcusedDays),
    lateMinutes: n(emp.lateMinutes),
    savedAt: new Date().toISOString(),
  }
}
