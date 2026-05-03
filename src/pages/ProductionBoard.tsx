import React, { useState } from 'react'
import { KanbanSquare, Printer, Zap, Shirt, ChevronLeft, ChevronRight, CheckCircle2, Clock, Package, Receipt } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrdersStore, type OrderStatus, type SilkscreenOrder, type DTFOrder, type ClothingOrder, type Order } from '../store/useOrdersStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { usePieceworkersStore } from '../store/usePieceworkersStore'
import { PageHeader, Badge, Toast, Modal } from '../components/ui'
import { fmt } from '../utils/calculations'
import OrderInvoiceModal from '../components/OrderInvoiceModal'

type KanbanOrder = {
  id: string
  orderNumber: string
  type: 'silkscreen' | 'dtf' | 'clothing'
  status: OrderStatus
  date: string
  totalPieces: number
  clientName?: string
}

const statusMap: Record<OrderStatus, { label: string, color: string }> = {
  pending: { label: 'قيد الانتظار', color: 'border-white/20 bg-white/5' },
  processing: { label: 'جاري الطباعة والتجهيز', color: 'border-blue-500/30 bg-blue-500/10' },
  finishing: { label: 'التقفيل والمراجعة (QC)', color: 'border-yellow-500/30 bg-yellow-500/10' },
  ready: { label: 'جاهز للتسليم', color: 'border-success/30 bg-success/10' },
  delivered: { label: 'تم التسليم 🏁', color: 'border-gold/30 bg-gold/10' },
  canceled: { label: 'ملغي ❌', color: 'border-rose-500/30 bg-rose-500/10' },
}

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'processing',
  processing: 'finishing',
  finishing: 'ready',
  ready: 'delivered',
  delivered: null,
  canceled: null
}

const prevStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: null,
  processing: 'pending',
  finishing: 'processing',
  ready: 'finishing',
  delivered: 'ready',
  canceled: 'pending'
}

const getIcon = (type: string) => {
  if (type === 'silkscreen') return <Printer size={14} className="text-white/60" />
  if (type === 'dtf') return <Zap size={14} className="text-white/60" />
  return <Shirt size={14} className="text-white/60" />
}

const getTypeName = (type: string) => {
  if (type === 'silkscreen') return 'سيلك سكرين'
  if (type === 'dtf') return 'DTF'
  return 'ملابس'
}

type BoardTab = 'all' | 'silkscreen' | 'dtf' | 'clothing'

