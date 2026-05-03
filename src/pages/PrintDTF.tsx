import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { Zap, Save, Plus, Trash2, FileText, Edit3 } from 'lucide-react'
import { useOrdersStore, type DTFOrder } from '../store/useOrdersStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useClientsStore } from '../store/useClientsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { calcDTF, fmt, uid, today, n } from '../utils/calculations'
import {
  Input, Select, Grid, FormSection, ResultRow, MetricCard,
  PageHeader, Toast, EmptyState, Modal, Card, Badge, ResultsPanel, Divider, InvoiceTemplate
} from '../components/ui'

const makeOrder = (num: string): DTFOrder => ({
  id: uid(), date: today(), orderNumber: num, printingUnit: '',
  clientId: '', paidAmount: 0, remainingAmount: 0, status: 'pending',
  itemDescription: '', printLocations: '', designImage: '', totalPieces: 0,
  filmRollPrice: 0, designWidth: 0, designHeight: 0, designsPerRoll: 0, rollConsumptionPer100: 0,
  powderPricePerKg: 0, powderGramsPer100: 30,
  cmykInkPricePer100ml: 0, whiteInkPricePer100ml: 0, cmykMlPerA4: 0, whiteMlPerA4: 0, piecesPerA4Equivalent: 1,
  printHeadLifeMl: 0, printHeadPrice: 0, maintenanceCost: 0, wasteTankCost: 0,
  printerKw: 0, ovenKw: 0, electricityPricePerKw: 0, operatingHours: 0,
  numWorkers: 0, workerDaily: 0, printTimePerPieceMins: 0, pressingTimeMins: 0, orderDays: 1,
  shipping: 0, packaging: 0, profitMargin: 30, taxRate: 0,
  filmCostPerPiece: 0, inkCostPerPiece: 0, powderCostPerPiece: 0, energyCostPerPiece: 0,
  laborCostPerPiece: 0, machineCostPerPiece: 0,
  totalCostPerPiece: 0, totalOrderCost: 0, suggestedPricePerPiece: 0, suggestedTotalPrice: 0, netProfit: 0, profitPercent: 0,
})

