import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt } from '../../utils/calculations'

const QRCode = (QRCodeModule as any).default || QRCodeModule

export interface ExpensePartner {
  id: string
  name: string
  percentage: number
}

export interface ExpenseReportProps {
  title: string
  date: string
  reportNumber: string
  preparedBy: string
  items: { label: string; amount: number }[]
  total: number
  splitEnabled: boolean
  partners: ExpensePartner[]
}

export const ExpenseReportTemplate = React.forwardRef<HTMLDivElement, ExpenseReportProps>(({
  title,
  date,
  reportNumber,
  preparedBy,
  items,
  total,
  splitEnabled,
  partners
}, ref) => {
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'

  return (
    <div ref={ref} className="print-only bg-white text-[#0f172a] p-8 font-[Cairo] w-full" dir="rtl">
      {/* ── Premium Header ── */}
      <div className="print-header-navy flex justify-between items-center mb-8 shadow-sm">
        <div className="text-right">
          <h1 className="text-3xl font-black text-amber-400 mb-1">{settings.companyName || 'PRO PRINT'}</h1>
          <p className="text-white/70 text-sm font-medium">بيان مصروفات وتسوية مالية معتمدة</p>
          <div className="flex gap-4 mt-3 text-xs text-white/50">
             <span>{date}</span>
             <span>•</span>
             <span>رقم الكشف: {reportNumber}</span>
          </div>
        </div>
        <div className="bg-white p-2 rounded-xl border border-white/20 shadow-inner">
          <QRCode 
            value={`EXP:${reportNumber}|TOT:${total}|DT:${date}`} 
            size={70} 
            level="M" 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="col-span-2">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">وصف الكشف / الغرض</p>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="text-left">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">المسؤول / العهدة</p>
          <p className="text-lg font-black text-slate-700">{preparedBy || '---'}</p>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-800 pb-2">
           <div className="w-2 h-6 bg-slate-800 rounded-full"></div>
           <h3 className="text-lg font-black text-slate-800">تفاصيل البنود والمنصرفات</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12 text-center">م</th>
              <th className="text-right">البيان / بند المصروف</th>
              <th className="w-40 text-left">القيمة ({cur})</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="text-center text-slate-400">{i + 1}</td>
                <td className="font-medium text-slate-700">{item.label || '---'}</td>
                <td className="text-left font-black num text-slate-900">{fmt(item.amount)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="py-10 text-center text-slate-400">لا توجد بيانات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Settlement & Total ── */}
      <div className="grid grid-cols-2 gap-10 items-start mb-16">
        <div>
          {splitEnabled && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
               <h4 className="font-black text-slate-800 mb-4 text-sm border-b border-slate-200 pb-2">محضر توزيع الشركاء</h4>
               <div className="space-y-3">
                  {partners.map(p => {
                    const share = total * (p.percentage / 100)
                    return (
                      <div key={p.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{p.name} ({p.percentage}%)</span>
                        <span className="font-black text-rose-600 num">{fmt(share)} {cur}</span>
                      </div>
                    )
                  })}
               </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800 text-white p-6 rounded-2xl flex justify-between items-center border-r-8 border-amber-400 shadow-lg">
          <div>
            <p className="text-amber-400 text-[10px] font-black uppercase">إجمالي المبلغ المطلوب</p>
            <p className="text-white/50 text-xs mt-1">Gross Total Amount</p>
          </div>
          <div className="text-left">
            <span className="text-3xl font-black text-white num">{fmt(total)}</span>
            <span className="text-lg font-bold text-amber-400 mr-2">{cur}</span>
          </div>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="grid grid-cols-3 gap-12 text-center border-t border-slate-200 pt-10">
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">توقيع المسؤول</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2 italic text-slate-300 text-xs">Sign here</div>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">المراجعة المحاسبية</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2"></div>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] mb-12 font-black uppercase tracking-widest">اعتماد الإدارة</p>
          <div className="border-b-2 border-slate-200 w-full mx-auto pb-2"></div>
        </div>
      </div>

      <div className="mt-20 text-center">
        <p className="text-[10px] text-slate-300 font-medium">هذا المستند تم استخراجه من نظام PRO TEX ERP ويعد وثيقة مالية رسمية</p>
      </div>
    </div>
  )
})
ExpenseReportTemplate.displayName = 'ExpenseReportTemplate'
