import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { History, Calendar, TrendingUp, Download, ChevronDown } from 'lucide-react'
import { usePayrollStore } from '../store/usePayrollStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { fmt, MONTH_NAMES, n } from '../utils/calculations'
import { PageHeader, Card, MetricCard, EmptyState } from '../components/ui'

type RangeFilter = '1' | '6' | '12' | 'custom'

const PayrollHistory: React.FC = () => {
  const { settings } = useSettingsStore()
  const { records, getByRange, getByMonth } = usePayrollStore()
  const cur = settings.currencySymbol || 'ج.م'

  const now = new Date()
  const [range, setRange] = useState<RangeFilter>('1')
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)

  // ── Compute date range ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (range === 'custom' || range === '1') {
      return getByMonth(selYear, selMonth)
    }
    const months = parseInt(range)
    const fromDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    return getByRange(fromDate.getFullYear(), fromDate.getMonth(), now.getFullYear(), now.getMonth())
  }, [range, selYear, selMonth, records])

  // ── Group by period ─────────────────────────────────────────────────────────
  const byPeriod = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalGross = filtered.reduce((s, r) => s + r.grossSalary, 0)
  const totalNet = filtered.reduce((s, r) => s + r.netSalary, 0)
  const totalOT = filtered.reduce((s, r) => s + r.overtimePay, 0)
  const totalDeductions = filtered.reduce((s, r) => s + r.totalDeductions, 0)

  // ── Group by employee for 6/12 month view ───────────────────────────────────
  const byEmployee = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach(r => {
      if (!map.has(r.employeeId)) map.set(r.employeeId, [])
      map.get(r.employeeId)!.push(r)
    })
    return [...map.entries()].sort((a, b) => {
      const nameA = a[1][0]?.employeeName || ''
      const nameB = b[1][0]?.employeeName || ''
      return nameA.localeCompare(nameB)
    })
  }, [filtered])

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['الشهر', 'السنة', 'الكود', 'الاسم', 'المصنع', 'الوظيفة',
      'أيام الحضور', 'ساعات إضافي', 'الإجمالي', 'البدلات', 'أجر إضافي', 'الخصومات', 'الصافي']
    const rows = filtered.map(r => [
      MONTH_NAMES[r.month], r.year, r.employeeCode, r.employeeName, r.factoryName, r.position,
      r.actualAttendanceDays, r.overtimeHours,
      r.grossSalary.toFixed(2), r.totalAllowances.toFixed(2),
      r.overtimePay.toFixed(2), r.totalDeductions.toFixed(2), r.netSalary.toFixed(2)
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `سجل_رواتب_${range === '1' ? MONTH_NAMES[selMonth] + '_' + selYear : range + '_شهر'}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="متابعة الرواتب الشهرية"
        subtitle="سجل تاريخي كامل للرواتب"
        icon={<History size={18} />}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={exportCSV}><Download size={14} /> CSV</button>
          </div>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-white/40 flex items-center gap-1"><Calendar size={12} /> الفترة:</span>
          {([['1', 'شهر واحد'], ['6', '6 أشهر'], ['12', '12 شهر']] as [RangeFilter, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setRange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === v ? 'bg-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >{l}</button>
          ))}

          {range === '1' && (
            <>
              <select
                value={selMonth}
                onChange={e => setSelMonth(+e.target.value)}
                className="input text-xs py-1 px-2 w-auto"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selYear}
                onChange={e => setSelYear(+e.target.value)}
                className="input text-xs py-1 px-2 w-auto"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>
      </Card>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="إجمالي الرواتب" value={`${fmt(totalGross, 0)} ${cur}`} variant="gold" large />
        <MetricCard label="إجمالي الصافي" value={`${fmt(totalNet, 0)} ${cur}`} variant="success" large />
        <MetricCard label="إجمالي الأوفر تايم" value={`${fmt(totalOT, 0)} ${cur}`} variant="navy" />
        <MetricCard label="إجمالي الخصومات" value={`${fmt(totalDeductions, 0)} ${cur}`} variant="default" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History />}
            title="لا توجد سجلات"
            description="احفظ رواتب الموظفين من صفحة شئون الموظفين لتظهر هنا"
          />
        </Card>
      ) : (
        <>
          {/* ── Single month: table view ─────────────────────────────────────── */}
          {range === '1' && (
            <Card padding={false} className="overflow-hidden">
              <div className="px-4 py-3 border-b border-white/8">
                <h3 className="text-sm font-bold text-white">
                  كشف {MONTH_NAMES[selMonth]} {selYear} — {filtered.length} موظف
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الكود</th>
                      <th>الاسم</th>
                      <th>الحضور</th>
                      <th>أوفر تايم</th>
                      <th>الإجمالي</th>
                      <th>الخصومات</th>
                      <th className="text-success">الصافي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td><span className="badge-navy">{r.employeeCode}</span></td>
                        <td className="font-semibold text-white">{r.employeeName}</td>
                        <td className="num text-white/60">{r.actualAttendanceDays}يوم</td>
                        <td className="num text-gold">{r.overtimeHours > 0 ? `${r.overtimeHours}h → +${fmt(r.overtimePay)}` : '—'}</td>
                        <td className="num text-gold">{fmt(r.grossSalary)}</td>
                        <td className="num text-danger">-{fmt(r.totalDeductions)}</td>
                        <td className="num font-bold text-success">{fmt(r.netSalary)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="font-bold text-gold py-3 px-4">الإجمالي</td>
                      <td className="py-3 px-4 num font-bold text-gold">{fmt(totalGross)}</td>
                      <td className="py-3 px-4 num font-bold text-danger">-{fmt(totalDeductions)}</td>
                      <td className="py-3 px-4 num font-bold text-success text-base">{fmt(totalNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ── 6/12 month: grouped by period ───────────────────────────────── */}
          {(range === '6' || range === '12') && (
            <div className="space-y-4">
              {/* By period summary */}
              <Card padding={false} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                  <h3 className="text-sm font-bold text-white">ملخص شهري</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الشهر</th>
                        <th>عدد الموظفين</th>
                        <th>إجمالي الأوفر تايم</th>
                        <th>إجمالي الرواتب</th>
                        <th>إجمالي الخصومات</th>
                        <th className="text-success">إجمالي الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPeriod.map(([key, recs]) => {
                        const [y, m] = key.split('-').map(Number)
                        const pg = recs.reduce((s, r) => s + r.grossSalary, 0)
                        const pn = recs.reduce((s, r) => s + r.netSalary, 0)
                        const pd = recs.reduce((s, r) => s + r.totalDeductions, 0)
                        const pot = recs.reduce((s, r) => s + r.overtimePay, 0)
                        return (
                          <tr key={key}>
                            <td className="font-semibold text-white">{MONTH_NAMES[m]} {y}</td>
                            <td className="num text-white/60">{recs.length}</td>
                            <td className="num text-gold">{pot > 0 ? `+${fmt(pot)}` : '—'}</td>
                            <td className="num text-gold">{fmt(pg)}</td>
                            <td className="num text-danger">-{fmt(pd)}</td>
                            <td className="num font-bold text-success">{fmt(pn)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="font-bold text-gold py-3 px-4">الإجمالي الكلي</td>
                        <td className="py-3 px-4 num font-bold text-gold">{fmt(totalGross)}</td>
                        <td className="py-3 px-4 num font-bold text-danger">-{fmt(totalDeductions)}</td>
                        <td className="py-3 px-4 num font-bold text-success text-base">{fmt(totalNet)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>

              {/* By employee accordion */}
              <div>
                <h3 className="section-title mb-3">تفاصيل كل موظف</h3>
                <div className="space-y-2">
                  {byEmployee.map(([empId, recs]) => {
                    const first = recs[0]
                    const empNet = recs.reduce((s, r) => s + r.netSalary, 0)
                    const empGross = recs.reduce((s, r) => s + r.grossSalary, 0)
                    const empOT = recs.reduce((s, r) => s + r.overtimePay, 0)
                    const isOpen = expandedEmp === empId
                    return (
                      <motion.div key={empId} className="card overflow-hidden">
                        <button
                          className="w-full p-4 flex items-center gap-3 text-right"
                          onClick={() => setExpandedEmp(isOpen ? null : empId)}
                        >
                          <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                            {first.employeeName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm">{first.employeeName}</p>
                            <p className="text-xs text-white/35">{first.employeeCode} · {recs.length} شهر مسجل</p>
                          </div>
                          {empOT > 0 && (
                            <div className="text-left hidden sm:block">
                              <p className="text-[10px] text-white/30">أوفر تايم</p>
                              <p className="num text-xs font-bold text-gold">+{fmt(empOT, 0)}</p>
                            </div>
                          )}
                          <div className="text-left ml-2">
                            <p className="text-[10px] text-white/30">إجمالي الصافي</p>
                            <p className="num text-sm font-bold text-success">{fmt(empNet, 0)} {cur}</p>
                          </div>
                          <ChevronDown size={14} className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-white/8 overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>الشهر</th>
                                  <th>الحضور</th>
                                  <th>أوفر تايم</th>
                                  <th>الإجمالي</th>
                                  <th>الخصومات</th>
                                  <th className="text-success">الصافي</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recs.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month).map(r => (
                                  <tr key={r.id}>
                                    <td className="font-medium text-white/80">{MONTH_NAMES[r.month]} {r.year}</td>
                                    <td className="num text-white/50">{r.actualAttendanceDays}يوم</td>
                                    <td className="num text-gold">{r.overtimeHours > 0 ? `${r.overtimeHours}h → +${fmt(r.overtimePay)}` : '—'}</td>
                                    <td className="num text-gold">{fmt(r.grossSalary)}</td>
                                    <td className="num text-danger">-{fmt(r.totalDeductions)}</td>
                                    <td className="num font-bold text-success">{fmt(r.netSalary)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={3} className="font-bold text-gold py-2 px-4 text-xs">إجمالي ({recs.length} شهر)</td>
                                  <td className="py-2 px-4 num font-bold text-gold text-xs">{fmt(empGross)}</td>
                                  <td className="py-2 px-4 num font-bold text-danger text-xs">-{fmt(recs.reduce((s,r)=>s+r.totalDeductions,0))}</td>
                                  <td className="py-2 px-4 num font-bold text-success">{fmt(empNet)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PayrollHistory