const ProductionBoard: React.FC = () => {
  const { silkscreenOrders, dtfOrders, clothingOrders, updateOrderStatus } = useOrdersStore()
  const { deductStock, items: invItems } = useInventoryStore()
  const { tickets: pieceworkerTickets } = usePieceworkersStore()
  const [toast, setToast] = useState<{msg:string, type:'success'|'warning'} | null>(null)
  const [deductModal, setDeductModal] = useState<KanbanOrder | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState<BoardTab>('all')

  const allOrders: KanbanOrder[] = [
    ...silkscreenOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, type: 'silkscreen' as const, status: o.status || 'pending', date: o.date, totalPieces: o.totalPieces, clientName: o.clientId })),
    ...dtfOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, type: 'dtf' as const, status: o.status || 'pending', date: o.date, totalPieces: o.totalPieces, clientName: o.clientId })),
    ...clothingOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, type: 'clothing' as const, status: o.status || 'pending', date: o.date, totalPieces: o.totalPieces, clientName: o.clientId })),
  ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const filteredOrders = allOrders.filter(o => activeTab === 'all' || o.type === activeTab)

  const handleMove = (order: KanbanOrder, dir: 'next' | 'prev') => {
    const fn = dir === 'next' ? nextStatus : prevStatus
    const newStatus = fn[order.status]
    if (newStatus) {
      updateOrderStatus(order.type, order.id, newStatus)
      if (newStatus === 'delivered') {
        setDeductModal(order)
      }
    }
  }

  const handleConfirmDeduct = () => {
    if (!deductModal) return
    const { type, orderNumber, totalPieces } = deductModal
    const ref = `تسليم أوردر ${orderNumber}`

    // Deduct based on order type، auto-map to known inventory item IDs
    if (type === 'silkscreen') {
      // Deduct silk ink based on pieces (approximate: 0.01 kg per piece)
      const inkQty = totalPieces * 0.01
      const inkItem = invItems.find(i => i.id === 'inv-silk-ink' || i.name.includes('حبر سيلك'))
      if (inkItem && inkQty > 0) deductStock(inkItem.id, inkQty, ref)
    } else if (type === 'dtf') {
      // Deduct DTF film (approximate: 0.1 roll per piece) and powder (5g per piece)
      const filmItem = invItems.find(i => i.id === 'inv-dtf-film' || i.name.includes('فيلم'))
      const powderItem = invItems.find(i => i.id === 'inv-dtf-powder' || i.name.includes('بودرة'))
      if (filmItem) deductStock(filmItem.id, totalPieces * 0.1, ref)
      if (powderItem) deductStock(powderItem.id, totalPieces * 0.005, ref) // 5g = 0.005 kg per piece
    } else if (type === 'clothing') {
      const fullOrder = useOrdersStore.getState().clothingOrders.find(o => o.id === deductModal.id)
      if (fullOrder && fullOrder.isCMT) {
        // Do nothing for CMT (تصنيع للغير), materials belong to client trust.
        // We might add Client Trust Inventory deduction here in the future.
      } else {
        // Deduct factory fabric (approximate: 0.3 kg per piece)
        const fabricItem = invItems.find(i => i.id === 'inv-fabric-polo' || i.name.includes('قماش'))
        if (fabricItem) deductStock(fabricItem.id, totalPieces * 0.3, ref)
      }
    }

    // Record in treasury as COGS note (informational)
    useTreasuryStore.getState().addTransaction({
      amount: 0,
      type: 'expense_factory',
      isIncome: false,
      notes: `تسليم أوردر ${orderNumber} (${getTypeName(type)}) - تم خصم الخامات من المخزن`,
      referenceId: deductModal.id
    })

    setToast({ msg: `✓ تم تسليم أوردر ${orderNumber} وخصم الخامات من المخزن تلقائياً`, type: 'success' })
    setDeductModal(null)
  }

  const getNextActionLabel = (status: OrderStatus) => {
    if (status === 'pending') return 'بدء التشغيل'
    if (status === 'processing') return 'نقل للتقفيل'
    if (status === 'finishing') return 'اعتماد الجودة'
    if (status === 'ready') return 'تسليم الطلب'
    return null
  }

  const columns: OrderStatus[] = ['pending', 'processing', 'finishing', 'ready', 'delivered', 'canceled']

  return (
    <div className="space-y-5 h-[calc(100vh-100px)] flex flex-col">
      <PageHeader
        title="عنبر الإنتاج والتشغيل (Kanban)"
        subtitle="تابع خط سير الطلبيات في المصنع لايف"
        icon={<KanbanSquare size={18} />}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-[#0d1626] p-1.5 rounded-xl border border-white/5 w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          كل الأقسام
        </button>
        <button onClick={() => setActiveTab('silkscreen')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'silkscreen' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Printer size={16} /> سيلك سكرين
        </button>
        <button onClick={() => setActiveTab('dtf')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dtf' ? 'bg-gold/20 text-gold border border-gold/20 shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Zap size={16} /> طباعة DTF
        </button>
        <button onClick={() => setActiveTab('clothing')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'clothing' ? 'bg-success/20 text-success border border-success/20 shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
          <Shirt size={16} /> ورش الملابس
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x">
        {columns.map(statusKey => {
          const colItems = filteredOrders.filter(o => o.status === statusKey)
          const { label, color } = statusMap[statusKey]

          return (
            <div key={statusKey} className="snap-center min-w-[280px] w-[300px] flex-shrink-0 flex flex-col max-h-full">
              {/* Column Header */}
              <div className={`p-3 rounded-t-2xl border-b-2 bg-bg-card flex items-center justify-between mb-3 ${color.split(' ')[0]}`}>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  {statusKey === 'pending' && <Clock size={14} className="text-white/40"/>}
                  {statusKey === 'delivered' && <CheckCircle2 size={14} className="text-gold"/>}
                  {label}
                </h3>
                <Badge variant={colItems.length > 0 ? 'navy' : 'muted'}>{colItems.length}</Badge>
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                <AnimatePresence>
                  {colItems.map(order => (
                    <motion.div
                      key={`${order.type}-${order.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`p-3 rounded-xl border ${color} shadow-sm relative group`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          {getIcon(order.type)}
                          <span className="text-xs font-bold text-white max-w-[120px] truncate" title={order.orderNumber}>
                            {order.orderNumber}
                          </span>
                        </div>
                        <Badge variant="muted">{getTypeName(order.type)}</Badge>
                      </div>

                      <div className="text-[10px] text-white/50 mb-3 space-y-1">
                        <p>العدد: <span className="text-white font-bold">{fmt(order.totalPieces)}</span> ق</p>
                        <p>التاريخ: {new Date(order.date).toLocaleDateString('ar-EG')}</p>
                        
                        {/* Actual Production Progress from Ledger for Clothing Orders */}
                        {order.type === 'clothing' && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            {(() => {
                              const orderTickets = pieceworkerTickets.filter(t => t.orderId === order.id)
                              // If 'whole' we sum quantity directly. If 'stages', we might have multiple stages per piece, 
                              // so we just show the sum of 'whole' or if no 'whole', we just show the first stage's quantity to be safe, 
                              // or just show actual labor paid. Let's show actual labor paid as a progress metric!
                              const actualPaid = orderTickets.reduce((sum, t) => sum + t.totalAmount, 0)
                              if (actualPaid > 0) {
                                return (
                                  <div className="flex justify-between items-center text-success/80">
                                    <span>أجور تم دفعها:</span>
                                    <span className="font-bold">{fmt(actualPaid)} ج</span>
                                  </div>
                                )
                              }
                              return <span className="text-white/30">لم يتم تسجيل إنتاج بالورشة</span>
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          {nextStatus[order.status] && (
                            <button 
                              className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
                              onClick={() => handleMove(order, 'next')}
                            >
                              {order.status === 'finishing' ? <CheckCircle2 size={13} className="text-success" /> : <ChevronLeft size={13} />}
                              {getNextActionLabel(order.status)}
                            </button>
                          )}
                          
                          <button 
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-gold transition-all border border-white/5"
                            onClick={() => {
                              const storeState = useOrdersStore.getState()
                              let fullOrder: Order | undefined
                              if (order.type === 'silkscreen') fullOrder = storeState.silkscreenOrders.find(o => o.id === order.id)
                              else if (order.type === 'dtf') fullOrder = storeState.dtfOrders.find(o => o.id === order.id)
                              else if (order.type === 'clothing') fullOrder = storeState.clothingOrders.find(o => o.id === order.id)
                              if (fullOrder) setInvoiceOrder(fullOrder)
                            }}
                            title="طباعة فاتورة"
                          >
                            <Receipt size={14} />
                          </button>
                        </div>

                        {prevStatus[order.status] && (
                          <button 
                            className="w-full py-1.5 text-[10px] text-white/20 hover:text-white/50 transition-all flex items-center justify-center gap-1"
                            onClick={() => handleMove(order, 'prev')}
                          >
                            <ChevronRight size={10} /> العودة للمرحلة السابقة
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {colItems.length === 0 && (
                  <div className="h-24 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/20 text-xs">
                    فارغة
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!deductModal} onClose={() => setDeductModal(null)} title="تأكيد تسليم وخصم الخامات" footer={
        <>
          <button className="btn-ghost" onClick={() => setDeductModal(null)}>تخطي الخصم</button>
          <button className="btn-gold" onClick={handleConfirmDeduct}>تأكيد التسليم وخصم الخامات</button>
        </>
      }>
        {deductModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
              <CheckCircle2 size={20} className="text-success" />
              <div>
                <p className="font-bold text-white text-sm">تم تحريك أوردر {deductModal.orderNumber} لحالة "تم التسليم"</p>
                <p className="text-xs text-white/50">{fmt(deductModal.totalPieces)} قطعة — {getTypeName(deductModal.type)}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-gold" />
                <p className="text-sm font-bold text-white">الخامات التي سيتم خصمها تلقائياً:</p>
              </div>
              {deductModal.type === 'silkscreen' && (
                <p className="text-xs text-white/60">• حبر سيلك سكرين: ~{fmt(deductModal.totalPieces * 0.01, 3)} كيلو</p>
              )}
              {deductModal.type === 'dtf' && (
                <>
                  <p className="text-xs text-white/60">• فيلم DTF: ~{fmt(deductModal.totalPieces * 0.1, 2)} رول</p>
                  <p className="text-xs text-white/60">• بودرة DTF: ~{fmt(deductModal.totalPieces * 0.005, 3)} كيلو</p>
                </>
              )}
              {deductModal.type === 'clothing' && (
                <p className="text-xs text-white/60">• قماش: ~{fmt(deductModal.totalPieces * 0.3, 2)} كيلو</p>
              )}
            </div>

            <p className="text-[11px] text-white/30 text-center">يمكنك تعديل الكميات يدوياً من صفحة المخازن بعد التسليم</p>
          </div>
        )}
      </Modal>

      <OrderInvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ProductionBoard
