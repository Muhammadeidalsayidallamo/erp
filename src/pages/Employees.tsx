import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { Users, Save, Plus, Trash2, Edit3, UserCheck, Printer, Download, UserPlus } from 'lucide-react'
import { useEmployeesStore, type Employee } from '../store/useEmployeesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { usePayrollStore, buildPayrollRecord } from '../store/usePayrollStore'
import { calcSalary, fmt, uid, today, n } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import {
  Input, Select, Grid, FormSection, ResultRow,
  PageHeader, Toast, EmptyState, Modal, Card, Badge, MetricCard, Divider, PayslipTemplate
} from '../components/ui'

const positions = [
  { value: 'tailor', label: 'خياط' }, { value: 'printer', label: 'طابع' },
  { value: 'assistant', label: 'مساعد' }, { value: 'supervisor', label: 'مشرف' },
  { value: 'accountant', label: 'محاسب' }, { value: 'qc', label: 'مراقب جودة' },
  { value: 'driver', label: 'سائق' }, { value: 'cutter', label: 'قصاص' },
  { value: 'admin', label: 'إداري' }, { value: 'other', label: 'أخرى' },
]

const contracts = [
  { value: 'daily', label: 'يومي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'piece', label: 'بالقطعة' },
]

const overtimeTypes = [
  { value: '1x', label: 'ساعة بساعة (×1)' },
  { value: '1.5x', label: 'ساعة ونص (×1.5)' },
  { value: '2x', label: 'مضاعف (×2)' },
  { value: 'fixed', label: 'مبلغ ثابت للساعة' },
]

const makeEmp = (code: string): Employee => ({
  id: uid(), code, fullName: '', factoryName: '', position: '', department: '',
  hireDate: today(), contractType: 'daily', baseSalary: 0,
  workingDaysInMonth: 26, actualAttendanceDays: 26, absentUnexcusedDays: 0,
  absentExcusedDays: 0, lateMinutes: 0,
  overtimeHours: 0, overtimeType: '1.5x', overtimeFixedRate: 0,
  transportAllowance: 0, mealAllowance: 0, housingAllowance: 0,
  performanceBonus: 0, annualBonus: 0, incentive: 0, commissionPercent: 0,
  insuranceRate: 11, incomeTaxRate: 0,
  currentAdvance: 0, previousInstallments: 0, factoryPurchases: 0,
  disciplinaryFines: 0, otherDeductions: 0,
  grossSalary: 0, netSalary: 0, totalAllowances: 0, totalDeductions: 0,
  insuranceAmount: 0, taxAmount: 0, overtimePay: 0, avatar: ''
})

// ─── compute salary inline & return merged Employee ───────────────────────────
function computeFullSalary(emp: Employee, workHoursPerDay: number): Employee {
  const computed = calcSalary(emp, workHoursPerDay)
  return { ...emp, ...computed } as Employee
}

// ─── Overtime label helper ────────────────────────────────────────────────────
function overtimeLabel(type: string): string {
  return overtimeTypes.find(t => t.value === type)?.label ?? type
}

const Employees: React.FC = () => {
  const { settings } = useSettingsStore()
  const { employees, saveEmployee, deleteEmployee, nextCode } = useEmployeesStore()
  const { saveMonthlyRecords } = usePayrollStore()

  const [emp, setEmp] = useState<Employee>(() => makeEmp(nextCode()))
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewEmp, setViewEmp] = useState<Employee | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const cur = settings.currencySymbol || 'ج.م'
  const workHours = settings.workHoursPerDay || 8

  // ── Live calculated result (recomputed on every emp change) ─────────────────
  const computed = computeFullSalary(emp, workHours)

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payslip_${viewEmp?.fullName || 'Emp'}`,
  })

  const set = (f: keyof Employee, v: string | number) =>
    setEmp(p => ({ ...p, [f]: v }))

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = ev => set('avatar', ev.target?.result as string)
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const handleNew = () => {
    setEmp(makeEmp(nextCode()))
    setEditId(null)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleEdit = (e: Employee) => {
    setEmp(e)
    setEditId(e.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  const handleSave = () => {
    if (!emp.fullName.trim()) {
      setToast({ msg: 'يرجى إدخال اسم الموظف', type: 'error' })
      return
    }
    // Merge computed values before saving
    const final = computeFullSalary(emp, workHours)
    saveEmployee(final)

    // Also save to payroll history for the current month
    const now = new Date()
    const rec = buildPayrollRecord(final, now.getFullYear(), now.getMonth(), workHours)
    saveMonthlyRecords([rec])

    setToast({ msg: 'تم حفظ الموظف وتسجيل الراتب ✓', type: 'success' })
    setView('list')
    setEditId(null)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteEmployee(deleteId)
      setDeleteId(null)
      setToast({ msg: 'تم الحذف', type: 'error' })
    }
  }

  const handleExportExcel = () => {
    const data = employees.map(e => ({
      'كود الموظف': e.code,
      'اسم الموظف': e.fullName,
      'القسم / المصنع': e.department || e.factoryName || '—',
      'الوظيفة': positions.find(p => p.value === e.position)?.label || e.position || '—',
      'تاريخ التعيين': e.hireDate || '—',
      'نوع العقد': contracts.find(c => c.value === e.contractType)?.label || e.contractType,
      'الراتب الأساسي': e.baseSalary,
      'أيام الحضور الفعلية': e.actualAttendanceDays,
      'ساعات الإضافي': e.overtimeHours,
      'إجمالي الراتب (Gross)': e.grossSalary,
      'إجمالي البدلات': e.totalAllowances,
      'إجمالي الخصومات': e.totalDeductions,
      'التأمينات': e.insuranceAmount,
      'صافي الراتب المستحق': e.netSalary,
      'العملة': cur
    }))
    exportToExcel(data, `ProTex_Employees_Report_${new Date().toISOString().split('T')[0]}`)
  }

  const totGross = employees.reduce((s, e) => s + (e.grossSalary || 0), 0)
  const totNet = employees.reduce((s, e) => s + (e.netSalary || 0), 0)

  // Show results section once we have a non-zero base salary
  const hasResults = n(emp.baseSalary) > 0 || n(emp.actualAttendanceDays) > 0

  // Hourly rate display
  const hourlyRate = workHours > 0 ? n(emp.baseSalary) / workHours : 0

  // Overtime rate display
  let displayOvertimeRate = hourlyRate
  if (emp.overtimeType === '1.5x') displayOvertimeRate = hourlyRate * 1.5
  else if (emp.overtimeType === '2x') displayOvertimeRate = hourlyRate * 2
  else if (emp.overtimeType === 'fixed') displayOvertimeRate = n(emp.overtimeFixedRate)

  return (
    <div className="space-y-5">
      <PageHeader
        title="شئون الموظفين"
        subtitle={`${employees.length} موظف مسجل`}
        icon={<Users size={18} />}
        actions={
          <div className="flex gap-2">
            {view === 'form' && <button className="btn-ghost" onClick={() => setView('list')}>القائمة</button>}
            {view === 'list' && employees.length > 0 && (
              <button className="btn-ghost hidden md:flex" onClick={handleExportExcel}>
                <Download size={14} /> Excel
              </button>
            )}
            {view === 'list' && (
              <button className="btn-gold" onClick={handleNew}>
                <UserPlus size={14} /> إضافة موظف
              </button>
            )}
          </div>
        }
      />

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {employees.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="عدد الموظفين" value={String(employees.length)} variant="navy" />
              <MetricCard label="إجمالي الرواتب" value={`${fmt(totGross, 0)} ${cur}`} variant="gold" />
              <MetricCard label="إجمالي الصافي" value={`${fmt(totNet, 0)} ${cur}`} variant="success" />
            </div>
          )}
          <div className="space-y-3">
            {employees.length === 0 ? (
              <Card><EmptyState icon={<Users />} title="لا يوجد موظفون"
                description="اضغط 'موظف جديد' لإضافة أول موظف"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={14} /> موظف جديد</button>} /></Card>
            ) : (
              employees.map(e => (
                <motion.div key={e.id} className="card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center font-bold text-gold text-sm flex-shrink-0 overflow-hidden">
                      {e.avatar ? <img src={e.avatar} className="w-full h-full object-cover" /> : e.fullName.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{e.fullName}</span>
                        <Badge variant="navy">{e.code}</Badge>
                        <Badge variant={e.contractType === 'daily' ? 'gold' : e.contractType === 'monthly' ? 'success' : 'muted'}>
                          {contracts.find(c => c.value === e.contractType)?.label}
                        </Badge>
                        {e.overtimeHours > 0 && (
                          <Badge variant="gold">OT: {e.overtimeHours}h × {overtimeLabel(e.overtimeType)}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/35 mt-0.5">
                        {positions.find(p => p.value === e.position)?.label || e.position || '—'}
                        {e.factoryName && ` · ${e.factoryName}`}
                      </p>
                    </div>
                    <div className="hidden sm:block text-left ml-3">
                      <p className="text-[10px] text-white/30">صافي الراتب</p>
                      <p className="num text-sm font-bold text-success">{fmt(e.netSalary || 0)} {cur}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-icon-ghost" onClick={() => setViewEmp(e)}><UserCheck size={14} /></button>
                      <button className="btn-icon-gold" onClick={() => handleEdit(e)}><Edit3 size={14} /></button>
                      <button className="btn-icon-danger" onClick={() => setDeleteId(e.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── FORM VIEW ─────────────────────────────────────────────────────── */}
      {view === 'form' && (
        <div className="space-y-4">
          {/* Personal */}
          <FormSection title="البيانات الشخصية" icon={<Users size={14} />} collapsible={false}>
            <div className="flex flex-col md:flex-row gap-6 mb-6 items-center md:items-start border-b border-white/5 pb-6">
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group shrink-0">
                {emp.avatar ? (
                  <img src={emp.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="text-center text-white/30">
                    <UserPlus size={24} className="mx-auto mb-1 opacity-50" />
                    <span className="text-[9px]">صورة الموظف</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
                {emp.avatar && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-xs text-white">تغيير</span>
                  </div>
                )}
              </div>
              <div className="flex-1 w-full">
                <Grid cols={2}>
                  <Input label="كود الموظف" value={emp.code} readOnly />
                  <Input label="الاسم الكامل" value={emp.fullName} onChange={e => set('fullName', e.target.value)} placeholder="الاسم الرباعي" />
                </Grid>
              </div>
            </div>
            <Grid cols={2}>
              <Input label="اسم المصنع / الجهة" value={emp.factoryName} onChange={e => set('factoryName', e.target.value)} placeholder="يظهر في كشف الراتب" />
              <Select label="الوظيفة" options={positions} value={emp.position} onChange={e => set('position', e.target.value)} />
              <Input label="القسم" value={emp.department} onChange={e => set('department', e.target.value)} placeholder="مثال: قسم الإنتاج" />
              <Input label="تاريخ التعيين" type="date" value={emp.hireDate} onChange={e => set('hireDate', e.target.value)} />
              <Select label="نوع العقد" options={contracts} value={emp.contractType} onChange={e => set('contractType', e.target.value)} />
              <Input label="اليومية / الراتب الأساسي" type="number" value={emp.baseSalary || ''} onChange={e => set('baseSalary', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          {/* Attendance */}
          <FormSection title="الحضور والغياب" icon={<span>📅</span>}>
            <Grid cols={2}>
              <Input label="أيام الشهر الفعلية" type="number" value={emp.workingDaysInMonth || ''} onChange={e => set('workingDaysInMonth', +e.target.value)} suffix="يوم" placeholder="26" />
              <Input label="أيام الحضور الفعلي" type="number" value={emp.actualAttendanceDays || ''} onChange={e => set('actualAttendanceDays', +e.target.value)} suffix="يوم" placeholder="0" />
              <Input label="الغياب بدون إذن" type="number" value={emp.absentUnexcusedDays || ''} onChange={e => set('absentUnexcusedDays', +e.target.value)} suffix="يوم" placeholder="0" hint="يُخصم ضعف اليومية" />
              <Input label="الغياب بإذن مدفوع" type="number" value={emp.absentExcusedDays || ''} onChange={e => set('absentExcusedDays', +e.target.value)} suffix="يوم" placeholder="0" />
              <Input label="دقائق التأخير" type="number" value={emp.lateMinutes || ''} onChange={e => set('lateMinutes', +e.target.value)} suffix="دقيقة" placeholder="0" />
            </Grid>
          </FormSection>

          {/* Overtime */}
          <FormSection title="الأوفر تايم — العمل الإضافي" icon={<span>⏰</span>}>
            <Grid cols={2}>
              <Select label="طريقة احتساب الأوفر تايم" options={overtimeTypes} value={emp.overtimeType} onChange={e => set('overtimeType', e.target.value)} />
              {emp.overtimeType === 'fixed' && (
                <Input label="مبلغ ثابت للساعة" type="number" value={emp.overtimeFixedRate || ''} onChange={e => set('overtimeFixedRate', +e.target.value)} suffix={cur} placeholder="0" />
              )}
              <Input label="عدد ساعات الأوفر تايم" type="number" value={emp.overtimeHours || ''} onChange={e => set('overtimeHours', +e.target.value)} suffix="ساعة" placeholder="0" />

              {/* Live overtime preview */}
              {n(emp.baseSalary) > 0 && (
                <div className="card p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/35">أجر الساعة العادي:</span>
                    <span className="num text-xs font-bold text-white/60">{fmt(hourlyRate)} {cur}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/35">سعر ساعة الأوفر تايم:</span>
                    <span className="num text-sm font-bold text-gold">{fmt(displayOvertimeRate)} {cur}</span>
                  </div>
                  {n(emp.overtimeHours) > 0 && (
                    <div className="flex items-center justify-between border-t border-white/8 pt-1">
                      <span className="text-xs text-white/35">إجمالي أجر الأوفر ({emp.overtimeHours}h):</span>
                      <span className="num text-sm font-bold text-success">{fmt(computed.overtimePay || 0)} {cur}</span>
                    </div>
                  )}
                </div>
              )}
            </Grid>
          </FormSection>

          {/* Allowances */}
          <FormSection title="البدلات والمكافآت" icon={<span>💰</span>}>
            <Grid cols={2}>
              <Input label="بدل مواصلات" type="number" value={emp.transportAllowance || ''} onChange={e => set('transportAllowance', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="بدل وجبات" type="number" value={emp.mealAllowance || ''} onChange={e => set('mealAllowance', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="بدل سكن" type="number" value={emp.housingAllowance || ''} onChange={e => set('housingAllowance', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="مكافأة أداء" type="number" value={emp.performanceBonus || ''} onChange={e => set('performanceBonus', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="مكافأة سنوية" type="number" value={emp.annualBonus || ''} onChange={e => set('annualBonus', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="حافز / بونص" type="number" value={emp.incentive || ''} onChange={e => set('incentive', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="عمولة إنتاج" type="number" value={emp.commissionPercent || ''} onChange={e => set('commissionPercent', +e.target.value)} suffix="%" placeholder="0" />
            </Grid>
          </FormSection>

          {/* Deductions */}
          <FormSection title="الخصومات والاستقطاعات" icon={<span>📊</span>}>
            <Grid cols={2}>
              <Input label="التأمينات الاجتماعية" type="number" value={emp.insuranceRate || ''} onChange={e => set('insuranceRate', +e.target.value)} suffix="%" placeholder="11" hint="الافتراضي 11%" />
              <Input label="ضريبة الدخل" type="number" value={emp.incomeTaxRate || ''} onChange={e => set('incomeTaxRate', +e.target.value)} suffix="%" placeholder="0" />
              <Input label="سلفة الشهر الحالي" type="number" value={emp.currentAdvance || ''} onChange={e => set('currentAdvance', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="أقساط سلف سابقة" type="number" value={emp.previousInstallments || ''} onChange={e => set('previousInstallments', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="مشتريات من المصنع" type="number" value={emp.factoryPurchases || ''} onChange={e => set('factoryPurchases', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="غرامات تأديبية" type="number" value={emp.disciplinaryFines || ''} onChange={e => set('disciplinaryFines', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="خصومات أخرى" type="number" value={emp.otherDeductions || ''} onChange={e => set('otherDeductions', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          {/* ── Live Salary Result ─────────────────────────────────────────── */}
          {hasResults && (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 text-sm flex items-center justify-center">📊</span>
                <h3 className="font-bold text-gold text-sm">حساب الراتب التلقائي</h3>
                <span className="text-xs text-white/30 mr-auto">يتحدث فورياً عند أي تغيير</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <MetricCard label="الراتب الإجمالي" value={`${fmt(computed.grossSalary || 0)} ${cur}`} variant="gold" />
                <MetricCard label="صافي الراتب المستحق" value={`${fmt(computed.netSalary || 0)} ${cur}`} variant="success" large />
              </div>
              <div className="space-y-0.5">
                <ResultRow
                  label={`الراتب الأساسي (${n(emp.actualAttendanceDays)} يوم × ${fmt(n(emp.baseSalary))} ${cur})`}
                  value={`${fmt(n(emp.baseSalary) * n(emp.actualAttendanceDays))} ${cur}`}
                />
                {(computed.overtimePay ?? 0) > 0 && (
                  <ResultRow
                    label={`أجر الأوفر تايم (${n(emp.overtimeHours)}h × ${fmt(displayOvertimeRate)} ${cur})`}
                    value={`+${fmt(computed.overtimePay || 0)} ${cur}`}
                    variant="success"
                  />
                )}
                <ResultRow label="إجمالي البدلات والمكافآت" value={`+${fmt(computed.totalAllowances || 0)} ${cur}`} variant="success" />
                <ResultRow label="الراتب الإجمالي" value={`${fmt(computed.grossSalary || 0)} ${cur}`} highlight="gold" bold />
                <Divider />
                {(computed.insuranceAmount ?? 0) > 0 && (
                  <ResultRow label={`استقطاع التأمينات (${n(emp.insuranceRate)}%)`} value={`-${fmt(computed.insuranceAmount || 0)} ${cur}`} variant="danger" />
                )}
                {(computed.taxAmount ?? 0) > 0 && (
                  <ResultRow label={`استقطاع ضريبة الدخل (${n(emp.incomeTaxRate)}%)`} value={`-${fmt(computed.taxAmount || 0)} ${cur}`} variant="danger" />
                )}
                {n(emp.absentUnexcusedDays) > 0 && (
                  <ResultRow label={`خصم غياب بدون إذن (${n(emp.absentUnexcusedDays)} يوم × ضعف اليومية)`} value={`-${fmt(n(emp.absentUnexcusedDays) * n(emp.baseSalary) * 2)} ${cur}`} variant="danger" />
                )}
                {n(emp.lateMinutes) > 0 && (
                  <ResultRow label={`خصم تأخير (${n(emp.lateMinutes)} دقيقة)`} value={`-${fmt((n(emp.lateMinutes) / (workHours * 60)) * n(emp.baseSalary))} ${cur}`} variant="danger" />
                )}
                {n(emp.currentAdvance) > 0 && (
                  <ResultRow label="سلفة الشهر الحالي" value={`-${fmt(n(emp.currentAdvance))} ${cur}`} variant="danger" />
                )}
                {n(emp.previousInstallments) > 0 && (
                  <ResultRow label="أقساط سلف سابقة" value={`-${fmt(n(emp.previousInstallments))} ${cur}`} variant="danger" />
                )}
                {n(emp.factoryPurchases) > 0 && (
                  <ResultRow label="مشتريات من المصنع" value={`-${fmt(n(emp.factoryPurchases))} ${cur}`} variant="danger" />
                )}
                {n(emp.disciplinaryFines) > 0 && (
                  <ResultRow label="غرامات تأديبية" value={`-${fmt(n(emp.disciplinaryFines))} ${cur}`} variant="danger" />
                )}
                {n(emp.otherDeductions) > 0 && (
                  <ResultRow label="خصومات أخرى" value={`-${fmt(n(emp.otherDeductions))} ${cur}`} variant="danger" />
                )}
                <ResultRow label="إجمالي الخصومات" value={`-${fmt(computed.totalDeductions || 0)} ${cur}`} highlight="danger" bold />
                <Divider gold />
                <ResultRow label="✅ صافي الراتب المستحق" value={`${fmt(computed.netSalary || 0)} ${cur}`} highlight="success" bold />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button className="btn-ghost" onClick={() => setView('list')}>إلغاء</button>
            <button className="btn-gold" onClick={handleSave}><Save size={14} /> {editId ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      )}

      {/* ── View Payslip Modal ─────────────────────────────────────────────── */}
      <Modal open={!!viewEmp} onClose={() => setViewEmp(null)} title={`كشف راتب: ${viewEmp?.fullName}`}>
        {viewEmp && (
          <div className="space-y-2">
            <div className="text-center pb-3 border-b border-white/8">
              <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-2 text-xl font-bold text-gold">
                {viewEmp.fullName.charAt(0)}
              </div>
              <p className="font-bold text-white">{viewEmp.fullName}</p>
              <p className="text-xs text-white/35">{viewEmp.code} · {positions.find(p => p.value === viewEmp.position)?.label}</p>
            </div>
            <ResultRow label="الراتب الإجمالي" value={`${fmt(viewEmp.grossSalary || 0)} ${cur}`} highlight="gold" bold />
            <ResultRow label="البدلات" value={`+${fmt(viewEmp.totalAllowances || 0)} ${cur}`} variant="success" />
            <ResultRow label="أجر الأوفر تايم" value={`+${fmt(viewEmp.overtimePay || 0)} ${cur}`} variant="success" />
            <ResultRow label="الخصومات" value={`-${fmt(viewEmp.totalDeductions || 0)} ${cur}`} variant="danger" />
            <Divider gold />
            <ResultRow label="صافي الراتب" value={`${fmt(viewEmp.netSalary || 0)} ${cur}`} highlight="success" bold />
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
              <button className="btn-gold w-full" onClick={handlePrint}><Printer size={16} /> طباعة مستند الراتب P-Slip</button>
            </div>
          </div>
        )}
      </Modal>

      <div className="hidden">
        {viewEmp && <PayslipTemplate ref={printRef} emp={viewEmp} />}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد حذف الموظف"
        footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDelete}>حذف</button></>}>
        <p className="text-sm text-white/70">هل تريد حذف بيانات هذا الموظف؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Employees
