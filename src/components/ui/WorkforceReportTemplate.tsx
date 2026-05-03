import React, { forwardRef } from 'react'
import type { Employee } from '../../store/useEmployeesStore'
import type { WorkerCalcResult, CycleDay, EmployeeGridSheet } from '../../store/useWorkforceStore'
import { fmt, MONTH_NAMES } from '../../utils/calculations'

export interface WorkforceReportTemplateProps {
  yearMonth: string
  employees: Employee[]
  days: CycleDay[]
  calcResults: WorkerCalcResult[]
  employeeSheets: Record<string, EmployeeGridSheet>
  fridayIsPaid: boolean
  factoryName?: string
  currencySymbol: string
  showSalary: boolean
  filterEmployeeId?: string | null
}

export const WorkforceReportTemplate = forwardRef<HTMLDivElement, WorkforceReportTemplateProps>(
  ({ yearMonth, employees, days, calcResults, employeeSheets, fridayIsPaid, factoryName, currencySymbol, showSalary, filterEmployeeId }, ref) => {
    const [yearStr, monthStr] = yearMonth.split('-')
    const monthName = MONTH_NAMES[parseInt(monthStr) - 1] ?? monthStr
    const workingDays = days.filter(d => !d.isFri).length

    const filteredEmps = filterEmployeeId
      ? employees.filter(e => e.id === filterEmployeeId)
      : employees

    const filteredResults = calcResults.filter(r =>
      filterEmployeeId ? r.employeeId === filterEmployeeId : true
    )

    const calcMap: Record<string, WorkerCalcResult> = {}
    filteredResults.forEach(r => { calcMap[r.employeeId] = r })

    const totalNet = filteredResults.reduce((a, r) => a + r.netSalary, 0)

    const C = { border: '1px solid #000', padding: '2px 1px', textAlign: 'center' as const, fontSize: '8px', fontWeight: 600 }
    const TH = { ...C, background: '#e5e7eb', color: '#000', fontWeight: 900 }

    const STATUS_SYMBOL: Record<string, string> = { present: '✓', absent: 'غ', excused: 'إ' }

    return (
      <div ref={ref} dir="rtl" style={{ fontFamily: 'Arial, sans-serif', background: '#fff', color: '#000', padding: '10px' }}>
        <style>
          {`
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}
        </style>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>
            سجل الحضور الشامل للموظفين
            {filterEmployeeId && filteredEmps[0] ? ` — ${filteredEmps[0].fullName}` : ''}
          </h1>
          <p style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0' }}>
            {factoryName || 'المصنع'} — {monthName} {yearStr}
          </p>
          <p style={{ fontSize: '10px', margin: 0 }}>
            أيام العمل: {workingDays} | الجمعة: {fridayIsPaid ? 'مدفوعة' : 'غير مدفوعة'}
            {!showSalary && ' | [نسخة المتابعة - الرواتب مخفية]'}
          </p>
        </div>

        {/* Main Grid: Employees as Rows, Days as Columns */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            {/* Header Row 1: Day Names */}
            <tr>
              <th rowSpan={2} style={{ ...TH, width: '20px' }}>م</th>
              <th rowSpan={2} style={{ ...TH, width: '100px' }}>اسم الموظف</th>
              {showSalary && <th rowSpan={2} style={{ ...TH, width: '40px' }}>اليومية</th>}
              
              {days.map(d => (
                <th key={d.dateStr} style={{ ...TH, width: '20px', fontSize: '6px', background: d.isFri ? '#fca5a5' : '#e5e7eb' }}>
                  {d.dayName.substring(0, 3)}
                </th>
              ))}
              
              <th colSpan={showSalary ? 6 : 4} style={{ ...TH, background: '#d1d5db' }}>الإجماليات الشهرية</th>
            </tr>
            {/* Header Row 2: Day Numbers & Totals Headers */}
            <tr>
              {days.map(d => (
                <th key={d.dateStr} style={{ ...TH, background: d.isFri ? '#fca5a5' : '#e5e7eb' }}>
                  {d.dayNum}
                </th>
              ))}
              <th style={{ ...TH, width: '25px', fontSize: '7px' }}>حضور</th>
              <th style={{ ...TH, width: '25px', fontSize: '7px' }}>تأخير</th>
              <th style={{ ...TH, width: '25px', fontSize: '7px' }}>إضافي</th>
              <th style={{ ...TH, width: '30px', fontSize: '7px' }}>سلف</th>
              {showSalary && <th style={{ ...TH, width: '40px', fontSize: '7px' }}>خصومات</th>}
              {showSalary && <th style={{ ...TH, width: '50px', fontSize: '8px' }}>الصافي</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp, i) => {
              const c = calcMap[emp.id]
              const empSheet = employeeSheets[emp.id] || {}

              return (
                <tr key={emp.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={C}>{i + 1}</td>
                  <td style={{ ...C, textAlign: 'right', paddingRight: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.fullName}
                  </td>
                  {showSalary && <td style={C}>{fmt(emp.baseSalary, 0)}</td>}

                  {/* Day Cells */}
                  {days.map(d => {
                    const rec = empSheet[d.dateStr]
                    let cellText = ''
                    let cellColor = '#000'
                    let bg = d.isFri ? '#fee2e2' : 'transparent'

                    if (d.isFri && rec?.fridayWork) {
                      cellText = '⚡'
                      cellColor = '#b45309'
                    } else if (rec?.status) {
                      cellText = STATUS_SYMBOL[rec.status] || ''
                      if (rec.status === 'present') cellColor = '#16a34a'
                      else if (rec.status === 'absent') cellColor = '#dc2626'
                      else if (rec.status === 'excused') cellColor = '#2563eb'
                    }

                    // If there's late or overtime or advance on this day, add a tiny dot or just rely on totals
                    const hasMod = rec?.lateValue || rec?.overtimeValue || rec?.advanceValue
                    
                    return (
                      <td key={d.dateStr} style={{ ...C, color: cellColor, background: bg, fontSize: '10px' }}>
                        {cellText}
                        {hasMod && !cellText ? '*' : ''}
                      </td>
                    )
                  })}

                  {/* Totals */}
                  <td style={{ ...C, background: '#f0fdf4', color: '#16a34a' }}>{c?.presentDays ?? 0}</td>
                  <td style={{ ...C, background: '#fffbeb', color: '#b45309' }}>{c?.totalLateMinutes ?? 0}د</td>
                  <td style={{ ...C, background: '#faf5ff', color: '#7e22ce' }}>{fmt(c?.totalOvertimeHours ?? 0, 1)}س</td>
                  <td style={{ ...C, background: '#fef2f2', color: '#dc2626' }}>{fmt(c?.totalAdvances ?? 0, 0)}</td>
                  {showSalary && (
                    <td style={{ ...C, background: '#fef2f2', color: '#dc2626', fontSize: '7px' }}>
                      {fmt(c?.lateDeduction ?? 0, 0)}
                    </td>
                  )}
                  {showSalary && (
                    <td style={{ ...C, background: '#ecfdf5', color: '#047857', fontWeight: 900, fontSize: '10px' }}>
                      {fmt(c?.netSalary ?? 0, 0)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {showSalary && (
            <tfoot>
              <tr>
                <td colSpan={days.length + 3} style={{ ...TH, textAlign: 'left', paddingLeft: '10px' }}>إجمالي الصافي المستحق للجميع</td>
                <td colSpan={6} style={{ ...TH, background: '#111', color: '#fff', fontSize: '14px' }}>
                  {fmt(totalNet, 0)} {currencySymbol}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Footer info & signatures */}
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700 }}>
          <div>
            <p style={{ margin: '0 0 5px' }}>دليل الرموز: (✓) حضور — (غ) غياب — (إ) إذن — (⚡) عمل جمعة — (*) يوم به تعديلات ماليّة</p>
          </div>
          <div style={{ display: 'flex', gap: '50px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px' }}>المدير المالي</p>
              <p style={{ margin: 0 }}>_________________</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px' }}>مدير الموارد البشرية</p>
              <p style={{ margin: 0 }}>_________________</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px' }}>المدير العام</p>
              <p style={{ margin: 0 }}>_________________</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

WorkforceReportTemplate.displayName = 'WorkforceReportTemplate'
