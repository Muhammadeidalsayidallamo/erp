import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { Printer as PrinterIcon, Save, Plus, Trash2, FileText, Edit3 } from 'lucide-react'
import { useOrdersStore, type SilkscreenOrder } from '../store/useOrdersStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useClientsStore } from '../store/useClientsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { calcSilkscreen, fmt, uid, today, n } from '../utils/calculations'
import {
  Input, Select, Grid, FormSection, ResultRow, MetricCard,
  PageHeader, Toast, EmptyState, Modal, Card, Badge, ResultsPanel, Divider, InvoiceTemplate
} from '../components/ui'

const inkTypes = [
  { value: 'plastisol', label: 'بلاستيزول' },
  { value: 'water', label: 'مائي' },
  { value: 'discharge', label: 'ديسشارج' },
  { value: 'other', label: 'أخرى' },
]

const makeOrder = (num: string): SilkscreenOrder => ({
  id: uid(), date: today(), orderNumber: num, printingUnit: '',
  clientId: '', paidAmount: 0, remainingAmount: 0, status: 'pending',
  itemDescription: '', printLocations: '', totalPieces: 0,
  screenPrice: 0, numColors: 1, screenLifeOrders: 1, emulsionCostPerScreen: 0, emulsionRemoverCost: 0, thinnerCost: 0,
  inkType: 'plastisol', inkPricePerKg: 0, inkConsumptionPer100: 0,
  ovenKw: 0, electricityPricePerKw: 0, operatingHours: 0, gasOrFuelCost: 0,
  printWorkers: 0, printWorkerDaily: 0, screenPrepWorkers: 0, screenPrepDaily: 0,
  fixingWorkers: 0, fixingDaily: 0, qcWorkers: 0, qcDaily: 0,
  packagingWorkers: 0, packagingDaily: 0, orderDays: 1, overtimeHours: 0, overtimeRate: 0,
  rent: 0, maintenance: 0, shipping: 0, packaging: 0, profitMargin: 25, taxRate: 0,
  screenCost: 0, inkCost: 0, electricityCost: 0, laborCost: 0, otherCost: 0,
  totalOrderCost: 0, printCostPerPiece: 0, suggestedPrice: 0, suggestedTotalPrice: 0, netProfit: 0, profitPercent: 0,
})

