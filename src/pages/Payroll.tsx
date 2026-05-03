import React, { useRef, useState, useMemo } from 'react'
import { useReactToPrint } from 'react-to-print'
import { motion } from 'framer-motion'
import { CreditCard, Printer, Download, Save, History, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEmployeesStore } from '../store/useEmployeesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { usePayrollStore, buildPayrollRecord } from '../store/usePayrollStore'
import { useWorkforceStore, calculateAttendanceSummary } from '../store/useWorkforceStore'
import { fmt, MONTH_NAMES, n } from '../utils/calculations'
import { PageHeader, MetricCard, EmptyState, Card, ResultRow, Divider, Badge, Toast } from '../components/ui'

const Payroll: React.FC = () => {
  const { settings } = useSettingsStore()
  const { employees } = useEmployeesStore()
  const { saveMonthlyRecords, savedMonths, markMonthAsSaved, records } = usePayrollStore()
  const { getSheet } = useWorkforceStore()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })
  const cur = settings.currencySymbol || 'ج.م'
  const workHours = settings.workHoursPerDay || 8
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [filter, setFilter] = useState<'all' | 'saved' | 'unsaved'>('all')
  const [syncAttendance, setSyncAttendance] = useState(false)

  const now = new Date()
  const mIndex = now.getMonth()
  const year = now.getFullYear()
  const monthLabel = MONTH_NAMES[mIndex]
  const currentMonthKey = `${year}-${String(mIndex + 1).padStart(2, '0')}`
  
  const isMonthSaved = savedMonths.includes(currentMonthKey)
  
  const savedRecordsThisMonth = records.filter(r => r.year === year && r.month === mIndex)

  // Build current payroll records dynamically
  const previewRecords = useMemo(() => {
    return employees.map(e => {
      const summary = syncAttendance ? calculateAttendanceSummary(e.id, mIndex + 1, year, getSheet) : undefined;
      return buildPayrollRecord(e, year, mIndex, workHours, summary);
    })
  }, [employees, year, mIndex, workHours, syncAttendance, getSheet])

  const handleSaveToHistory = () => {
    if (isMonthSaved) {
      setToast({ msg: `⚠️ تم حفظ رواتب ${monthLabel} ${year} مسبقاً ولا يمكن تكرار القيد`, type: 'error' })
      return
    }
    saveMonthlyRecords(previewRecords, true) // true = auto-post to treasury
    markMonthAsSaved(currentMonthKey)
    setToast({ msg: `✓ تم حفظ رواتب ${monthLabel} ${year} وتسجيلها في الخزينة`, type: 'success' })
  }

  const exportCSV = () => {
    const headers = ['الكود', 'الاسم', 'المصنع', 'الوظيفة', 'أيام الحضور', 'أوفر تايم', 'الإجمالي', 'البدلات', 'الخصومات', 'التأمينات', 'الصافي']
    const rows = previewRecords.map(r => [
      r.employeeCode, r.employeeName, r.factoryName, r.position,
      r.actualAttendanceDays,
      `${r.overtimeHours}h`,
      (r.grossSalary || 0).toFixed(2),
      (r.totalAllowances || 0).toFixed(2),
      (r.totalDeductions || 0).toFixed(2),
      (r.insuranceAmount || 0).toFixed(2),
      (r.netSalary || 0).toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `كشف_رواتب_${monthLabel}_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRecords = previewRecords.filter(r => {
    const isSaved = savedRecordsThisMonth.some(saved => saved.employeeId === r.employeeId)
    if (filter === 'saved') return isSaved
    if (filter === 'unsaved') return !isSaved
    return true
  })

  if (employees.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="كشوف الرواتب" subtitle="حاسبة الرواتب الشاملة" icon={<CreditCard size={18} />} />
        <Card><EmptyState icon={<CreditCard />} title="لا يوجد موظفون"
          description="أضف موظفين من صفحة شئون الموظفين لتظهر هنا كشوف الرواتب" /></Card>
      </div>
    )
  }

  const totalGross = previewRecords.reduce((s, r) => s + (r.grossSalary || 0), 0)
  const totalNet = previewRecords.reduce((s, r) => s + (r.netSalary || 0), 0)
  const totalOT = previewRecords.reduce((s, r) => s + (r.overtimePay || 0), 0)
  const totalInsurance = previewRecords.reduce((s, r) => s + (r.insuranceAmount || 0), 0)
  const totalDeductions = previewRecords.reduce((s, r) => s + (r.totalDeductions || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="كشوف الرواتب"
        subtitle={
          <div className="flex items-center gap-2">
            <span>{monthLabel} {year} — {employees.length} موظف</span>
            {isMonthSaved ? (
              <Badge variant="success">تم الحفظ ✓</Badge>
            ) : (
              <Badge variant="danger">غير محفوظ</Badge>
            )}
          </div>
        }
        icon={<CreditCard size={18} />}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button className={`btn-ghost ${syncAttendance ? 'text-gold' : ''}`} onClick={() => setSyncAttendance(!syncAttendance)}>
              <RefreshCcw size={14} className={syncAttendance ? 'animate-spin-slow' : ''} /> 
              {syncAttendance ? 'إلغاء التحديث' : 'تحديث من سجل الحضور'}
            </button>
            <button className="btn-ghost" onClick={() => navigate('/payroll-history')}>
              <History size={14} /> سجل الرواتب
            </button>
            <button className="btn-ghost" onClick={exportCSV}><Download size={14} /> CSV</button>
            <button 
              className={`btn-ghost ${isMonthSaved ? 'opacity-50 cursor-not-allowed' : ''}`} 
              onClick={handleSaveToHistory}
              title={isMonthSaved ? 'تم حفظ هذا الشهر مسبقاً' : 'حفظ في السجل'}
              disabled={isMonthSaved}
            >
              <Save size={14} /> حفظ في السجل
            </button>
            <button className="btn-gold" onClick={handlePrint}><Printer size={14} /> طباعة</button>
          </div>
        }
      />

      {/* Filter Toggle */}
      <div className="flex gap-2 mb-2 no-print">
        <button 
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-gold text-navy shadow-lg shadow-gold/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          onClick={() => setFilter('all')}
        >الكل</button>
        <button 
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'saved' ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          onClick={() => setFilter('saved')}
        >محفوظ</button>
        <button 
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'unsaved' ? 'bg-danger text-white shadow-lg shadow-danger/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          onClick={() => setFilter('unsaved')}
        >غير محفوظ</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="إجمالي الرواتب" value={`${fmt(totalGross, 0)} ${cur}`} variant="gold" large />
        <MetricCard label="إجمالي الصافي" value={`${fmt(totalNet, 0)} ${cur}`} variant="success" large />
        <MetricCard label="أجر الأوفر تايم" value={`${fmt(totalOT, 0)} ${cur}`} variant="navy" />
        <MetricCard label="إجمالي التأمينات" value={`${fmt(totalInsurance, 0)} ${cur}`} variant="navy" />
        <MetricCard label="إجمالي الخصومات" value={`${fmt(totalDeductions, 0)} ${cur}`} variant="default" />
      </div>

      {/* Table */}
      <div ref={printRef} dir="rtl">
        {/* Print Header */}
        <div className="print-only mb-6">
          <div className="text-center border-b-2 border-blue-900 pb-4 mb-5">
            <h1 className="text-2xl font-bold text-blue-900">{settings.companyName}</h1>
            <h2 className="text-base text-gray-600">كشف مرتبات شهر {monthLabel} {year}</h2>
            {settings.companyAddress && <p className="text-sm text-gray-500">{settings.companyAddress}</p>}
          </div>
        </div>

        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>المصنع</th>
                  <th>الوظيفة</th>
                  <th>الحضور</th>
                  <th>الإجمالي</th>
                  <th>أوفر تايم</th>
                  <th>البدلات</th>
                  <th>الخصومات</th>
                  <th className="text-success">الصافي</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge-navy">{r.employeeCode}</span></td>
                    <td className="font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {r.employeeName}
                        {savedRecordsThisMonth.some(saved => saved.employeeId === r.employeeId) && <Badge variant="success" className="text-[8px] px-1 py-0">تم</Badge>}
                      </div>
                    </td>
                    <td className="text-white/40">{r.factoryName || '—'}</td>
                    <td className="text-white/40">{r.position || '—'}</td>
                    <td className="num text-white/60">{r.actualAttendanceDays}يوم</td>
                    <td className="num text-gold">{fmt(r.grossSalary || 0)}</td>
                    <td className="num text-gold">{(r.overtimePay || 0) > 0 ? `+${fmt(r.overtimePay || 0)}` : '—'}</td>
                    <td className="num text-success">+{fmt(r.totalAllowances || 0)}</td>
                    <td className="num text-danger">-{fmt(r.totalDeductions || 0)}</td>
                    <td className="num font-bold text-success">{fmt(r.netSalary || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="font-bold text-gold py-3 px-4">الإجمالي</td>
                  <td className="py-3 px-4 num font-bold text-gold">{fmt(totalGross)}</td>
                  <td className="py-3 px-4 num font-bold text-gold">+{fmt(totalOT)}</td>
                  <td className="py-3 px-4 num font-bold text-success">+{fmt(previewRecords.reduce((s,r)=>s+(r.totalAllowances||0),0))}</td>
                  <td className="py-3 px-4 num font-bold text-danger">-{fmt(totalDeductions)}</td>
                  <td className="py-3 px-4 num font-bold text-success text-base">{fmt(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Print Footer */}
        <div className="print-only mt-8 flex justify-between text-xs text-gray-400 border-t border-gray-200 pt-3">
          <span>اعتمد: المدير العام ______________</span>
          <span>التاريخ: {now.toLocaleDateString('ar-EG')}</span>
          <span>المحاسب: ______________</span>
        </div>
      </div>

      {/* Individual Pay Slips */}
      <div>
        <h3 className="section-title mb-4">كشوف الراتب الفردية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {previewRecords.map(r => (
            <PaySlip key={r.id} record={r} company={settings.companyName} cur={cur} month={monthLabel} year={year} />
          ))}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// Individual Pay Slip
const PaySlip: React.FC<{ record: import('../store/usePayrollStore').MonthlyPayrollRecord; company: string; cur: string; month: string; year: number }> = ({ record, company, cur, month, year }) => {
  const slipRef = useRef<HTMLDivElement>(null)
  const print = useReactToPrint({ contentRef: slipRef })

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
            {record.employeeName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{record.employeeName}</p>
            <p className="text-[10px] text-white/35">{record.employeeCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-[10px] text-white/30">صافي</p>
            <p className="num text-sm font-bold text-success">{fmt(record.netSalary || 0)} {cur}</p>
          </div>
          <button className="btn-icon-ghost" onClick={print}><Printer size={14} /></button>
        </div>
      </div>

      <div ref={slipRef} className="print-only p-8">
        <div style={{ border: '2px solid #0f3460', borderRadius: 8, padding: 20, maxWidth: 480, margin: '0 auto' }}>
          <div className="text-center border-b border-blue-900 pb-3 mb-4">
            <h2 className="text-lg font-bold text-blue-900">{company || 'الشركة'}</h2>
            <p className="text-sm text-gray-500">كشف راتب شهر {month} {year}</p>
          </div>
          <table className="w-full text-sm mb-4">
            <tbody>
              <tr><td className="text-gray-500 pb-1">الاسم:</td><td className="font-bold">{record.employeeName}</td></tr>
              <tr><td className="text-gray-500 pb-1">الكود:</td><td>{record.employeeCode}</td></tr>
              <tr><td className="text-gray-500 pb-1">الوظيفة:</td><td>{record.position}</td></tr>
              <tr><td className="text-gray-500 pb-1">أيام الحضور:</td><td>{record.actualAttendanceDays} يوم</td></tr>
            </tbody>
          </table>
          <table className="w-full border-collapse text-sm print-table">
            <thead><tr className="bg-blue-900 text-white"><th className="p-2 text-right border border-gray-200">البند</th><th className="p-2 text-right border border-gray-200">القيمة</th></tr></thead>
            <tbody>
              {[
                ['الراتب الأساسي (أيام الحضور)', `${fmt(record.basePay)} ${cur}`],
                ...(record.overtimePay > 0 ? [['أجر الأوفر تايم', `+${fmt(record.overtimePay || 0)} ${cur}`]] : []),
                ['البدلات والمكافآت', `+${fmt(record.totalAllowances || 0)} ${cur}`],
                ['الراتب الإجمالي', `${fmt(record.grossSalary || 0)} ${cur}`],
                ['التأمينات الاجتماعية', `-${fmt(record.insuranceAmount || 0)} ${cur}`],
                ['ضريبة الدخل', `-${fmt(record.taxAmount || 0)} ${cur}`],
                ['إجمالي الخصومات', `-${fmt(record.totalDeductions || 0)} ${cur}`],
                ['✅ صافي الراتب المستحق', `${fmt(record.netSalary || 0)} ${cur}`],
              ].map(([l, v], i, arr) => (
                <tr key={i} className={i === arr.length - 1 ? 'bg-blue-50 font-bold' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-2 border border-gray-200">{l}</td>
                  <td className="p-2 border border-gray-200 font-bold text-blue-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-between text-xs text-gray-400 border-t border-gray-200 pt-3">
            <span>توقيع الموظف: __________</span>
            <span>المحاسب: __________</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payroll
