import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt } from '../../utils/calculations'
import type { Employee } from '../../store/useEmployeesStore'

const QRCode = (QRCodeModule as any).default || QRCodeModule

interface PayslipProps {
  emp: Employee
}

const today = () => new Date().toLocaleDateString('ar-EG')

export const PayslipTemplate = React.forwardRef<HTMLDivElement, PayslipProps>(({ emp }, ref) => {
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'
  
  return (
    <div ref={ref} className="print-only bg-white text-[#0f172a] p-8 font-[Cairo] w-full" dir="rtl">
      {/* ── Premium Header ── */}
      <div className="print-header-navy flex justify-between items-center mb-8 shadow-sm">
        <div className="text-right">
          <h1 className="text-3xl font-black text-amber-400 mb-1">{settings.companyName || 'PRO PRINT'}</h1>
          <p className="text-white/70 text-sm font-medium">مفردات مرتب - بيان الراتب الشهري المعتمد</p>
          <div className="flex gap-4 mt-3 text-xs text-white/50">
             <span>{settings.companyAddress || 'مصنع ProTex'}</span>
             <span>•</span>
             <span>تاريخ الاستخراج: {today()}</span>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border border-white/20 shadow-inner">
          <QRCode 
            value={`EMP:${emp.code}|NET:${emp.netSalary}|DATE:${today()}`} 
            size={70} 
            level="M" 
          />
        </div>
      </div>

      {/* ── Employee Info Card ── */}
      <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="col-span-2">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">اسم الموظف / العامل</p>
          <h3 className="text-xl font-bold text-slate-800">{emp.fullName}</h3>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">الكود الوظيفي</p>
          <p className="text-lg font-black text-slate-700" dir="ltr">{emp.code}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">المهنة / الوظيفة</p>
          <p className="text-sm font-bold text-slate-700">{emp.position || 'عامل'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10">
        {/* ── Earnings ── */}
        <div>
          <div className="flex items-center gap-2 mb-4 border-b-2 border-emerald-500 pb-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            <h3 className="text-lg font-black text-slate-800">مستحقات (إيرادات)</h3>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">الراتب الأساسي / اليومية ({emp.actualAttendanceDays || 0} يوم)</span>
               <span className="font-bold text-emerald-600">+{fmt((emp.baseSalary || 0) * (emp.actualAttendanceDays || 0))} {cur}</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">إضافي الساعات</span>
               <span className="font-bold text-emerald-600">+{fmt(emp.overtimePay || 0)} {cur}</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">البدلات والمكافآت</span>
               <span className="font-bold text-emerald-600">+{fmt(emp.totalAllowances || 0)} {cur}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl mt-4 border border-emerald-100">
               <span className="font-black text-slate-800">إجمالي الاستحقاق</span>
               <span className="font-black text-emerald-700 text-lg">{fmt(emp.grossSalary || 0)} {cur}</span>
             </div>
          </div>
        </div>

        {/* ── Deductions ── */}
        <div>
          <div className="flex items-center gap-2 mb-4 border-b-2 border-rose-500 pb-2">
            <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
            <h3 className="text-lg font-black text-slate-800">استقطاعات (خصومات)</h3>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">تأمينات وضرائب دخل</span>
               <span className="font-bold text-rose-600">-{fmt((emp.insuranceAmount || 0) + (emp.taxAmount || 0))} {cur}</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">غياب وتأخير</span>
               <span className="font-bold text-rose-600">-{fmt((emp.absentUnexcusedDays || 0) * 2 * (emp.baseSalary || 0) + ((emp.lateMinutes || 0) / 480) * (emp.baseSalary || 0))} {cur}</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-100">
               <span className="text-slate-600">سلف وخصومات أخرى</span>
               <span className="font-bold text-rose-600">-{fmt((emp.totalDeductions || 0) - (emp.insuranceAmount || 0) - (emp.taxAmount || 0) - ((emp.absentUnexcusedDays || 0) * 2 * (emp.baseSalary || 0) + ((emp.lateMinutes || 0) / 480) * (emp.baseSalary || 0)))} {cur}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl mt-4 border border-rose-100">
               <span className="font-black text-slate-800">إجمالي الاستقطاع</span>
               <span className="font-black text-rose-700 text-lg">{fmt(emp.totalDeductions || 0)} {cur}</span>
             </div>
          </div>
        </div>
      </div>

      {/* ── Net Pay Highlighting ── */}
      <div className="relative mb-20">
        <div className="absolute inset-0 bg-slate-900 rounded-2xl transform rotate-1 scale-[1.01]"></div>
        <div className="relative bg-slate-800 text-white p-8 rounded-2xl flex justify-between items-center shadow-xl border-l-8 border-amber-400">
          <div>
            <p className="text-amber-400 text-xs font-black uppercase mb-1">صافي المبلغ المستحق للصرف</p>
            <p className="text-white/60 text-sm font-medium">فقط وحصرياً لهذا الشهر بعد الخصم</p>
          </div>
          <div className="text-left">
            <span className="text-4xl font-black text-white num">{fmt(emp.netSalary || 0)}</span>
            <span className="text-xl font-bold text-amber-400 mr-2">{cur}</span>
          </div>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="grid grid-cols-3 gap-12 text-center border-t border-slate-200 pt-10">
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">توقيع الموظف</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2 italic text-slate-300 text-xs">Sign here</div>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">المراجعة المالية</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2"></div>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">اعتماد الإدارة</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2"></div>
        </div>
      </div>

      <div className="mt-20 text-center">
        <p className="text-[10px] text-slate-300 font-medium">هذا المستند تم استخراجه آلياً من نظام ProTex ERP ويعتد به في المعاملات الداخلية</p>
      </div>
    </div>
  )
})

PayslipTemplate.displayName = 'PayslipTemplate'