const PrintDTF: React.FC = () => {
  const { settings } = useSettingsStore()
  const { clients } = useClientsStore()
  const { dtfOrders, saveDTF, deleteDTF } = useOrdersStore()
  const [order, setOrder] = useState<DTFOrder>(() => makeOrder(`DTF-${String(dtfOrders.length + 1).padStart(3, '0')}`))
  const [res, setRes] = useState<Partial<DTFOrder>>({})
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [printOpts, setPrintOpts] = useState({
    showImage: true,
    showInternalCosts: false,
    showPiecePrice: true,
    showTotalPrice: true
  })
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })
  const cur = settings.currencySymbol || 'ج.م'

  useEffect(() => { setRes(calcDTF(order)) }, [order])

  const set = (f: keyof DTFOrder, v: string | number) => setOrder(p => ({ ...p, [f]: v }))

  const handleSave = () => {
    if (!order.printingUnit.trim()) { setToast({ msg: 'يرجى إدخال اسم وحدة الطباعة', type: 'error' }); return }
    if (!n(order.totalPieces)) { setToast({ msg: 'يرجى إدخال عدد القطع', type: 'error' }); return }
    
    const suggestedTotalPrice = res.suggestedTotalPrice || 0
    const paid = order.paidAmount || 0
    const remaining = suggestedTotalPrice - paid
    
    saveDTF({ ...order, ...res, remainingAmount: remaining })
    
    if (order.clientId && !editId) {
      useClientsStore.getState().addTransaction({
        clientId: order.clientId,
        orderId: order.id,
        amount: suggestedTotalPrice,
        type: 'debt',
        notes: `أوردر طباعة DTF رقم ${order.orderNumber}`
      })
      if (paid > 0) {
        useClientsStore.getState().addTransaction({
          clientId: order.clientId,
          orderId: order.id,
          amount: paid,
          type: 'payment',
          notes: `عربون أوردر ${order.orderNumber}`
        })
        useTreasuryStore.getState().addTransaction({
          amount: paid,
          type: 'income_client',
          isIncome: true,
          notes: `عربون أوردر طباعة DTF رقم ${order.orderNumber}`,
          referenceId: order.clientId
        })
      }
    } else if (paid > 0 && !editId) {
      useTreasuryStore.getState().addTransaction({
        amount: paid,
        type: 'income_client',
        isIncome: true,
        notes: `عربون أوردر DTF رقم ${order.orderNumber} (نقدي)`
      })
    }

    setToast({ msg: 'تم حفظ الأوردر وتحديث الخزينة والعملاء ✓', type: 'success' })
    setView('list'); setEditId(null)
  }

  const handleNew = () => {
    setOrder(makeOrder(`DTF-${String(dtfOrders.length + 1).padStart(3, '0')}`))
    setEditId(null); setView('form'); window.scrollTo(0, 0)
  }

  const handleEdit = (o: DTFOrder) => { setOrder(o); setEditId(o.id); setView('form'); window.scrollTo(0, 0) }
  const handleDelete = () => { if (deleteId) { deleteDTF(deleteId); setDeleteId(null); setToast({ msg: 'تم الحذف', type: 'error' }) } }

  const hasResults = n(order.totalPieces) > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="طباعة DTF"
        subtitle={`${dtfOrders.length} أوردر محفوظ`}
        icon={<Zap size={18} />}
        actions={
          <div className="flex gap-2">
            {view === 'form' && (
              <>
                <button className="btn-ghost text-gold border-gold/30" onClick={() => handlePrint()}>
                  <Zap size={14} /> طباعة الفاتورة
                </button>
                <button className="btn-ghost" onClick={() => setView('list')}>القائمة</button>
              </>
            )}
            <button className="btn-gold" onClick={handleNew}><Plus size={14} /> أوردر جديد</button>
          </div>
        }
      />

      {view === 'list' && (
        <div className="space-y-3">
          {dtfOrders.length === 0 ? (
            <Card>
              <EmptyState icon={<Zap />} title="لا توجد أوردرات DTF"
                description="اضغط 'أوردر جديد' لبدء حساب تكاليف طباعة DTF"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={14} /> أوردر جديد</button>} />
            </Card>
          ) : (
            dtfOrders.map(o => (
              <motion.div key={o.id} className="card p-4 border-gold/10 hover:border-gold/20 transition-colors"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm">{o.printingUnit || '—'}</span>
                      <Badge variant="gold">{o.orderNumber}</Badge>
                      <Badge variant="muted">{o.date}</Badge>
                    </div>
                    <p className="text-xs text-white/35">{o.totalPieces} قطعة</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div><p className="text-[10px] text-white/30">تكلفة الطباعة للقطعة</p><p className="num text-sm font-bold text-white/80">{fmt(o.totalCostPerPiece)} {cur}</p></div>
                      <div><p className="text-[10px] text-white/30">أجر الطباعة المقترح</p><p className="num text-sm font-bold text-gold">{fmt(o.suggestedPricePerPiece)} {cur}</p></div>
                      <div><p className="text-[10px] text-white/30">الإجمالي المطلوب</p><p className="num text-sm font-bold text-success">{fmt(o.suggestedTotalPrice)} {cur}</p></div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn-icon-gold" onClick={() => handleEdit(o)}><Edit3 size={14} /></button>
                    <button className="btn-icon-danger" onClick={() => setDeleteId(o.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {view === 'form' && (
        <div className="space-y-4">
          <InvoiceTemplate 
            ref={printRef}
            title="فاتورة طلب طباعة DTF"
            orderNumber={order.orderNumber}
            date={order.date}
            clientName={clients.find(c => c.id === order.clientId)?.name || order.printingUnit}
            clientPhone={clients.find(c => c.id === order.clientId)?.phone}
            items={[
              { label: 'المنتج المستلم للطباعة', value: order.itemDescription || '—' },
              { label: 'مواضع الطباعة', value: order.printLocations || '—' },
              { label: 'العدد الإجمالي للقطع', value: `${order.totalPieces} قطعة` },
              printOpts.showInternalCosts && { label: 'تكلفة الطباعة للمصنع (سرية)', value: `${fmt(res.totalCostPerPiece || 0)} ${cur}` },
              printOpts.showPiecePrice && { label: 'أجر الطباعة للقطعة الواحدة', value: `${fmt(res.suggestedPricePerPiece || 0)} ${cur}` },
              printOpts.showTotalPrice && { label: 'إجمالي أجر الطباعة (قيمة الأوردر)', value: `${fmt(res.suggestedTotalPrice || 0)} ${cur}` },
              { label: 'ضريبة القيمة المضافة', value: `${order.taxRate}%` },
              printOpts.showTotalPrice && { label: 'إجمالي الحساب المطلوب للتحصيل', value: `${fmt(res.suggestedTotalPrice || 0)} ${cur}`, isHighlight: true }
            ].filter(Boolean) as any}
            image={printOpts.showImage ? order.designImage : undefined}
            financials={{
              total: res.suggestedTotalPrice || 0,
              paid: order.paidAmount || 0,
              remaining: (res.suggestedTotalPrice || 0) - (order.paidAmount || 0),
              currency: cur
            }}
          />

          {/* Print Options */}
          <Card className="mb-4 bg-navy-dark/40 border-gold/20">
            <h4 className="text-sm font-bold text-gold mb-3 flex items-center gap-2"><Zap size={16}/> إعدادات عرض الفاتورة للطباعة</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showImage} onChange={e => setPrintOpts(p => ({...p, showImage: e.target.checked}))} className="accent-gold" />
                عرض التصميم / الموديل
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showPiecePrice} onChange={e => setPrintOpts(p => ({...p, showPiecePrice: e.target.checked}))} className="accent-gold" />
                عرض أجر القطعة الواحدة
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showTotalPrice} onChange={e => setPrintOpts(p => ({...p, showTotalPrice: e.target.checked}))} className="accent-gold" />
                عرض الإجمالي العام
              </label>
              <label className="flex items-center gap-2 text-sm text-red-400 cursor-pointer">
                <input type="checkbox" checked={printOpts.showInternalCosts} onChange={e => setPrintOpts(p => ({...p, showInternalCosts: e.target.checked}))} className="accent-red-500" />
                عرض تكلفة المصنع الداخلية (للاستخدام الداخلي فقط)
              </label>
            </div>
          </Card>

          <FormSection title="البيانات الأساسية" icon={<Zap size={14} />} collapsible={false}>
            <Grid cols={3}>
              <Select 
                label="اختر العميل" 
                options={[{value: '', label: 'بدون عميل محدد'}, ...clients.map(c => ({ value: c.id, label: c.name }))]} 
                value={order.clientId || ''} 
                onChange={e => set('clientId', e.target.value)} 
              />
              <Input label="رقم الأوردر" value={order.orderNumber} onChange={e => set('orderNumber', e.target.value)} placeholder="DTF-001" />
              <Input label="المطبعة / الوحدة" value={order.printingUnit} onChange={e => set('printingUnit', e.target.value)} placeholder="اسم العميل" />
              <Input label="تاريخ الأوردر" type="date" value={order.date} onChange={e => set('date', e.target.value)} />
            </Grid>
            <Grid cols={3}>
              <Input label="عدد القطع" type="number" value={order.totalPieces || ''} onChange={e => set('totalPieces', +e.target.value)} suffix="قطعة" placeholder="0" />
              <Input label="أيام الأوردر" type="number" value={order.orderDays || ''} onChange={e => set('orderDays', +e.target.value)} suffix="يوم" placeholder="1" />
              <Input label="العربون المُسدد (نقدي)" type="number" value={order.paidAmount || ''} onChange={e => set('paidAmount', +e.target.value)} suffix={cur} placeholder="0" hint="سيتم إضافته لدفتر العميل كدفعة" />
            </Grid>
          </FormSection>

          {/* Items From Client */}
          <FormSection title="المنتجات المستلمة للطباعة (من العميل)" icon={<span>📦</span>}>
            <Grid cols={3}>
              <Input label="وصف المنتج" value={order.itemDescription || ''} onChange={e => set('itemDescription', e.target.value)} placeholder="مثال: تيشرت أبيض" />
              <Select 
                label="موضع الطباعة" 
                options={[
                  { value: 'صدر', label: 'صدر فقط' },
                  { value: 'ظهر', label: 'ظهر فقط' },
                  { value: 'صدر_وظهر', label: 'صدر وظهر' },
                  { value: 'كم', label: 'كم' },
                  { value: 'متعدد', label: 'مواضع متعددة' },
                ]} 
                value={order.printLocations || ''} 
                onChange={e => set('printLocations', e.target.value)} 
              />
            </Grid>
            <div className="mt-4">
              <label className="text-xs font-bold text-white/60 block mb-2">إرفاق صورة التصميم أو الموديل (تظهر في الفاتورة)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => set('designImage', reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                {order.designImage && (
                  <button className="btn-icon-danger" onClick={() => set('designImage', '')}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {order.designImage && (
                <div className="mt-3 max-w-xs rounded-xl overflow-hidden border border-white/10">
                  <img src={order.designImage} alt="تصميم" className="w-full h-auto" />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="الفيلم (Film Roll)" icon={<span>🎞️</span>}>
            <Grid cols={2}>
              <Input label="سعر رول الفيلم" type="number" value={order.filmRollPrice || ''} onChange={e => set('filmRollPrice', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="عدد التصاميم في الرول" type="number" value={order.designsPerRoll || ''} onChange={e => set('designsPerRoll', +e.target.value)} suffix="تصميم" placeholder="0" />
              <Input label="عرض التصميم" type="number" value={order.designWidth || ''} onChange={e => set('designWidth', +e.target.value)} suffix="سم" placeholder="0" />
              <Input label="ارتفاع التصميم" type="number" value={order.designHeight || ''} onChange={e => set('designHeight', +e.target.value)} suffix="سم" placeholder="0" />
            </Grid>
          </FormSection>

          <FormSection title="الحبر (CMYK + White)" icon={<span>🖨️</span>}>
            <Grid cols={2}>
              <Input label="سعر 100مل حبر CMYK" type="number" value={order.cmykInkPricePer100ml || ''} onChange={e => set('cmykInkPricePer100ml', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="سعر 100مل حبر أبيض" type="number" value={order.whiteInkPricePer100ml || ''} onChange={e => set('whiteInkPricePer100ml', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="استهلاك CMYK للـA4" type="number" value={order.cmykMlPerA4 || ''} onChange={e => set('cmykMlPerA4', +e.target.value)} suffix="مل" placeholder="0" />
              <Input label="استهلاك أبيض للـA4" type="number" value={order.whiteMlPerA4 || ''} onChange={e => set('whiteMlPerA4', +e.target.value)} suffix="مل" placeholder="0" />
              <Input label="قطع per A4 equiv." type="number" value={order.piecesPerA4Equivalent || ''} onChange={e => set('piecesPerA4Equivalent', +e.target.value)} suffix="قطعة" placeholder="1" hint="كم قطعة تعادل ورقة A4؟" />
            </Grid>
          </FormSection>

          <FormSection title="البودرة والتثبيت" icon={<span>⚗️</span>}>
            <Grid cols={2}>
              <Input label="سعر كيلو البودرة" type="number" value={order.powderPricePerKg || ''} onChange={e => set('powderPricePerKg', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="استهلاك البودرة لكل 100 قطعة" type="number" value={order.powderGramsPer100 || ''} onChange={e => set('powderGramsPer100', +e.target.value)} suffix="جرام" placeholder="30" />
            </Grid>
          </FormSection>

          <FormSection title="رأس الطباعة والصيانة" icon={<span>🔧</span>}>
            <Grid cols={2}>
              <Input label="سعة رأس الطباعة (مل)" type="number" value={order.printHeadLifeMl || ''} onChange={e => set('printHeadLifeMl', +e.target.value)} suffix="مل" placeholder="0" />
              <Input label="سعر رأس الطباعة" type="number" value={order.printHeadPrice || ''} onChange={e => set('printHeadPrice', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="تكلفة الصيانة الشهرية" type="number" value={order.maintenanceCost || ''} onChange={e => set('maintenanceCost', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="تكلفة خزان الهدر" type="number" value={order.wasteTankCost || ''} onChange={e => set('wasteTankCost', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          <FormSection title="الكهرباء والعمالة" icon={<span>⚡</span>}>
            <Grid cols={2}>
              <Input label="استهلاك الطابعة" type="number" value={order.printerKw || ''} onChange={e => set('printerKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
              <Input label="استهلاك الحاضن/الفرن" type="number" value={order.ovenKw || ''} onChange={e => set('ovenKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
              <Input label="سعر الكيلوواط" type="number" value={order.electricityPricePerKw || ''} onChange={e => set('electricityPricePerKw', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="ساعات التشغيل يومياً" type="number" value={order.operatingHours || ''} onChange={e => set('operatingHours', +e.target.value)} suffix="ساعة" placeholder="0" />
              <Input label="عدد العمال" type="number" value={order.numWorkers || ''} onChange={e => set('numWorkers', +e.target.value)} suffix="عامل" placeholder="0" />
              <Input label="اليومية للعامل" type="number" value={order.workerDaily || ''} onChange={e => set('workerDaily', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="وقت الطباعة للقطعة" type="number" value={order.printTimePerPieceMins || ''} onChange={e => set('printTimePerPieceMins', +e.target.value)} suffix="دقيقة" placeholder="0" />
              <Input label="وقت الحاضن/الضغط للقطعة" type="number" value={order.pressingTimeMins || ''} onChange={e => set('pressingTimeMins', +e.target.value)} suffix="دقيقة" placeholder="0" />
            </Grid>
          </FormSection>

          <FormSection title="المصاريف وهامش الربح" icon={<span>💰</span>}>
            <Grid cols={2}>
              <Input label="الشحن والتوصيل" type="number" value={order.shipping || ''} onChange={e => set('shipping', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="التغليف والكرتون" type="number" value={order.packaging || ''} onChange={e => set('packaging', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="ضريبة القيمة المضافة" type="number" value={order.taxRate || ''} onChange={e => set('taxRate', +e.target.value)} suffix="%" placeholder="0" />
              <Input label="هامش الربح المطلوب" type="number" value={order.profitMargin || ''} onChange={e => set('profitMargin', +e.target.value)} suffix="%" placeholder="30" />
            </Grid>
          </FormSection>

          <ResultsPanel title="نتائج الحسابات (أجر الطباعة فقط)" visible={hasResults}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <MetricCard label="تكلفة الطباعة للقطعة" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} variant="navy" />
              <MetricCard label="أجر الطباعة المقترح" value={`${fmt(res.suggestedPricePerPiece || 0)} ${cur}`} variant="gold" />
              <MetricCard label="الإجمالي المطلوب" value={`${fmt(res.suggestedTotalPrice || 0)} ${cur}`} variant="success" />
              <MetricCard label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} variant="default" />
            </div>
            <div className="space-y-0.5">
              <ResultRow label="تكلفة الفيلم للقطعة" value={`${fmt(res.filmCostPerPiece || 0)} ${cur}`} />
              <ResultRow label="تكلفة الحبر للقطعة" value={`${fmt(res.inkCostPerPiece || 0)} ${cur}`} />
              <ResultRow label="تكلفة البودرة للقطعة" value={`${fmt(res.powderCostPerPiece || 0)} ${cur}`} />
              <ResultRow label="تكلفة الطاقة للقطعة" value={`${fmt(res.energyCostPerPiece || 0)} ${cur}`} />
              <ResultRow label="تكلفة العمالة للقطعة" value={`${fmt(res.laborCostPerPiece || 0)} ${cur}`} />
              <ResultRow label="استهلاك رأس الطباعة والصيانة" value={`${fmt(res.machineCostPerPiece || 0)} ${cur}`} />
              <Divider gold />
              <ResultRow label="إجمالي تكلفة المصنع (الداخلية)" value={`${fmt(res.totalOrderCost || 0)} ${cur}`} highlight="navy" bold />
              <ResultRow label="تكلفة الطباعة للقطعة الواحدة" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} highlight="navy" bold />
              <ResultRow label="أجر الطباعة المقترح للقطعة" value={`${fmt(res.suggestedPricePerPiece || 0)} ${cur}`} highlight="gold" bold />
              <ResultRow label="الإجمالي المطلوب تحصيله" value={`${fmt(res.suggestedTotalPrice || 0)} ${cur}`} highlight="success" bold />
              <ResultRow label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} highlight="success" bold />
            </div>
          </ResultsPanel>

          <div className="flex gap-3 justify-end no-print">
            <button className="btn-ghost" onClick={handlePrint}><FileText size={14} /> طباعة</button>
            <button className="btn-gold" onClick={handleSave}><Save size={14} /> {editId ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف"
        footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDelete}>حذف</button></>}>
        <p className="text-sm text-white/70">هل تريد حذف هذا الأوردر؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default PrintDTF
