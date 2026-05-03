import React from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt } from '../../utils/calculations'
import type { Employee } from '../../store/useEmployeesStore'
import type { EmployeeGridSheet } from '../../store/useWorkforceStore'

interface AttendanceReportProps {
  emp: Employee
  sheet: { records: EmployeeGridSheet }
  yearMonth: string
  summary: { p: number; a: number; e: number; late: number; ot: number; adv: number }
}

const MONTH_NAMES_AR = [
  'يناير','فبراير','مارس','إبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
]

export const AttendanceReportTemplate = React.forwardRef<HTMLDivElement, AttendanceReportProps>((
  { emp, sheet, yearMonth, summary },
  ref
) => {
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'
  const [year, month] = yearMonth.split('-').map(Number)
  const monthNameAr = MONTH_NAMES_AR[month - 1] || ''
  const printDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })

  // Generate 1st -> end of month cycle dates
  const daysArray: { dateStr: string, name: string, isFri: boolean }[] = []
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    daysArray.push({
      dateStr,
      name: d.toLocaleDateString('ar-EG', { weekday: 'long' }),
      isFri: d.getDay() === 5
    })
  }

  // Compute net salary from emp
  const netSalary = emp.netSalary || 0
  const workingDays = emp.workingDaysInMonth || 26
  const actualDays = emp.actualAttendanceDays ?? Math.max(0, workingDays - summary.a - summary.e)

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        fontFamily: "'Cairo', 'Arial', sans-serif",
        background: '#fff',
        color: '#111',
        padding: '20px 28px',
        fontSize: '11px',
        lineHeight: '1.5',
        maxWidth: '210mm',
        margin: '0 auto',
      }}
    >
      {/* ══ TOP HEADER BAND ══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '3px double #000',
        paddingBottom: '12px',
        marginBottom: '14px',
      }}>
        {/* Company Info */}
        <div>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {settings.companyName || 'ProTex ERP'}
          </div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>نظام إدارة موارد المصنع</div>
          {settings.companyAddress && (
            <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>{settings.companyAddress}</div>
          )}
        </div>
        {/* Document Title Box */}
        <div style={{ textAlign: 'left' }}>
          <div style={{
            border: '2px solid #000',
            borderRadius: '6px',
            padding: '6px 16px',
            textAlign: 'center',
            marginBottom: '6px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 900 }}>سجل الحضور الشهري</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#444' }}>
              {monthNameAr} — {year}
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#666', textAlign: 'left' }}>
            <div>تاريخ الطباعة: {printDate}</div>
          </div>
        </div>
      </div>

      {/* ══ EMPLOYEE IDENTITY CARD ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '8px',
        background: '#f4f4f4',
        border: '1px solid #ccc',
        borderRadius: '6px',
        padding: '10px 14px',
        marginBottom: '14px',
      }}>
        {[
          { label: 'اسم الموظف', value: emp.fullName },
          { label: 'الكود الوظيفي', value: emp.code },
          { label: 'المسمى الوظيفي', value: emp.position || 'عامل' },
          { label: 'اليومية / الراتب', value: `${fmt(emp.baseSalary || 0, 0)} ${cur}` },
        ].map((item, i) => (
          <div key={i}>
            <div style={{ fontSize: '8px', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div>
            <div style={{ fontWeight: 900, fontSize: '12px' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ══ SUMMARY METRICS ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '6px',
        marginBottom: '14px',
      }}>
        {[
          { label: 'أيام الحضور', value: String(actualDays), suffix: 'يوم', border: '#16a34a' },
          { label: 'أيام الغياب', value: String(summary.a), suffix: 'يوم', border: '#dc2626' },
          { label: 'إذن / إجازة', value: String(summary.e), suffix: 'يوم', border: '#2563eb' },
          { label: 'دقائق تأخير', value: String(summary.late), suffix: 'دقيقة', border: '#d97706' },
          { label: 'ساعات إضافي', value: String(summary.ot), suffix: 'ساعة', border: '#7c3aed' },
          { label: 'السلف الإجمالي', value: fmt(summary.adv, 0), suffix: cur, border: '#111' },
        ].map((box, i) => (
          <div key={i} style={{
            border: `2px solid ${box.border}`,
            borderRadius: '5px',
            padding: '7px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '8px', color: '#666', fontWeight: 700 }}>{box.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1.1, marginTop: '3px' }}>{box.value}</div>
            <div style={{ fontSize: '8px', color: '#888' }}>{box.suffix}</div>
          </div>
        ))}
      </div>

      {/* ══ MAIN TABLE ══ */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '10px',
        marginBottom: '16px',
      }}>
        <thead>
          <tr style={{ background: '#1a1a1a', color: '#fff' }}>
            {['التاريخ', 'اليوم', 'الحالة', 'تأخير (دق)', 'إضافي (س)', 'سلفة', 'ملاحظات'].map((h, i) => (
              <th key={i} style={{
                padding: '6px 7px',
                border: '1px solid #000',
                textAlign: i === 0 ? 'center' : i >= 2 ? 'center' : 'right',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daysArray.map((dayObj, i) => {
            const rec = sheet.records[dayObj.dateStr] || {}
            const dayName = dayObj.name
            const isFriday = dayObj.isFri
            const isAbsent = rec.status === 'absent'
            const isPresent = rec.status === 'present'
            const isExcused = rec.status === 'excused'

            const bg = isFriday ? '#ebebeb' : isAbsent ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa'

            return (
              <tr key={dayObj.dateStr} style={{ background: bg }}>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', textAlign: 'center', color: '#888', fontWeight: 700, fontFamily: 'monospace' }}>
                  {dayObj.dateStr.split('-').slice(1).join('/')}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', fontWeight: isFriday ? 700 : 400, color: isFriday ? '#666' : '#111' }}>
                  {dayName}
                  {isFriday && <span style={{ fontSize: '8px', color: '#999', marginRight: '4px' }}> (إجازة)</span>}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 900 }}>
                  {isPresent && <span style={{ color: '#15803d', border: '1px solid #15803d', padding: '1px 6px', borderRadius: '3px', fontSize: '9px' }}>✓ حاضر</span>}
                  {isAbsent && <span style={{ color: '#dc2626', border: '1px solid #dc2626', padding: '1px 6px', borderRadius: '3px', fontSize: '9px' }}>✗ غائب</span>}
                  {isExcused && <span style={{ color: '#1d4ed8', border: '1px solid #1d4ed8', padding: '1px 6px', borderRadius: '3px', fontSize: '9px' }}>◎ إذن</span>}
                  {!rec.status && <span style={{ color: '#bbb' }}>—</span>}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', color: rec.lateValue ? '#b45309' : '#ccc' }}>
                  {rec.lateValue ? `${rec.lateValue}${rec.lateUnit === 'hr' ? 'س' : 'د'}` : '—'}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', color: rec.overtimeValue ? '#7c3aed' : '#ccc' }}>
                  {rec.overtimeValue ? `${rec.overtimeValue}${rec.overtimeUnit === 'hr' ? 'س' : 'د'}` : '—'}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', color: rec.advanceValue ? '#dc2626' : '#ccc' }}>
                  {rec.advanceValue ? `${fmt(rec.advanceValue, 0)} ${cur}` : '—'}
                </td>
                <td style={{ padding: '5px 7px', border: '1px solid #ddd', color: '#555', fontSize: '9px', fontStyle: 'italic' }}>
                  {rec.notes || ''}
                </td>
              </tr>
            )
          })}
        </tbody>
        {/* ══ Totals Footer ══ */}
        <tfoot>
          <tr style={{ background: '#1a1a1a', color: '#fff' }}>
            <td colSpan={2} style={{ padding: '7px 10px', border: '1px solid #000', fontWeight: 900, textAlign: 'right' }}>
              الإجمالي الشهري
            </td>
            <td style={{ padding: '7px', border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>
              {actualDays} يوم حضور
            </td>
            <td style={{ padding: '7px', border: '1px solid #000', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
              {summary.late} دق
            </td>
            <td style={{ padding: '7px', border: '1px solid #000', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
              {summary.ot} س
            </td>
            <td style={{ padding: '7px', border: '1px solid #000', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
              {fmt(summary.adv, 0)} {cur}
            </td>
            <td style={{ padding: '7px', border: '1px solid #000' }}></td>
          </tr>
        </tfoot>
      </table>

      {/* ══ NET SALARY BOX ══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '2.5px solid #111',
        borderRadius: '6px',
        padding: '12px 18px',
        marginBottom: '20px',
        background: '#f9f9f9',
      }}>
        <div>
          <div style={{ fontSize: '9px', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>صافي الراتب المستحق للصرف هذا الشهر</div>
          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>بعد حساب كل الاستحقاقات والخصومات</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace' }}>{fmt(netSalary, 0)}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#555', marginRight: '6px' }}>{cur}</span>
        </div>
      </div>

      {/* ══ SIGNATURES ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        borderTop: '2px solid #ccc',
        paddingTop: '16px',
        textAlign: 'center',
      }}>
        {['توقيع الموظف', 'اعتماد شؤون العاملين', 'اعتماد المدير المالي'].map((label, i) => (
          <div key={i}>
            <div style={{ fontSize: '9px', fontWeight: 900, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '28px' }}>
              {label}
            </div>
            <div style={{ borderBottom: '1.5px dashed #aaa', paddingBottom: '2px', marginBottom: '4px' }} />
            <div style={{ fontSize: '8px', color: '#bbb' }}>الاسم / التاريخ</div>
          </div>
        ))}
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        marginTop: '14px',
        paddingTop: '8px',
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8px',
        color: '#aaa',
      }}>
        <span>طُبع بتاريخ: {printDate}</span>
        <span style={{ fontWeight: 700 }}>ProTex ERP — مستند حضور رسمي معتمد</span>
        <span>{monthNameAr} {year} — {emp.code}</span>
      </div>
    </div>
  )
})

AttendanceReportTemplate.displayName = 'AttendanceReportTemplate'