const PrintSilkscreen: React.FC = () => {
  const { settings } = useSettingsStore()
  const { clients } = useClientsStore()
  const { silkscreenOrders, saveSilkscreen, deleteSilkscreen } = useOrdersStore()
  const [order, setOrder] = useState<SilkscreenOrder>(() => makeOrder(`SLK-${String(silkscreenOrders.length + 1).padStart(3, '0')}`))
  const [res, setRes] = useState<Partial<SilkscreenOrder>>({})
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

  useEffect(() => { setRes(calcSilkscreen(order)) }, [order])

  const set = (f: keyof SilkscreenOrder, v: string | number) => setOrder(p => ({ ...p, [f]: v }))

  const handleSave = () => {
    if (!order.printingUnit.trim()) { setToast({ msg: 'يرجى إدخال اسم وحدة الطباعة', type: 'error' }); return }
    if (!n(order.totalPieces)) { setToast({ msg: 'يرجى إدخال عدد القطع', type: 'error' }); return }

    // Auto-calculate total cost and suggested price
    const suggestedTotalPrice = res.suggestedTotalPrice || 0

    // Client total claim should be the total order revenue
    const paid = order.paidAmount || 0
    const remaining = suggestedTotalPrice - paid

    saveSilkscreen({ ...order, ...res, remainingAmount: remaining })

    // Treasury logic only. Client logic is handled centrally in useOrdersStore.
    if (paid > 0 && !editId) {
      useTreasuryStore.getState().addTransaction({
        amount: paid,
        type: 'income_client',
        isIncome: true,
        notes: order.clientId
          ? `عربون أوردر طباعة سيلك سكرين رقم ${order.orderNumber} (مربوط بالعميل)`
          : `عربون أوردر سيلك سكرين (نقدي مباشر) رقم ${order.orderNumber}`,
        referenceId: order.clientId || undefined
      })
    }

    setToast({ msg: 'تم حفظ الأوردر وتحديث الخزينة والعملاء ✓', type: 'success' })
    setView('list'); setEditId(null)
  }

  const handleNew = () => {
    const num = `SLK-${String(silkscreenOrders.length + 1).padStart(3, '0')}`
    setOrder(makeOrder(num)); setEditId(null); setView('form')
    window.scrollTo(0, 0)
  }

  const handleEdit = (o: SilkscreenOrder) => {
    setOrder(o); setEditId(o.id); setView('form'); window.scrollTo(0, 0)
  }

  const handleDelete = () => {
    if (deleteId) { deleteSilkscreen(deleteId); setDeleteId(null); setToast({ msg: 'تم الحذف', type: 'error' }) }
  }

  const hasResults = n(order.totalPieces) > 0 && n(res.totalOrderCost) > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="سيلك سكرين"
        subtitle={`${silkscreenOrders.length} أوردر محفوظ`}
        icon={<PrinterIcon size={18} />}
        actions={
          <div className="flex gap-2">
            {view === 'form' && (
              <>
                <button className="btn-ghost text-gold border-gold/30" onClick={() => handlePrint()}>
                  <PrinterIcon size={14} /> طباعة الفاتورة
                </button>
                <button className="btn-ghost" onClick={() => setView('list')}>القائمة</button>
              </>
            )}
            <button className="btn-gold" onClick={handleNew}><Plus size={14} /> أوردر جديد</button>
          </div>
        }
      />

      {/* ── LIST ── */}
      {view === 'list' && (
        <div className="space-y-3">
          {silkscreenOrders.length === 0 ? (
            <Card>
              <EmptyState
                icon={<PrinterIcon />}
                title="لا توجد أوردرات سيلك سكرين"
                description="اضغط 'أوردر جديد' لإضافة أول أوردر"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={14} /> أوردر جديد</button>}
              />
            </Card>
          ) : (
            silkscreenOrders.map(o => (
              <motion.div
                key={o.id}
                className="card p-4 border-navy/20 hover:border-white/10 transition-colors"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm">{o.printingUnit || '—'}</span>
                      <Badge variant="navy">{o.orderNumber}</Badge>
                      <Badge variant="muted">{o.date}</Badge>
                    </div>
                    <p className="text-xs text-white/35">{o.totalPieces} قطعة · {o.numColors} لون</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div><p className="text-[10px] text-white/30">تكلفة الطباعة للقطعة</p><p className="num text-sm font-bold text-white/80">{fmt(o.printCostPerPiece)} {cur}</p></div>
                      <div><p className="text-[10px] text-white/30">سعر أجر الطباعة (للقطعة)</p><p className="num text-sm font-bold text-gold">{fmt(o.suggestedPrice)} {cur}</p></div>
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

      {/* ── FORM ── */}
      {view === 'form' && (
        <div className="space-y-4">
          {/* Print area */}
          {/* Print area */}
          <InvoiceTemplate
            ref={printRef}
            title="فاتورة طلب سيلك سكرين"
            orderNumber={order.orderNumber}
            date={order.date}
            clientName={clients.find(c => c.id === order.clientId)?.name || order.printingUnit}
            clientPhone={clients.find(c => c.id === order.clientId)?.phone}
            items={[
              { label: 'المنتج المستلم للطباعة', value: order.itemDescription || '—' },
              { label: 'مواضع الطباعة', value: order.printLocations || '—' },
              { label: 'العدد الإجمالي للقطع', value: `${order.totalPieces} قطعة` },
              { label: 'عدد ألوان الطباعة', value: `${order.numColors} لون` },
              printOpts.showInternalCosts && { label: 'تكلفة الطباعة للمصنع (سرية)', value: `${fmt(res.totalOrderCost || 0)} ${cur}` },
              printOpts.showPiecePrice && { label: 'أجر الطباعة للقطعة الواحدة', value: `${fmt(res.suggestedPrice || 0)} ${cur}` },
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
            <h4 className="text-sm font-bold text-gold mb-3 flex items-center gap-2"><PrinterIcon size={16} /> إعدادات عرض الفاتورة للطباعة</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showImage} onChange={e => setPrintOpts(p => ({ ...p, showImage: e.target.checked }))} className="accent-gold" />
                عرض التصميم / الموديل
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showPiecePrice} onChange={e => setPrintOpts(p => ({ ...p, showPiecePrice: e.target.checked }))} className="accent-gold" />
                عرض أجر القطعة الواحدة
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={printOpts.showTotalPrice} onChange={e => setPrintOpts(p => ({ ...p, showTotalPrice: e.target.checked }))} className="accent-gold" />
                عرض الإجمالي العام
              </label>
              <label className="flex items-center gap-2 text-sm text-red-400 cursor-pointer">
                <input type="checkbox" checked={printOpts.showInternalCosts} onChange={e => setPrintOpts(p => ({ ...p, showInternalCosts: e.target.checked }))} className="accent-red-500" />
                عرض تكلفة المصنع الداخلية (للاستخدام الداخلي فقط)
              </label>
            </div>
          </Card>

          {/* Basic */}
          <FormSection title="البيانات الأساسية" icon={<PrinterIcon size={14} />} collapsible={false}>
            <Grid cols={3}>
              <Select
                label="اختر العميل"
                options={[{ value: '', label: 'بدون عميل محدد' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                value={order.clientId || ''}
                onChange={e => set('clientId', e.target.value)}
              />
              <Input label="رقم الأوردر" value={order.orderNumber} onChange={e => set('orderNumber', e.target.value)} placeholder="SLK-001" />
              <Input label="المطبعة / الوحدة" value={order.printingUnit} onChange={e => set('printingUnit', e.target.value)} placeholder="اسم العميل" />
              <Input label="تاريخ الأوردر" type="date" value={order.date} onChange={e => set('date', e.target.value)} />
            </Grid>
            <Grid cols={3}>
              <Input label="عدد القطع" type="number" value={order.totalPieces || ''} onChange={e => set('totalPieces', +e.target.value)} suffix="قطعة" placeholder="0" />
              <Input label="عدد الألوان" type="number" value={order.numColors || ''} onChange={e => set('numColors', +e.target.value)} suffix="لون" placeholder="1" />
              <Input label="العربون المُسدد (نقدي)" type="number" value={order.paidAmount || ''} onChange={e => set('paidAmount', +e.target.value)} suffix={cur} placeholder="0" hint="سيتم إضافته لدفتر العميل كدفعة" />
            </Grid>
          </FormSection>

          {/* Items From Client */}
          <FormSection title="المنتجات المستلمة للطباعة (من العميل)" icon={<span>📦</span>}>
            <Grid cols={3}>
              <Input label="وصف المنتج" value={order.itemDescription || ''} onChange={e => set('itemDescription', e.target.value)} placeholder="مثال: تيشرت بولو أبيض" />
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

          {/* Screens */}
          <FormSection title="الشاشات والكيماويات" icon={<span>🖼️</span>}>
            <Grid cols={2}>
              <Input label="سعر الشاشة" type="number" value={order.screenPrice || ''} onChange={e => set('screenPrice', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="عمر الشاشة (أوردرات)" type="number" value={order.screenLifeOrders || ''} onChange={e => set('screenLifeOrders', +e.target.value)} suffix="أوردر" placeholder="1" />
              <Input label="تكلفة إيمولجن واحد" type="number" value={order.emulsionCostPerScreen || ''} onChange={e => set('emulsionCostPerScreen', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="تكلفة مزيل الإيمولجن" type="number" value={order.emulsionRemoverCost || ''} onChange={e => set('emulsionRemoverCost', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="تكلفة التنر" type="number" value={order.thinnerCost || ''} onChange={e => set('thinnerCost', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          {/* Ink */}
          <FormSection title="الحبر والطلاء" icon={<span>🎨</span>}>
            <Grid cols={2}>
              <Select label="نوع الحبر" options={inkTypes} value={order.inkType} onChange={e => set('inkType', e.target.value)} />
              <Input label="سعر كيلو الحبر" type="number" value={order.inkPricePerKg || ''} onChange={e => set('inkPricePerKg', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="استهلاك الحبر لكل 100 قطعة" type="number" value={order.inkConsumptionPer100 || ''} onChange={e => set('inkConsumptionPer100', +e.target.value)} suffix="كجم/100 قطعة" placeholder="0" />
            </Grid>
          </FormSection>

          {/* Energy */}
          <FormSection title="الكهرباء والطاقة" icon={<span>⚡</span>}>
            <Grid cols={2}>
              <Input label="استهلاك الفرن/التجفيف" type="number" value={order.ovenKw || ''} onChange={e => set('ovenKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
              <Input label="سعر الكيلوواط" type="number" value={order.electricityPricePerKw || ''} onChange={e => set('electricityPricePerKw', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="ساعات التشغيل يومياً" type="number" value={order.operatingHours || ''} onChange={e => set('operatingHours', +e.target.value)} suffix="ساعة" placeholder="0" />
              <Input label="تكلفة الغاز/الوقود" type="number" value={order.gasOrFuelCost || ''} onChange={e => set('gasOrFuelCost', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          {/* Labor */}
          <FormSection title="العمالة والأيام" icon={<span>👷</span>}>
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <p className="label">الوظيفة</p>
              <p className="label">العدد</p>
              <p className="label">اليومية ({cur})</p>
            </div>
            {[
              { l: 'طباعة', ck: 'printWorkers' as keyof SilkscreenOrder, dk: 'printWorkerDaily' as keyof SilkscreenOrder },
              { l: 'تحضير شاشات', ck: 'screenPrepWorkers' as keyof SilkscreenOrder, dk: 'screenPrepDaily' as keyof SilkscreenOrder },
              { l: 'تثبيت/كي', ck: 'fixingWorkers' as keyof SilkscreenOrder, dk: 'fixingDaily' as keyof SilkscreenOrder },
              { l: 'مراقبة جودة', ck: 'qcWorkers' as keyof SilkscreenOrder, dk: 'qcDaily' as keyof SilkscreenOrder },
              { l: 'تعبئة وتغليف', ck: 'packagingWorkers' as keyof SilkscreenOrder, dk: 'packagingDaily' as keyof SilkscreenOrder },
            ].map(({ l, ck, dk }) => (
              <div key={l} className="grid grid-cols-3 gap-3 mb-2 items-center">
                <span className="text-xs text-white/50">{l}</span>
                <input type="number" className="input text-center" placeholder="0"
                  value={(order[ck] as number) || ''}
                  onChange={e => set(ck, +e.target.value)} />
                <input type="number" className="input text-center" placeholder="0"
                  value={(order[dk] as number) || ''}
                  onChange={e => set(dk, +e.target.value)} />
              </div>
            ))}
            <Divider />
            <Grid cols={2}>
              <Input label="عدد أيام الأوردر" type="number" value={order.orderDays || ''} onChange={e => set('orderDays', +e.target.value)} suffix="يوم" placeholder="1" />
              <Input label="ساعات أوفر تايم" type="number" value={order.overtimeHours || ''} onChange={e => set('overtimeHours', +e.target.value)} suffix="ساعة" placeholder="0" />
              <Input label="أجر ساعة الأوفر تايم" type="number" value={order.overtimeRate || ''} onChange={e => set('overtimeRate', +e.target.value)} suffix={cur} placeholder="0" />
            </Grid>
          </FormSection>

          {/* Expenses & Margin */}
          <FormSection title="المصاريف العامة وهامش الربح" icon={<span>🏢</span>}>
            <Grid cols={2}>
              <Input label="الإيجار (عن الأوردر)" type="number" value={order.rent || ''} onChange={e => set('rent', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="صيانة المعدات" type="number" value={order.maintenance || ''} onChange={e => set('maintenance', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="الشحن والتوصيل" type="number" value={order.shipping || ''} onChange={e => set('shipping', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="تغليف وكرتون" type="number" value={order.packaging || ''} onChange={e => set('packaging', +e.target.value)} suffix={cur} placeholder="0" />
              <Input label="ضريبة القيمة المضافة" type="number" value={order.taxRate || ''} onChange={e => set('taxRate', +e.target.value)} suffix="%" placeholder="0" />
              <Input label="هامش الربح المطلوب" type="number" value={order.profitMargin || ''} onChange={e => set('profitMargin', +e.target.value)} suffix="%" placeholder="25" />
            </Grid>
          </FormSection>

          {/* Results */}
          <ResultsPanel title="نتائج الحسابات (أجر الطباعة فقط)" visible={hasResults}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <MetricCard label="تكلفة الطباعة للقطعة" value={`${fmt(res.printCostPerPiece || 0)} ${cur}`} variant="navy" />
              <MetricCard label="أجر الطباعة المقترح" value={`${fmt(res.suggestedPrice || 0)} ${cur}`} variant="gold" />
              <MetricCard label="الإجمالي المطلوب" value={`${fmt(res.suggestedTotalPrice || 0)} ${cur}`} variant="success" />
              <MetricCard label="نسبة الربح" value={`${fmt(res.profitPercent || 0, 1)}%`} variant="default" />
            </div>
            <div className="space-y-0.5">
              <ResultRow label="تكلفة الشاشات والكيماويات" value={`${fmt(res.screenCost || 0)} ${cur}`} />
              <ResultRow label="تكلفة الحبر" value={`${fmt(res.inkCost || 0)} ${cur}`} />
              <ResultRow label="تكلفة الكهرباء" value={`${fmt(res.electricityCost || 0)} ${cur}`} />
              <ResultRow label="تكلفة العمالة" value={`${fmt(res.laborCost || 0)} ${cur}`} />
              <ResultRow label="مصاريف أخرى" value={`${fmt(res.otherCost || 0)} ${cur}`} />
              <Divider gold />
              <ResultRow label="إجمالي تكلفة المصنع (الداخلية)" value={`${fmt(res.totalOrderCost || 0)} ${cur}`} highlight="navy" bold />
              <ResultRow label="تكلفة الطباعة للقطعة الواحدة" value={`${fmt(res.printCostPerPiece || 0)} ${cur}`} highlight="navy" bold />
              <ResultRow label="أجر الطباعة المقترح للقطعة" value={`${fmt(res.suggestedPrice || 0)} ${cur}`} highlight="gold" bold />
              <ResultRow label="الإجمالي المطلوب تحصيله" value={`${fmt(res.suggestedTotalPrice || 0)} ${cur}`} highlight="success" bold />
              <ResultRow label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} highlight="success" bold />
            </div>
          </ResultsPanel>

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <button className="btn-ghost" onClick={handlePrint}><FileText size={14} /> طباعة</button>
            <button className="btn-gold" onClick={handleSave}><Save size={14} /> {editId ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف"
        footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDelete}>حذف</button></>}>
        <p className="text-sm text-white/70">هل تريد حذف هذا الأوردر؟ لا يمكن التراجع.</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default PrintSilkscreen
