import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { n } from '../utils/calculations'
import type { Employee } from './useEmployeesStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'excused' | ''

export interface GridDayRecord {
  status: AttendanceStatus       // حالة الحضور
  lateValue: number              // قيمة التأخير
  lateUnit: 'min' | 'hr'        // وحدة التأخير
  overtimeValue: number          // قيمة الإضافي
  overtimeUnit: 'min' | 'hr'    // وحدة الإضافي
  fridayWork: boolean            // عمل يوم الجمعة (يُحسب بيومين)
  advanceValue: number           // السلفة اليومية
  notes?: string
}

export type EmployeeGridSheet = Record<string, GridDayRecord>

export interface WorkforceMonthSheet {
  yearMonth: string
  employeeSheets: Record<string, EmployeeGridSheet>
  fridayIsPaid: boolean
  savedAt?: string
}

export interface WorkerCalcResult {
  employeeId: string
  employeeName: string
  dailyRate: number
  presentDays: number
  absentDays: number
  excusedDays: number
  fridayWorkedDays: number
  paidFridayDays: number
  totalLateMinutes: number
  totalOvertimeHours: number
  basePay: number
  fridayPay: number
  fridayPaidBonus: number
  overtimePay: number
  lateDeduction: number
  totalAdvances: number
  netSalary: number
}

