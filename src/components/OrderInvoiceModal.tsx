import React, { useRef } from 'react'
import { Modal, Grid, Divider } from './ui'
import { Printer, Building2 } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { useSettingsStore } from '../store/useSettingsStore'
import { useClientsStore } from '../store/useClientsStore'
import { fmt, n } from '../utils/calculations'
import { Order } from '../store/useOrdersStore'

interface Props {
  order: Order | null
  onClose: () => void
}

const OrderInvoiceModal: React.FC<Props> = ({ order, onClose }) => {
  const { settings } = useSettingsStore()
  const { clients } = useClientsStore()
  const printRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `فاتورة_أوردر_${order?.orderNumber || ''}`,
  })

  if (!order) return null

  const client = clients.find(c => c.id === order.clientId)
  
  let typeLabel = ''
  let piecePrice = 0
  let designName = ''
  let details = ''

  // Type Guards/Detection
  if ('screenPrice' in order) {
    // Silkscreen
    typeLabel = 'سيلك سكرين'
    piecePrice = order.suggestedPrice
    designName = order.printingUnit || 'أوردر سيلك سكرين'
    details = `الألوان: ${order.numColors}`
  } else if ('filmRollPrice' in order) {
    // DTF
    typeLabel = 'طباعة DTF'
    piecePrice = order.suggestedPricePerPiece
    designName = order.printingUnit || 'أوردر DTF'
    details = `المقاس: ${order.designWidth}x${order.designHeight}`
  } else if ('factoryName' in order) {
    // Clothing
    typeLabel = 'ورش ملابس'
    piecePrice = order.wholesalePrice
    designName = order.productType || 'أوردر ملابس'
    details = `المصنع: ${order.factoryName}`
  }

  const total = n(order.totalPieces) * n(piecePrice)
  const vat = n(settings.vatRate) > 0 ? total * (n(settings.vatRate) / 100) : 0
  const finalTotal = total + vat
  const cur = settings.currencySymbol || 'ج.م'

  return (
    <Modal open={!!order} onClose={onClose} title="فاتورة مبيعات الأوردر" footer={
      <>
        <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        <button className="btn-gold" onClick={() => handlePrint()}>
          <Printer size={16} /> طباعة الفاتورة
        </button>
      </>
    }>
      <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
        <div 
          ref={printRef} 
          className="bg-white text-black p-8 mx-auto w-full max-w-[21cm] min-h-[20cm]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex items-center gap-4">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="Logo" className="w-20 h-20 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 size={32} className="text-gray-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-gray-900">{settings.companyName || 'ProTex ERP'}</h1>
                <p className="text-gray-500 text-sm mt-1">{settings.companyAddress}</p>
                <p className="text-gray-500 text-sm">{settings.companyPhone}</p>
                {settings.taxNumber && <p className="text-gray-500 text-sm mt-1">الرقم الضريبي: <span className="font-bold">{settings.taxNumber}</span></p>}
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-3xl font-black text-gray-200 mb-2">INVOICE</h2>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500">رقم الفاتورة: <span className="font-bold text-gray-900">{order.orderNumber}</span></p>
                <p className="text-sm text-gray-500 mt-1">التاريخ: <span className="font-bold text-gray-900">{new Date(order.date).toLocaleDateString('ar-EG')}</span></p>
                <p className="text-sm text-gray-500 mt-1">نوع الطلب: <span className="font-bold text-gray-900">{typeLabel}</span></p>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-3">بيانات العميل</h3>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-black text-lg text-gray-900">{client?.name || 'عميل نقدي'}</p>
              {client?.phone && <p className="text-gray-600 text-sm mt-1">الهاتف: {client.phone}</p>}
              {client?.company && <p className="text-gray-600 text-sm">الشركة: {client.company}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="bg-gray-900 text-white text-sm">
                <th className="py-3 px-4 text-right rounded-r-lg w-16">م</th>
                <th className="py-3 px-4 text-right">البيان / التصميم</th>
                <th className="py-3 px-4 text-center w-24">الكمية</th>
                <th className="py-3 px-4 text-center w-32">سعر الوحدة</th>
                <th className="py-3 px-4 text-left rounded-l-lg w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 px-4 text-center font-medium text-gray-600">1</td>
                <td className="py-4 px-4 font-bold text-gray-900">
                  {designName}
                  <div className="text-xs text-gray-500 font-normal mt-1">
                    {details}
                  </div>
                </td>
                <td className="py-4 px-4 text-center font-bold">{fmt(order.totalPieces)}</td>
                <td className="py-4 px-4 text-center">{fmt(piecePrice)}</td>
                <td className="py-4 px-4 text-left font-black">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-72 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 font-medium">الإجمالي قبل الضريبة:</span>
                <span className="font-bold text-gray-900">{fmt(total)}</span>
              </div>
              {vat > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 font-medium">الضريبة ({settings.vatRate}%):</span>
                  <span className="font-bold text-gray-900">{fmt(vat)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">الإجمالي النهائي:</span>
                <span className="text-xl font-black text-gray-900">{fmt(finalTotal)} <span className="text-sm font-normal text-gray-500">{cur}</span></span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="mt-auto pt-8 border-t border-gray-200 grid grid-cols-2 text-sm text-gray-500">
            <div>
              <p className="font-bold text-gray-700 mb-2">الشروط والأحكام:</p>
              <p>1. البضاعة المباعة لا ترد ولا تستبدل بعد 14 يوم.</p>
              <p>2. يرجى مراجعة الجودة والكميات عند الاستلام.</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-700 mb-8">توقيع الإدارة / الختم</p>
              <p>___________________</p>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  )
}

export default OrderInvoiceModal
