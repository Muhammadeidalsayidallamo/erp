import React, { useRef, useMemo, useCallback, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, CalendarDays, Users, TrendingUp, Clock, DollarSign, CheckCircle2, Download, RefreshCw, Eye, EyeOff, X, ChevronDown } from 'lucide-react'
import { useEmployeesStore } from '../store/useEmployeesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useWorkforceStore, buildMonthDays, computeWorkerPayroll, type WorkerCalcResult } from '../store/useWorkforceStore'
import { usePayrollStore, buildPayrollRecord } from '../store/usePayrollStore'
import { fmt, MONTH_NAMES } from '../utils/calculations'
import { PageHeader, Card, MetricCard } from '../components/ui'
import WorkforceGrid from '../components/ui/WorkforceGrid'
import { WorkforceReportTemplate } from '../components/ui/WorkforceReportTemplate'
import type { MonthlyPayrollRecord } from '../store/usePayrollStore'

// ── Aggregated Reports Modal ──────────────────────────────────────────────────
const AggregatedReportsModal: React.FC<{
  open: boolean; onClose: () => void
  employees: any[]
}> = ({ open, onClose, employees }) => {
  const records = usePayrollStore(s => s.records)
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'
  
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('Q1')

  const filterRecords = useMemo(() => {
    let fromMonth = 0, toMonth = 11
    if (period === 'Q1') { fromMonth = 0; toMonth = 2 }
    else if (period === 'Q2') { fromMonth = 3; toMonth = 5 }
    else if (period === 'Q3') { fromMonth = 6; toMonth = 8 }
    else if (period === 'Q4') { fromMonth = 9; toMonth = 11 }
    else if (period === 'H1') { fromMonth = 0; toMonth = 5 }
    else if (period === 'H2') { fromMonth = 6; toMonth = 11 }
    
    return records.filter(r => r.year === year && r.month >= fromMonth && r.month <= toMonth)
  }, [records, year, period])

  const aggData = useMemo(() => {
    const map: Record<string, any> = {}
    employees.forEach(e => {
      map[e.id] = { name: e.fullName, present: 0, absent: 0, excused: 0, lateMin: 0, otHours: 0, totalAdvances: 0, netSalary: 0 }
    })
    filterRecords.forEach(r => {
      if (!map[r.employeeId]) return
      const m = map[r.employeeId]
      m.present += r.actualAttendanceDays || 0
      m.absent += r.absentUnexcusedDays || 0
      m.excused += r.absentExcusedDays || 0
      m.lateMin += r.lateMinutes || 0
      m.otHours += r.overtimeHours || 0
      m.totalAdvances += r.currentAdvance || 0
      m.netSalary += r.netSalary || 0
    })
    return Object.values(map)
  }, [filterRecords, employees])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CalendarDays size={15} className="text-emerald-400" />
            </div>
            <h3 className="font-bold text-white text-sm">التقارير المجمعة (ربع سنوي / نصف سنوي / سنوي)</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="bg-[#1a2540] text-white border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="bg-[#1a2540] text-white border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none text-sm">
            <option value="Q1">الربع الأول (يناير - مارس)</option>
            <option value="Q2">الربع الثاني (أبريل - يونيو)</option>
            <option value="Q3">الربع الثالث (يوليو - سبتمبر)</option>
            <option value="Q4">الربع الرابع (أكتوبر - ديسمبر)</option>
            <option value="H1">النصف الأول (يناير - يونيو)</option>
            <option value="H2">النصف الثاني (يوليو - ديسمبر)</option>
            <option value="YEAR">السنة بالكامل</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="sticky top-0 bg-[#060c1a] z-10 shadow-md">
              <tr>
                {['الموظف','إجمالي حضور','غياب','إذن','تأخير(دق)','إضافي(س)','إجمالي السلف','الصافي المنصرف'].map((h,i) => (
                  <th key={i} className="px-3 py-3 font-bold text-white/40 text-[10px] border-l border-white/5 last:border-l-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggData.map((r: any, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-bold text-white border-l border-white/5">{r.name}</td>
                  <td className="px-3 py-2 text-emerald-400 font-bold border-l border-white/5">{r.present}</td>
                  <td className="px-3 py-2 text-rose-400 border-l border-white/5">{r.absent}</td>
                  <td className="px-3 py-2 text-blue-400 border-l border-white/5">{r.excused}</td>
                  <td className="px-3 py-2 text-amber-400 border-l border-white/5">{r.lateMin}</td>
                  <td className="px-3 py-2 text-violet-400 border-l border-white/5">{fmt(r.otHours, 1)}</td>
                  <td className="px-3 py-2 text-rose-400 border-l border-white/5">{fmt(r.totalAdvances, 0)}</td>
                  <td className="px-3 py-2 font-black text-gold text-sm border-l border-white/5">{fmt(r.netSalary, 0)} {cur}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#060c1a] z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
              <tr>
                <td className="px-3 py-3 font-black text-white text-sm border-l border-white/5">الإجمالي</td>
                <td className="px-3 py-3 text-emerald-400 font-bold border-l border-white/5">{aggData.reduce((a,r)=>a+r.present,0)}</td>
                <td className="px-3 py-3 text-rose-400 border-l border-white/5">{aggData.reduce((a,r)=>a+r.absent,0)}</td>
                <td className="px-3 py-3 text-blue-400 border-l border-white/5">{aggData.reduce((a,r)=>a+r.excused,0)}</td>
                <td className="px-3 py-3 text-amber-400 border-l border-white/5">{aggData.reduce((a,r)=>a+r.lateMin,0)}</td>
                <td className="px-3 py-3 text-violet-400 border-l border-white/5">{fmt(aggData.reduce((a,r)=>a+r.otHours,0), 1)}</td>
                <td className="px-3 py-3 text-rose-400 border-l border-white/5">{fmt(aggData.reduce((a,r)=>a+r.totalAdvances,0), 0)}</td>
                <td className="px-3 py-3 font-black text-emerald-400 text-lg border-l border-white/5">{fmt(aggData.reduce((a,r)=>a+r.netSalary,0), 0)} {cur}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}


// ── Print Options Modal ───────────────────────────────────────────────────────
interface PrintOpts { empId: string | null; showSalary: boolean }

const PrintModal: React.FC<{
  open: boolean; onClose: () => void
  employees: { id: string; fullName: string }[]
  opts: PrintOpts; setOpts: (o: PrintOpts) => void
  onPrint: () => void
}> = ({ open, onClose, employees, opts, setOpts, onPrint }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div className="bg-[#0d1626] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Printer size={15} className="text-gold" />
              </div>
              <h3 className="font-bold text-white text-sm">خيارات الطباعة</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Employee selector */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">طباعة</label>
              <div className="relative">
                <select
                  value={opts.empId ?? ''}
                  onChange={e => setOpts({ ...opts, empId: e.target.value || null })}
                  className="w-full bg-[#1a2540] text-white border border-white/10 focus:border-gold rounded-lg px-3 py-2.5 outline-none text-sm appearance-none"
                >
                  <option value="">كل الموظفين</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Salary toggle */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">إظهار الرواتب في الطباعة</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: true,  label: 'ظاهر',  icon: <Eye size={13} />,    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
                  { v: false, label: 'مخفي',  icon: <EyeOff size={13} />, cls: 'border-rose-500/30 bg-rose-500/8 text-rose-400' },
                ].map(o => (
                  <button key={String(o.v)} onClick={() => setOpts({ ...opts, showSalary: o.v })}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all ${opts.showSalary === o.v ? o.cls : 'border-white/10 text-white/30 bg-white/3 hover:border-white/20'}`}>
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
              {!opts.showSalary && (
                <p className="text-[10px] text-rose-400/60 mt-1.5">
                  💡 مناسب للطباعة أمام الموظفين — الأرقام المالية مخفية
                </p>
              )}
            </div>

            {/* Print button */}
            <button onClick={() => { onPrint(); onClose() }}
              className="w-full btn-gold py-2.5 text-sm font-bold flex items-center justify-center gap-2 mt-2">
              <Printer size={15} /> طباعة الآن
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

// ── Main Page ─────────────────────────────────────────────────────────────────
const WorkforceAttendance: React.FC = () => {
  const { employees } = useEmployeesStore()
  const { settings } = useSettingsStore()
  const { getSheet, getEmployeeSheet, setFridayPaid, clearSheet } = useWorkforceStore()
  const { saveMonthlyRecords } = usePayrollStore()

  const cur = settings.currencySymbol || 'ج.م'
  const wph = settings.workHoursPerDay || 8

  const printRef = useRef<HTMLDivElement>(null)
  const now = new Date()

  const [yearMonth, setYearMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [saved, setSaved] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showAggModal, setShowAggModal] = useState(false)
  const [printOpts, setPrintOpts] = useState<PrintOpts>({ empId: null, showSalary: true })

  const [y, m] = useMemo(() => {
    const p = yearMonth.split('-').map(Number)
    return [p[0] || now.getFullYear(), p[1] || now.getMonth() + 1]
  }, [yearMonth])

  const days = useMemo(() => buildMonthDays(y, m), [y, m])
  const workingDays = useMemo(() => days.filter(d => !d.isFri).length, [days])
  const fridayIsPaid = getSheet(yearMonth).fridayIsPaid

  // Reactive calc — depends on sheet data
  const sheet = getSheet(yearMonth)
  const calcResults = useMemo<WorkerCalcResult[]>(() =>
    employees.map(emp => computeWorkerPayroll(emp, getEmployeeSheet(yearMonth, emp.id), days, fridayIsPaid, wph)),
    [employees, yearMonth, days, fridayIsPaid, wph, sheet]
  )

  const employeeSheetsForPrint = useMemo(() => {
    const r: Record<string, any> = {}
    employees.forEach(emp => { r[emp.id] = getEmployeeSheet(yearMonth, emp.id) })
    return r
  }, [employees, yearMonth, sheet])

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `حضور_${printOpts.empId ? employees.find(e => e.id === printOpts.empId)?.fullName : 'كل_الموظفين'}_${yearMonth}`,
  })

  const handleSave = useCallback(() => {
    const recs = employees.map((emp, i) => {
      const r = calcResults[i]
      return {
        id: `${emp.id}-${y}-${m-1}`,
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.fullName,
        factoryName: emp.factoryName || '',
        position: emp.position || '',
        department: emp.department || '',
        year: y,
        month: m - 1,
        
        basePay: r.basePay,
        overtimePay: r.overtimePay,
        totalAllowances: r.fridayPaidBonus + r.fridayPay, // Using allowances to store Friday bonuses
        grossSalary: r.basePay + r.overtimePay + r.fridayPaidBonus + r.fridayPay,
        
        insuranceAmount: 0,
        taxAmount: 0,
        lateDeduction: r.lateDeduction,
        absentDeduction: 0, // Already not paid because basePay = daily * present
        currentAdvance: r.totalAdvances,
        previousInstallments: 0,
        factoryPurchases: 0,
        disciplinaryFines: 0,
        otherDeductions: 0,
        totalDeductions: r.lateDeduction + r.totalAdvances,
        
        netSalary: r.netSalary,
        
        overtimeHours: r.totalOvertimeHours,
        overtimeType: emp.overtimeType,
        overtimeRate: 0, // Handled inside calcResults
        
        workingDaysInMonth: workingDays,
        actualAttendanceDays: r.presentDays,
        absentUnexcusedDays: r.absentDays,
        absentExcusedDays: r.excusedDays,
        lateMinutes: r.totalLateMinutes,
        savedAt: new Date().toISOString()
      }
    })
    saveMonthlyRecords(recs, true)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [employees, calcResults, workingDays, y, m, wph, saveMonthlyRecords])

  const totalNet = calcResults.reduce((a, r) => a + r.netSalary, 0)
  const totalPresent = calcResults.reduce((a, r) => a + r.presentDays, 0)
  const totalLate = calcResults.reduce((a, r) => a + r.totalLateMinutes, 0)
  const totalOT = calcResults.reduce((a, r) => a + r.totalOvertimeHours, 0)
  const totalFriPay = calcResults.reduce((a, r) => a + r.fridayPay, 0)
  const avgAtt = employees.length > 0 ? (totalPresent / (employees.length * workingDays)) * 100 : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="متابعة الحضور والغياب والمستحقات التلقائية"
        subtitle={<span className="flex items-center gap-2"><Users size={13} className="text-gold" /><span>{employees.length} موظف · {workingDays} يوم عمل · {MONTH_NAMES[m-1]} {y}</span></span>}
        icon={<CalendarDays size={20} />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
              className="bg-[#1a2540] text-white border border-white/10 focus:border-gold rounded-lg px-3 py-2 outline-none text-sm" />
            <button onClick={() => { if (!clearing) { setClearing(true); return } clearSheet(yearMonth); setClearing(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${clearing ? 'bg-rose-600 border-rose-500 text-white' : 'border-white/10 text-white/50 hover:border-rose-400/30 hover:text-rose-400'}`}>
              <RefreshCw size={13} />{clearing ? 'تأكيد المسح' : 'مسح'}
            </button>
            
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-400">حفظ تلقائي نشط</span>
            </div>

            <button onClick={() => {
              // It's already auto-saved by zustand, just show UX feedback
              const btn = document.getElementById('fake-save-btn')
              if(btn) {
                btn.innerHTML = '✓ تم الحفظ'
                btn.classList.replace('bg-white/5', 'bg-emerald-600')
                setTimeout(() => {
                  btn.innerHTML = '💾 حفظ التغييرات'
                  btn.classList.replace('bg-emerald-600', 'bg-white/5')
                }, 2000)
              }
            }} id="fake-save-btn"
              className="bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border border-white/10">
              💾 حفظ التغييرات
            </button>

            <button onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
              {saved ? <><CheckCircle2 size={13} />تم الترحيل</> : <><Download size={13} />ترحيل وحفظ للشهر</>}
            </button>
            <button onClick={() => setShowPrintModal(true)} className="btn-gold text-xs">
              <Printer size={14} /> طباعة
            </button>
            <button onClick={() => setShowAggModal(true)} className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all">
              <CalendarDays size={14} /> التقارير المجمعة
            </button>
          </div>
        }
      />

      {/* Controls Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <CalendarDays size={16} className="text-gold" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">سجل الحضور الشامل — {MONTH_NAMES[m-1]} {y}</p>
              <p className="text-[10px] text-white/30">{workingDays} يوم عمل · {days.filter(d=>d.isFri).length} جمعة</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Friday toggle */}
            <div className="flex items-center gap-2 bg-[#0d1626] px-3 py-1.5 rounded-lg border border-white/8">
              <span className="text-[10px] text-white/40">يوم الجمعة:</span>
              <button onClick={() => setFridayPaid(yearMonth, !fridayIsPaid)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${fridayIsPaid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {fridayIsPaid ? '✓ مدفوعة' : '✗ غير مدفوعة'}
              </button>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 text-[9px] text-white/30">
              {[['bg-emerald-500/40','حضر'],['bg-rose-500/40','غائب'],['bg-blue-500/40','إذن'],['bg-amber-500/40','×2 جمعة'],['bg-violet-500/40','إضافي']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-0.5"><span className={`w-2 h-2 rounded-sm ${c} inline-block`}/>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      {employees.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="إجمالي تكلفة الرواتب" value={`${fmt(totalNet, 0)} ${cur}`} icon={<DollarSign size={17} className="text-gold"/>} iconBg="bg-gold/10" variant="gold"/>
          <MetricCard label="نسبة الحضور" value={`${Math.round(avgAtt)}%`} subValue={`${totalPresent} يوم إجمالي`} icon={<CheckCircle2 size={17} className="text-emerald-400"/>} iconBg="bg-emerald-500/10" variant={avgAtt>=85?'success':'default'}/>
          <MetricCard label="إجمالي التأخير" value={`${totalLate} دقيقة`} subValue={`≈ ${Math.round(totalLate/60)} ساعة`} icon={<Clock size={17} className="text-amber-400"/>} iconBg="bg-amber-500/10"/>
          <MetricCard label="إجمالي الإضافي" value={`${fmt(totalOT,1)} ساعة`} icon={<TrendingUp size={17} className="text-violet-400"/>} iconBg="bg-violet-500/10"/>
          <MetricCard label="مكافأة جمع العمل" value={`${fmt(totalFriPay,0)} ${cur}`} subValue="بضعف الأجر" icon={<span className="text-amber-400 text-base">⚡</span>} iconBg="bg-amber-500/10"/>
        </div>
      )}

      {/* Grid */}
      {employees.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <WorkforceGrid yearMonth={yearMonth} employees={employees} days={days} calcResults={calcResults} fridayIsPaid={fridayIsPaid} currencySymbol={cur} showSalary />
        </motion.div>
      ) : (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-3">👷</div>
          <p className="text-white/40 font-semibold">لا يوجد موظفون بعد</p>
          <p className="text-white/20 text-xs mt-1">أضف موظفين من <a href="/employees" className="text-gold hover:underline">شاشة شؤون الموظفين</a></p>
        </div>
      )}

      {/* Per-employee summary table */}
      {calcResults.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }}>
          <Card padding={false} className="overflow-hidden border border-white/8">
            <div className="flex items-center gap-2 p-4 border-b border-white/8">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center"><TrendingUp size={14} className="text-gold"/></div>
              <div><p className="font-bold text-white text-sm">ملخص مستحقات نهاية الشهر</p><p className="text-[10px] text-white/30">الحساب التفصيلي لكل موظف</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0d1626] border-b border-white/8">
                    {['الموظف','اليومية','حضور','غياب','إذن','جمع×2','تأخير(دق)','إضافي(س)','الأساسي','إضافي','خصم تأخير','سلف','الصافي'].map((h,i) => (
                      <th key={i} className="px-2 py-2.5 font-bold text-white/40 text-[9px] border-l border-white/5 last:border-l-0 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calcResults.map((r, idx) => (
                    <motion.tr key={r.employeeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-2 font-bold text-white border-l border-white/5">{r.employeeName}</td>
                      <td className="px-2 py-2 text-center text-white/50 border-l border-white/5">{fmt(r.dailyRate,0)}</td>
                      <td className="px-2 py-2 text-center font-bold text-emerald-400 border-l border-white/5">{r.presentDays}</td>
                      <td className="px-2 py-2 text-center text-rose-400 border-l border-white/5">{r.absentDays}</td>
                      <td className="px-2 py-2 text-center text-blue-400 border-l border-white/5">{r.excusedDays}</td>
                      <td className="px-2 py-2 text-center text-amber-400 font-bold border-l border-white/5">{r.fridayWorkedDays || '—'}</td>
                      <td className="px-2 py-2 text-center text-amber-400 border-l border-white/5">{r.totalLateMinutes || '—'}</td>
                      <td className="px-2 py-2 text-center text-violet-400 border-l border-white/5">{r.totalOvertimeHours ? fmt(r.totalOvertimeHours,1) : '—'}</td>
                      <td className="px-2 py-2 text-center text-white/60 border-l border-white/5">{fmt(r.basePay + r.fridayPay + r.fridayPaidBonus,0)}</td>
                      <td className="px-2 py-2 text-center text-violet-400 border-l border-white/5">{r.overtimePay ? fmt(r.overtimePay,0) : '—'}</td>
                      <td className="px-2 py-2 text-center text-rose-400 border-l border-white/5">{r.lateDeduction > 0 ? `-${fmt(r.lateDeduction,0)}` : '—'}</td>
                      <td className="px-2 py-2 text-center text-rose-400 border-l border-white/5">{r.totalAdvances > 0 ? `-${fmt(r.totalAdvances,0)}` : '—'}</td>
                      <td className="px-2 py-2 text-center font-black text-gold text-sm">{fmt(r.netSalary,0)}</td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#0d1626] border-t border-gold/20">
                    <td className="px-2 py-3 font-black text-gold text-sm border-l border-white/5" colSpan={2}>الإجمالي الكلي</td>
                    <td className="px-2 py-3 text-center text-emerald-400 font-bold border-l border-white/5">{calcResults.reduce((a,r)=>a+r.presentDays,0)}</td>
                    <td className="px-2 py-3 text-center text-rose-400 border-l border-white/5">{calcResults.reduce((a,r)=>a+r.absentDays,0)}</td>
                    <td className="px-2 py-3 text-center text-blue-400 border-l border-white/5">{calcResults.reduce((a,r)=>a+r.excusedDays,0)}</td>
                    <td className="px-2 py-3 text-center text-amber-400 font-bold border-l border-white/5">{calcResults.reduce((a,r)=>a+r.fridayWorkedDays,0)}</td>
                    <td className="px-2 py-3 text-center text-amber-400 border-l border-white/5">{calcResults.reduce((a,r)=>a+r.totalLateMinutes,0)}</td>
                    <td className="px-2 py-3 text-center text-violet-400 border-l border-white/5">{fmt(calcResults.reduce((a,r)=>a+r.totalOvertimeHours,0),1)}</td>
                    <td className="px-2 py-3 text-center text-white/60 border-l border-white/5">{fmt(calcResults.reduce((a,r)=>a+r.basePay+r.fridayPay+r.fridayPaidBonus,0),0)}</td>
                    <td className="px-2 py-3 text-center text-violet-400 border-l border-white/5">{fmt(calcResults.reduce((a,r)=>a+r.overtimePay,0),0)}</td>
                    <td className="px-2 py-3 text-center text-rose-400 border-l border-white/5">-{fmt(calcResults.reduce((a,r)=>a+r.lateDeduction,0),0)}</td>
                    <td className="px-2 py-3 text-center text-rose-400 border-l border-white/5">-{fmt(calcResults.reduce((a,r)=>a+r.totalAdvances,0),0)}</td>
                    <td className="px-2 py-3 text-center font-black text-gold text-lg">{fmt(totalNet,0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Info */}
      <div className="card p-4 border border-blue-500/15 bg-blue-500/5 text-xs text-white/40 space-y-1">
        <p>💡 <b className="text-white/60">الحالة:</b> استخدم الأزرار (حضر / غائب / إذن / —) لتحديد الحالة</p>
        <p>⚡ <b className="text-white/60">جمعة العمل:</b> اضغط "+ عمل في الجمعة" لتسجيل عمل يوم الراحة — يُحسب بضعف اليومية (×2) تلقائياً</p>
        <p>🕐 <b className="text-white/60">الوحدات:</b> اضغط على "دق/س" بجانب التأخير أو الإضافي للتبديل بين الدقائق والساعات</p>
        <p>🖨️ <b className="text-white/60">الطباعة:</b> يمكنك طباعة موظف محدد أو الكل — مع إمكانية إخفاء الرواتب للمتابعة فقط</p>
      </div>

      {/* Print modal */}
      <PrintModal open={showPrintModal} onClose={() => setShowPrintModal(false)}
        employees={employees} opts={printOpts} setOpts={setPrintOpts} onPrint={() => handlePrint()} />

      {/* Aggregated Reports Modal */}
      <AggregatedReportsModal open={showAggModal} onClose={() => setShowAggModal(false)} employees={employees} />

      {/* Hidden print template */}
      <div className="absolute overflow-hidden h-0 w-0 opacity-0 pointer-events-none">
        <WorkforceReportTemplate ref={printRef}
          yearMonth={yearMonth} employees={employees} days={days}
          calcResults={calcResults} employeeSheets={employeeSheetsForPrint}
          fridayIsPaid={fridayIsPaid} factoryName={settings.companyName}
          currencySymbol={cur} showSalary={printOpts.showSalary}
          filterEmployeeId={printOpts.empId} />
      </div>
    </div>
  )
}

export default WorkforceAttendance
