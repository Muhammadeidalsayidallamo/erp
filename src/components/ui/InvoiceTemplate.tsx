import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt } from '../../utils/calculations'

const QRCode = (QRCodeModule as any).default || QRCodeModule

export interface InvoiceItem {
  label: string
  value: string | number
  isHighlight?: boolean
}

export interface InvoiceProps {
  title: string
  orderNumber: string
  date: string
  clientName?: string
  clientPhone?: string
  items: InvoiceItem[]
  financials: {
    total: number
    paid: number
    remaining: number
    currency: string
  }
  image?: string
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceProps>(({
  title,
  orderNumber,
  date,
  clientName,
  clientPhone,
  items,
  financials,
  image
}, ref) => {
  const { settings } = useSettingsStore()
  
  return (
    <div ref={ref} className="print-only bg-white text-black p-10 font-[Cairo] w-full" dir="rtl">
      {/* ── Header ── */}
      <div className="flex justify-between items-start border-b-2 border-navy-dark pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-navy-dark mb-2">{settings.companyName || 'PRO PRINT'}</h1>
          <p className="text-gray-500 font-medium">{settings.companyAddress || 'العنوان غير مسجل'}</p>
          <p className="text-gray-500 font-medium" dir="ltr">{settings.companyPhone || 'الهاتف غير مسجل'}</p>
        </div>
        <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-100 flex gap-4 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
            <p className="text-sm font-bold text-navy">فاتورة رقم: <span className="font-black text-lg">{orderNumber}</span></p>
            <p className="text-sm text-gray-500">التاريخ: {date}</p>
          </div>
          <div className="bg-white p-1 rounded-lg border border-gray-200">
            <QRCode 
              value={`ORDER:${orderNumber}|TOT:${financials.total}|REM:${financials.remaining}|DATE:${date}`} 
              size={64} 
              level="M" 
            />
          </div>
        </div>
      </div>

      {/* ── Client Details ── */}
      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 mb-1 font-bold">مطلوب من السادة /</p>
          <h3 className="text-xl font-bold text-gray-800">{clientName || 'عميل نقدي / غير مسجل'}</h3>
        </div>
        {clientPhone && (
          <div className="text-left">
            <p className="text-xs text-gray-400 mb-1 font-bold">رقم التواصل</p>
            <p className="text-lg font-bold text-gray-700" dir="ltr">{clientPhone}</p>
          </div>
        )}
      </div>

      {/* ── Design Image ── */}
      {image && (
        <div className="mb-8">
          <p className="text-xs text-gray-400 mb-2 font-bold uppercase">معاينة التصميم / المنتج</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50 flex justify-center items-center overflow-hidden h-64">
            <img src={image} alt="تصميم الطباعة" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
          </div>
        </div>
      )}

      {/* ── Invoice Items ── */}
      <div className="mb-8">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-navy-dark text-white rounded-t-xl overflow-hidden">
              <th className="p-4 font-bold text-sm rounded-tr-xl w-2/3">البيان / الوصف</th>
              <th className="p-4 font-bold text-sm rounded-tl-xl w-1/3">القيمة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`border-b border-gray-100 ${item.isHighlight ? 'bg-gold/10' : idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                <td className={`p-4 text-sm ${item.isHighlight ? 'font-bold text-navy-dark' : 'text-gray-700'}`}>{item.label}</td>
                <td className={`p-4 font-bold ${item.isHighlight ? 'text-gold text-lg' : 'text-gray-900'}`}>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Financial Summary ── */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2 bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 font-bold">إجمالي المطالبة:</span>
            <span className="text-xl font-black text-navy-dark">{fmt(financials.total)} {financials.currency}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500">المدفوع (مقدم / عربون):</span>
            <span className="text-lg font-bold text-success">{fmt(financials.paid)} {financials.currency}</span>
          </div>
          <div className="h-px bg-gray-200 w-full my-3" />
          <div className="flex justify-between items-center bg-navy-dark text-white p-4 rounded-xl shadow-md border-b-4 border-gold">
            <span className="font-bold text-lg">المتبقي للدفع:</span>
            <span className="text-2xl font-black text-gold">{fmt(financials.remaining)} {financials.currency}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-200 py-6 text-center text-gray-400 text-sm">
        <p className="mb-2">نشكركم على ثقتكم في {settings.companyName}</p>
        <p className="text-xs opacity-70">تم إصدار هذه الفاتورة آلياً من نظام PRO PRINT Finance</p>
      </div>
    </div>
  )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'