export interface CycleDay {
  dateStr: string
  dayName: string
  dayNum: number
  isFri: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildMonthDays(year: number, month: number): CycleDay[] {
  const days: CycleDay[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    days.push({
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayName: date.toLocaleDateString('ar-EG', { weekday: 'long' }),
      dayNum: d,
      isFri: date.getDay() === 5,
    })
  }
  return days
}

const toMinutes = (value: number, unit: 'min' | 'hr') => unit === 'hr' ? value * 60 : value
const toHours   = (value: number, unit: 'min' | 'hr') => unit === 'min' ? value / 60  : value

// ── Payroll Engine ────────────────────────────────────────────────────────────

export function computeWorkerPayroll(
  emp: Employee,
  sheet: EmployeeGridSheet,
  daysInMonth: CycleDay[],
  fridayIsPaid: boolean,
  workHoursPerDay = 8
): WorkerCalcResult {
  const daily = n(emp.baseSalary)
  const hourlyRate = workHoursPerDay > 0 ? daily / workHoursPerDay : 0

  let otRate = hourlyRate
  if (emp.overtimeType === '1.5x') otRate = hourlyRate * 1.5
  else if (emp.overtimeType === '2x') otRate = hourlyRate * 2
  else if (emp.overtimeType === 'fixed') otRate = n(emp.overtimeFixedRate)

  let presentDays = 0, absentDays = 0, excusedDays = 0
  let fridayWorkedDays = 0, totalFridays = 0
  let totalLateMinutes = 0, totalOvertimeHours = 0
  let totalAdvances = 0

  daysInMonth.forEach(day => {
    const rec = sheet[day.dateStr]
    if (day.isFri) {
      totalFridays++
      if (rec?.fridayWork) {
        fridayWorkedDays++
        totalLateMinutes  += toMinutes(n(rec.lateValue),     rec.lateUnit ?? 'min')
        totalOvertimeHours += toHours(n(rec.overtimeValue), rec.overtimeUnit ?? 'min')
      }
      return
    }
    if (rec?.status === 'present') {
      presentDays++
      totalLateMinutes   += toMinutes(n(rec.lateValue),     rec.lateUnit ?? 'min')
      totalOvertimeHours += toHours(n(rec.overtimeValue), rec.overtimeUnit ?? 'min')
    } else if (rec?.status === 'absent')  absentDays++
    else if (rec?.status === 'excused') excusedDays++
    
    // سلف مسجلة في هذا اليوم (تُجمع دائماً بغض النظر عن حالة الحضور)
    if (rec?.advanceValue) {
      totalAdvances += n(rec.advanceValue)
    }
  })

  const paidFridayDays = fridayIsPaid ? Math.max(0, totalFridays - fridayWorkedDays) : 0

  const basePay        = daily * presentDays
  const fridayPay      = daily * 2 * fridayWorkedDays  // يومان لكل جمعة عمل
  const fridayPaidBonus = daily * paidFridayDays       // الجمع المدفوعة بدون عمل
  const overtimePay    = totalOvertimeHours * otRate
  const lateDeduction  = workHoursPerDay > 0
    ? (totalLateMinutes / (workHoursPerDay * 60)) * daily : 0

  const netSalary = Math.max(0, basePay + fridayPay + fridayPaidBonus + overtimePay - lateDeduction - totalAdvances)

  return {
    employeeId: emp.id, employeeName: emp.fullName, dailyRate: daily,
    presentDays, absentDays, excusedDays,
    fridayWorkedDays, paidFridayDays,
    totalLateMinutes, totalOvertimeHours,
    basePay, fridayPay, fridayPaidBonus, overtimePay, lateDeduction, totalAdvances, netSalary,
  }
}

export interface AttendanceSummaryResult {
  actualDays: number;
  absentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
}

export function calculateAttendanceSummary(
  employeeId: string,
  month: number,
  year: number,
  getSheet: (ym: string) => WorkforceMonthSheet
): AttendanceSummaryResult {
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const monthSheet = getSheet(ym);
  const empSheet = monthSheet?.employeeSheets[employeeId] || {};
  const daysInMonth = buildMonthDays(year, month);

  let actualDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let totalLateMinutes = 0;
  let totalOvertimeHours = 0;

  daysInMonth.forEach(day => {
    const rec = empSheet[day.dateStr];
    if (!rec) return;

    if (rec.status === 'present') {
      actualDays++;
    } else if (rec.status === 'absent') {
      absentDays++;
    }

    if (day.isFri && rec.fridayWork) {
      actualDays++; // Or just handle fridays differently depending on logic, but usually we just count them if they worked.
    }

    const lateMins = toMinutes(n(rec.lateValue), rec.lateUnit ?? 'min');
    if (lateMins > 0) {
      lateDays++;
      totalLateMinutes += lateMins;
    }

    const overtimeHrs = toHours(n(rec.overtimeValue), rec.overtimeUnit ?? 'min');
    if (overtimeHrs > 0) {
      totalOvertimeHours += overtimeHrs;
    }
  });

  return { actualDays, absentDays, lateDays, totalLateMinutes, totalOvertimeHours };
}

// ── Default ───────────────────────────────────────────────────────────────────

const defaultSheet = (yearMonth: string): WorkforceMonthSheet =>
  ({ yearMonth, employeeSheets: {}, fridayIsPaid: false })

const defaultRec = (): GridDayRecord =>
  ({ status: '', lateValue: 0, lateUnit: 'min', overtimeValue: 0, overtimeUnit: 'min', fridayWork: false, advanceValue: 0, notes: '' })

// ── Store ─────────────────────────────────────────────────────────────────────

interface WorkforceState {
  sheets: Record<string, WorkforceMonthSheet>
  getSheet: (ym: string) => WorkforceMonthSheet
  getEmployeeSheet: (ym: string, empId: string) => EmployeeGridSheet
  setDayRecord: (ym: string, empId: string, dateStr: string, patch: Partial<GridDayRecord>) => void
  setFridayPaid: (ym: string, paid: boolean) => void
  clearSheet: (ym: string) => void
  clearAll: () => void
}

export const useWorkforceStore = create<WorkforceState>()(
  persist(
    (set, get) => ({
      sheets: {},
      getSheet: (ym) => get().sheets[ym] ?? defaultSheet(ym),
      getEmployeeSheet: (ym, empId) => get().sheets[ym]?.employeeSheets[empId] ?? {},

      setDayRecord: (ym, empId, dateStr, patch) =>
        set(s => {
          const existing = s.sheets[ym] ?? defaultSheet(ym)
          const empSheet = existing.employeeSheets[empId] ?? {}
          const dayRec   = empSheet[dateStr] ?? defaultRec()
          return {
            sheets: {
              ...s.sheets,
              [ym]: {
                ...existing,
                employeeSheets: {
                  ...existing.employeeSheets,
                  [empId]: { ...empSheet, [dateStr]: { ...dayRec, ...patch } },
                },
              },
            },
          }
        }),

      setFridayPaid: (ym, paid) =>
        set(s => {
          const existing = s.sheets[ym] ?? defaultSheet(ym)
          return { sheets: { ...s.sheets, [ym]: { ...existing, fridayIsPaid: paid } } }
        }),

      clearSheet: (ym) =>
        set(s => { const next = { ...s.sheets }; delete next[ym]; return { sheets: next } }),

      clearAll: () => set({ sheets: {} }),
    }),
    { name: 'ppf-workforce-grid-v2' }
  )
)
