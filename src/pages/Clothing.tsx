import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Shirt, Save, Plus, Trash2, FileText, ChevronDown, ChevronUp, Search, Printer, List } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { useClientsStore } from '../store/useClientsStore'
import { useProductionStore } from '../store/useProductionStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import type { ClothingOrder } from '../store/useOrdersStore'
import { calcClothing, fmt, generateId, todayISO, n } from '../utils/calculations'
import { Input, Select, Grid, ResultRow, StatCard, PageHeader, Toast, EmptyState, Modal, Card, Badge } from '../components/ui'
import { ClothingOrderTemplate, ClothingListTemplate } from '../components/ui/ClothingPrintTemplate'

const productTypes = [
  { value: 'tshirt', label: 'تيشيرت' }, { value: 'pants', label: 'بنطلون' },
  { value: 'jacket', label: 'جاكيت' }, { value: 'dress', label: 'فستان' },
  { value: 'shirt', label: 'قميص' }, { value: 'other', label: 'أخرى' },
]

const initOrder = (): ClothingOrder => ({
  id: generateId(), date: todayISO(), orderNumber: '', factoryName: '', productType: 'tshirt',
  clientId: '', paidAmount: 0, status: 'pending', isCMT: true, modelId: '', productionStyle: 'stages',
  fabricType: '', fabricWeightGsm: 0, fabricPricePerMeter: 0, fabricPerPieceMeters: 0, wastePercent: 3,
  threadPricePerBobbin: 0, threadConsumptionPerPiece: 0, buttonZipperCost: 0, liningCost: 0,
  numSewingMachines: 0, machineRatePerDay: 0, sewingTimePerPieceMins: 0, dailyProductionCapacity: 0,
  totalWorkshopKw: 0, electricityPricePerKw: 0, operatingHours: 0,
  cutters: 0, cutterDaily: 0, sewers: 0, sewerDaily: 0, finishers: 0, finisherDaily: 0,
  qcWorkers: 0, qcWorkerDaily: 0, packagingWorkers: 0, packagingWorkerDaily: 0,
  admins: 0, adminDaily: 0, orderDays: 1,
  monthlyRent: 0, monthlyMaintenance: 0, waterCost: 0,
  cardboardPackaging: 0, shippingCost: 0, profitMargin: 30, totalPieces: 0,
  fabricCostPerPiece: 0, accessoriesCostPerPiece: 0, laborCostPerPiece: 0,
  energyCostPerPiece: 0, machineCostPerPiece: 0, fixedCostPerPiece: 0, totalCostPerPiece: 0,
  totalOrderCost: 0, wholesalePrice: 0, retailPrice: 0, breakEvenUnits: 0, netProfit: 0,
})

const ClothingPage: React.FC = () => {
  const { settings } = useSettingsStore()
  const { clothingOrders, saveClothing, deleteClothing, clearClothing } = useOrdersStore()
  const { clients } = useClientsStore()
  const { models: productionModels } = useProductionStore()
  
  const [order, setOrder] = useState<ClothingOrder>(initOrder())
  const [results, setResults] = useState<Partial<ClothingOrder>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    fabric: true, accessories: true, machines: true, energy: true, labor: true, fixed: true, expenses: true
  })
  
  const printRef = useRef<HTMLDivElement>(null)
  const listPrintRef = useRef<HTMLDivElement>(null)
  const [printingOrder, setPrintingOrder] = useState<ClothingOrder | null>(null)

  const handlePrint = useReactToPrint({ contentRef: printRef })
  const handlePrintList = useReactToPrint({ contentRef: listPrintRef })

  useEffect(() => { 
    if (order.isCMT) {
      if (order.productionStyle === 'stages' && order.modelId) {
        const model = productionModels.find(m => m.id === order.modelId)
        if (model) {
          let piasters = 0
          model.stages.forEach(s => piasters += s.pricePiastres)
          const costPerPiece = piasters / 100
          setOrder(prev => ({ ...prev, laborCostPerPiece: costPerPiece }))
        }
      } else if (order.productionStyle === 'whole') {
        setOrder(prev => ({ ...prev, laborCostPerPiece: prev.wholePieceLaborCost || 0 }))
      }
    }
    setResults(calcClothing(order)) 
  }, [order.isCMT, order.productionStyle, order.modelId, order.wholePieceLaborCost, productionModels])

  const set = (field: keyof ClothingOrder, value: string | number | boolean) =>
    setOrder(prev => ({ ...prev, [field]: value }))
  
  const toggle = (k: string) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  const handleSave = () => {
    if (!order.factoryName.trim() && !order.clientId) { setToast({ msg: 'يرجى إدخال اسم المصنع أو العميل', type: 'error' }); return }
    if (n(order.totalPieces) <= 0) { setToast({ msg: 'يرجى إدخال عدد القطع', type: 'error' }); return }
    
    const suggestedPrice = (results.wholesalePrice || 0) * (order.totalPieces || 1)
    const paid = order.paidAmount || 0
    const remaining = suggestedPrice - paid
    
    saveClothing({ ...order, ...results, remainingAmount: remaining })

    // Financial Transactions (only for NEW orders to avoid duplicates on edit, 
    // or you can add logic to check if transaction exists)
    if (!editingId) {
        if (order.clientId) {
          useClientsStore.getState().addTransaction({
            clientId: order.clientId,
            orderId: order.id,
            amount: suggestedPrice,
            type: 'debt',
            notes: `أوردر تصنيع ملابس رقم ${order.orderNumber}`
          })
          if (paid > 0) {
            useClientsStore.getState().addTransaction({
              clientId: order.clientId,
              orderId: order.id,
              amount: paid,
              type: 'payment',
              notes: `عربون أوردر ملابس رقم ${order.orderNumber}`
            })
            useTreasuryStore.getState().addTransaction({
              amount: paid,
              type: 'income_client',
              isIncome: true,
              notes: `عربون أوردر ملابس رقم ${order.orderNumber}`,
              referenceId: order.clientId
            })
          }
        } else if (paid > 0) {
          useTreasuryStore.getState().addTransaction({
            amount: paid,
            type: 'income_client',
            isIncome: true,
            notes: `عربون أوردر ملابس رقم ${order.orderNumber} (نقدي)`
          })
        }
    }

    setToast({ msg: 'تم حفظ الأوردر وتحديث السجلات بنجاح ✓', type: 'success' })
    setEditingId(null); setShowList(true)
  }

  const handleEdit = (o: ClothingOrder) => { setOrder(o); setEditingId(o.id); setShowList(false); window.scrollTo(0, 0) }
  
  const handleNew = () => { 
    const nextNum = `CLT-${String(clothingOrders.length + 1).padStart(3, '0')}`
    setOrder({ ...initOrder(), orderNumber: nextNum })
    setEditingId(null)
    setShowList(false)
    window.scrollTo(0, 0) 
  }

  const handleExternalPrint = (o: ClothingOrder) => {
    setPrintingOrder(o)
    setTimeout(() => {
      handlePrint()
    }, 150)
  }

  const filteredOrders = clothingOrders.filter(o => {
    const client = clients.find(c => c.id === o.clientId)
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.factoryName || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = () => { 
    if (deleteId) { 
      deleteClothing(deleteId); 
      setDeleteId(null); 
      setToast({ msg: 'تم حذف أوردر الملابس وتحديث مديونية العميل بنجاح ✓', type: 'error' }) 
    } 
  }

  const cur = settings.currencySymbol || settings.currency || 'جنيه'
  const res = results

  const SH: React.FC<{ title: string; k: string; icon: string }> = ({ title, k, icon }) => (
    <button className="w-full flex items-center gap-2 mb-3" onClick={() => toggle(k)}>
      <span>{icon}</span>
      <span className="section-title flex-1 mb-0 border-0 pb-0">{title}</span>
      {expanded[k] ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
    </button>
  )

  return (
    <div className="space-y-5">
      {/* ── Hidden professional print templates ── */}
      <div style={{ display: 'none' }}>
        {/* Single order print */}
        <ClothingOrderTemplate
          ref={printRef}
          order={printingOrder || order}
          clientName={clients.find(c => c.id === (printingOrder || order).clientId)?.name}
          currency={cur}
        />
        {/* List report print */}
        <ClothingListTemplate
          ref={listPrintRef}
          orders={filteredOrders}
          clients={clients}
          currency={cur}
          filterLabel={statusFilter !== 'all' ? (statusFilter === 'pending' ? 'جديد' : statusFilter === 'processing' ? 'تحت التنفيذ' : statusFilter === 'delivered' ? 'مكتمل' : 'ملغي') : undefined}
        />
      </div>

      <PageHeader
        title="ورش ومصانع الملابس"
        subtitle={`${clothingOrders.length} أوردر محفوظ`}
        icon={<Shirt size={20} />}
        actions={
          <div className="flex gap-2">
            {showList && clothingOrders.length > 0 && (
              <>
                <button className="btn-ghost" onClick={() => handlePrintList()}>
                  <List size={16} /> طباعة الكشف الاحترافي
                </button>
                <button className="btn-ghost text-danger border-danger/30 hover:bg-danger/10" onClick={() => setShowClearModal(true)}>
                  <Trash2 size={16} /> مسح الكل
                </button>
              </>
            )}
            {!showList && <button className="btn-ghost" onClick={() => { setShowList(true); setEditingId(null) }}>القائمة</button>}
            <button className="btn-gold" onClick={handleNew}><Plus size={16} /> أوردر جديد</button>
          </div>
        }
      />

      {showList ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-2 print:hidden">
            <Input 
              prefix={<Search size={14} />} 
              placeholder="ابحث برقم الأوردر أو اسم العميل..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select
              options={[
                { value: 'all', label: 'كل الحالات' },
                { value: 'pending', label: 'جديد' },
                { value: 'processing', label: 'تحت التنفيذ' },
                { value: 'delivered', label: 'مكتمل' },
                { value: 'canceled', label: 'ملغي' },
              ]}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="md:w-48"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <Card className="p-10">
              <EmptyState
                icon={<Shirt size={28} />}
                title="لا توجد نتائج"
                description="لم يتم العثور على أوردرات ملابس تطابق البحث"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={16} /> أوردر جديد</button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(o => (
                <div key={o.id} className="bank-card p-4 rounded-3xl hover:border-success/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white">{o.orderNumber}</span>
                        <span className="text-muted">|</span>
                        <span className="font-bold text-success">
                          {clients.find(c => c.id === o.clientId)?.name || o.factoryName || '—'}
                        </span>
                        <Badge variant="success">{productTypes.find(p => p.value === o.productType)?.label || o.productType}</Badge>
                        <Badge variant={
                          o.status === 'delivered' ? 'success' : 
                          o.status === 'canceled' ? 'danger' : 
                          o.status === 'processing' ? 'gold' : 'muted'
                        }>
                          {o.status === 'pending' ? 'جديد' : 
                           o.status === 'processing' ? 'تحت التنفيذ' : 
                           o.status === 'delivered' ? 'مكتمل' : 
                           o.status === 'canceled' ? 'ملغي' : 'غير محدد'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">{o.date} · {o.totalPieces} قطعة</p>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <div>
                          <p className="text-xs text-muted">إجمالي الأوردر</p>
                          <p className="num text-sm font-bold text-white">{fmt(o.totalOrderCost)} {cur}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">المدفوع</p>
                          <p className="num text-sm font-bold text-success">{fmt(o.paidAmount || 0)} {cur}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">المتبقي</p>
                          <p className="num text-sm font-bold text-danger">{fmt((o.totalOrderCost || 0) - (o.paidAmount || 0))} {cur}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mr-3 flex-shrink-0">
                      <button className="btn-ghost px-3 py-2 text-xs" onClick={() => handleEdit(o)}>
                        تعديل
                      </button>
                      <button 
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold transition-colors text-xs font-bold"
                        onClick={() => handleExternalPrint(o)}
                        title="طباعة فاتورة احترافية"
                      >
                        <Printer size={13} /> فاتورة
                      </button>
                      <button
                        className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                        onClick={() => setDeleteId(o.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Order Form ── */}
          {/* Basic Info */}
          <div className="bank-card p-5 rounded-3xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h3 className="section-title mb-0 border-0 pb-0">البيانات الأساسية</h3>
              <Badge variant="success" className="text-sm px-3">{order.orderNumber}</Badge>
            </div>
            <Grid cols={2}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/60 block mb-1">العميل</label>
                <div className="flex items-center gap-2">
                  <select 
                    className="bank-input flex-1"
                    value={order.clientId || ''}
                    onChange={e => set('clientId', e.target.value)}
                  >
                    <option value="">-- اختر العميل --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {order.clientId && clients.find(c => c.id === order.clientId)?.balance !== 0 && (
                    <Badge variant={clients.find(c => c.id === order.clientId)!.balance < 0 ? 'danger' : 'success'}>
                      {fmt(Math.abs(clients.find(c => c.id === order.clientId)!.balance))} {cur}
                    </Badge>
                  )}
                </div>
              </div>
              <Select 
                label="حالة الأوردر"
                options={[
                  { value: 'pending', label: 'جديد' },
                  { value: 'processing', label: 'تحت التنفيذ' },
                  { value: 'delivered', label: 'مكتمل' },
                  { value: 'canceled', label: 'ملغي' },
                ]}
                value={order.status || 'pending'}
                onChange={e => set('status', e.target.value)}
              />
              <Input label="اسم المصنع / الورشة" value={order.factoryName} onChange={e => set('factoryName', e.target.value)} placeholder="اسم المصنع" />
              <Select label="نوع المنتج" options={productTypes} value={order.productType} onChange={e => set('productType', e.target.value)} />
              
              <div className="space-y-1 col-span-2 md:col-span-1 border border-gold/30 bg-gold/5 p-2 rounded-lg">
                <label className="text-xs font-bold text-gold block mb-1">نوع التعاقد والتصنيع</label>
                <div className="flex gap-2">
                  <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${order.isCMT ? 'bg-gold text-slate-900' : 'bg-[#0a101d] text-white/50 border border-white/10'}`} onClick={() => set('isCMT', true)}>
                    تصنيع للغير (مصنعية فقط)
                  </button>
                  <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${!order.isCMT ? 'bg-blue-500 text-white' : 'bg-[#0a101d] text-white/50 border border-white/10'}`} onClick={() => set('isCMT', false)}>
                    تصنيع شامل (بنجيب الخامات)
                  </button>
                </div>
              </div>

              {order.isCMT && (
                <div className="col-span-2 space-y-3 border border-success/30 bg-success/5 p-3 rounded-xl">
                  <div className="flex gap-2 mb-2">
                    <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${order.productionStyle !== 'whole' ? 'bg-success text-slate-900' : 'bg-white/5 text-white/50 border border-white/10'}`} onClick={() => set('productionStyle', 'stages')}>
                      تسعير إنتاج مراحل (من مخطط العمليات)
                    </button>
                    <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${order.productionStyle === 'whole' ? 'bg-success text-slate-900' : 'bg-white/5 text-white/50 border border-white/10'}`} onClick={() => set('productionStyle', 'whole')}>
                      تسعير إنتاج حتة كاملة
                    </button>
                  </div>
                  
                  {order.productionStyle !== 'whole' ? (
                    <div>
                      <label className="text-xs font-bold text-success block mb-1">الربط بمخطط العمليات الذكي</label>
                      <select className="bank-input w-full text-success font-bold" value={order.modelId || ''} onChange={e => set('modelId', e.target.value)}>
                        <option value="">-- اختر موديل لربط أجور الصنايعية --</option>
                        {productionModels.map(m => (
                          <option key={m.id} value={m.id}>{m.modelNumber} - {m.modelType}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <Input label="أجر الصنايعي للقطعة كاملة" type="number" value={order.wholePieceLaborCost || ''} onChange={e => set('wholePieceLaborCost', +e.target.value)} suffix={cur} placeholder="0" />
                    </div>
                  )}
                </div>
              )}

              <Input label="تاريخ الأوردر" type="date" value={order.date} onChange={e => set('date', e.target.value)} />
              <Input label="عدد القطع الكلي" type="number" value={order.totalPieces || ''} onChange={e => set('totalPieces', +e.target.value)} suffix="قطعة" placeholder="0" />
              <Input label="عدد أيام الأوردر" type="number" value={order.orderDays || ''} onChange={e => set('orderDays', +e.target.value)} suffix="يوم" placeholder="1" />
              <div className="space-y-1">
                <Input label="المبلغ المدفوع مقدماً (عربون)" type="number" value={order.paidAmount || ''} onChange={e => set('paidAmount', +e.target.value)} suffix={cur} placeholder="0" />
                <p className="text-[10px] text-muted pr-2">
                  المتبقي: <span className="num font-bold text-danger">{fmt(n(res.totalOrderCost) - n(order.paidAmount))}</span> {cur}
                </p>
              </div>
            </Grid>
          </div>

          {/* Fabric */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="الخامة والقماش" k="fabric" icon="🧵" />
            {expanded.fabric && (
              <Grid cols={2}>
                <Input label="نوع القماش" value={order.fabricType} onChange={e => set('fabricType', e.target.value)} placeholder="مثال: قطن 180 جم" />
                <Input label="وزن القماش (جم/م²)" type="number" value={order.fabricWeightGsm || ''} onChange={e => set('fabricWeightGsm', +e.target.value)} suffix="جم/م²" placeholder="0" />
                <Input label="سعر المتر" type="number" value={order.fabricPricePerMeter || ''} onChange={e => set('fabricPricePerMeter', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="استهلاك القماش للقطعة" type="number" value={order.fabricPerPieceMeters || ''} onChange={e => set('fabricPerPieceMeters', +e.target.value)} suffix="متر" placeholder="0" />
                <Input label="نسبة الهالك" type="number" value={order.wastePercent || ''} onChange={e => set('wastePercent', +e.target.value)} suffix="%" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Accessories */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="الخيط والإكسسوار" k="accessories" icon="🪡" />
            {expanded.accessories && (
              <Grid cols={2}>
                <Input label="سعر بكرة الخيط" type="number" value={order.threadPricePerBobbin || ''} onChange={e => set('threadPricePerBobbin', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="استهلاك الخيط للقطعة (بكرة)" type="number" value={order.threadConsumptionPerPiece || ''} onChange={e => set('threadConsumptionPerPiece', +e.target.value)} suffix="بكرة" placeholder="0" />
                <Input label="أزرار / سحابات / إكسسوار" type="number" value={order.buttonZipperCost || ''} onChange={e => set('buttonZipperCost', +e.target.value)} suffix={cur} placeholder="0" hint="للقطعة الواحدة" />
                <Input label="تكلفة البطانة والإستفنا" type="number" value={order.liningCost || ''} onChange={e => set('liningCost', +e.target.value)} suffix={cur} placeholder="0" hint="للقطعة الواحدة" />
              </Grid>
            )}
          </div>

          {/* Machines */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="خطوط الإنتاج والماكينات" k="machines" icon="⚙️" />
            {expanded.machines && (
              <Grid cols={2}>
                <Input label="عدد ماكينات الخياطة" type="number" value={order.numSewingMachines || ''} onChange={e => set('numSewingMachines', +e.target.value)} suffix="ماكينة" placeholder="0" />
                <Input label="أجر الماكينة يومية" type="number" value={order.machineRatePerDay || ''} onChange={e => set('machineRatePerDay', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="وقت خياطة القطعة" type="number" value={order.sewingTimePerPieceMins || ''} onChange={e => set('sewingTimePerPieceMins', +e.target.value)} suffix="دقيقة" placeholder="0" />
                <Input label="طاقة الإنتاج اليومية" type="number" value={order.dailyProductionCapacity || ''} onChange={e => set('dailyProductionCapacity', +e.target.value)} suffix="قطعة/يوم" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Energy */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="الكهرباء والطاقة" k="energy" icon="⚡" />
            {expanded.energy && (
              <Grid cols={2}>
                <Input label="استهلاك الكهرباء الكلي للورشة" type="number" value={order.totalWorkshopKw || ''} onChange={e => set('totalWorkshopKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
                <Input label="سعر الكيلوواط" type="number" value={order.electricityPricePerKw || ''} onChange={e => set('electricityPricePerKw', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="ساعات التشغيل يومياً" type="number" value={order.operatingHours || ''} onChange={e => set('operatingHours', +e.target.value)} suffix="ساعة" placeholder="0" />
                <Input label="تكلفة المياه" type="number" value={order.waterCost || ''} onChange={e => set('waterCost', +e.target.value)} suffix={cur} placeholder="0" hint="إجمالي للأوردر" />
              </Grid>
            )}
          </div>

          {/* Labor */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title={order.isCMT ? "العمالة (مرتبطة بمخطط العمليات)" : "العمالة التفصيلية"} k="labor" icon="👷" />
            {expanded.labor && (
              <>
                {order.isCMT ? (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-xl mb-4 text-center">
                    <p className="text-sm font-bold text-success mb-2">
                      {order.productionStyle === 'whole' 
                        ? 'أجر الصنايعي (إنتاج حتة كاملة) تم تحديده'
                        : 'تم سحب أجور الصنايعية تلقائياً من مخطط العمليات (مراحل)'}
                    </p>
                    <p className="text-xs text-white/60">إجمالي الأجر للقطعة: {fmt(order.laborCostPerPiece || 0)} {cur}</p>
                    <p className="text-xs text-white/60 mt-1">يمكنك إضافة عمالة يومية إضافية بالأسفل إن وجدت.</p>
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <span className="text-xs text-gold font-semibold">الوظيفة</span>
                  <span className="text-xs text-gold font-semibold text-center">العدد</span>
                  <span className="text-xs text-gold font-semibold text-center">يومية ({cur})</span>
                </div>
                {[
                  { label: 'قصاصين', ck: 'cutters' as keyof ClothingOrder, dk: 'cutterDaily' as keyof ClothingOrder },
                  { label: 'خياطين', ck: 'sewers' as keyof ClothingOrder, dk: 'sewerDaily' as keyof ClothingOrder },
                  { label: 'تشطيب وكي', ck: 'finishers' as keyof ClothingOrder, dk: 'finisherDaily' as keyof ClothingOrder },
                  { label: 'مراقبة جودة', ck: 'qcWorkers' as keyof ClothingOrder, dk: 'qcWorkerDaily' as keyof ClothingOrder },
                  { label: 'تعبئة وتغليف', ck: 'packagingWorkers' as keyof ClothingOrder, dk: 'packagingWorkerDaily' as keyof ClothingOrder },
                  { label: 'إداريين', ck: 'admins' as keyof ClothingOrder, dk: 'adminDaily' as keyof ClothingOrder },
                ].map(({ label, ck, dk }) => (
                  <div key={label} className="grid grid-cols-3 gap-3 mb-2 items-center">
                    <span className="text-xs text-white/70">{label}</span>
                    <input type="number" className="bank-input text-center" placeholder="0"
                      value={(order[ck] as number) || ''}
                      onChange={e => set(ck, +e.target.value)} />
                    <input type="number" className="bank-input text-center" placeholder="0"
                      value={(order[dk] as number) || ''}
                      onChange={e => set(dk, +e.target.value)} />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Fixed & Expenses */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="تكاليف ثابتة ومصاريف" k="expenses" icon="🏢" />
            {expanded.expenses && (
              <Grid cols={2}>
                <Input label="إيجار الورشة (شهرياً)" type="number" value={order.monthlyRent || ''} onChange={e => set('monthlyRent', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="صيانة المعدات (شهرياً)" type="number" value={order.monthlyMaintenance || ''} onChange={e => set('monthlyMaintenance', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تكلفة الكرتون والتعبئة" type="number" value={order.cardboardPackaging || ''} onChange={e => set('cardboardPackaging', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="رسوم الشحن" type="number" value={order.shippingCost || ''} onChange={e => set('shippingCost', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="هامش الربح" type="number" value={order.profitMargin || ''} onChange={e => set('profitMargin', +e.target.value)} suffix="%" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Results */}
          {n(order.totalPieces) > 0 && (
            <div className="bank-card-gold p-5 rounded-3xl animate-scale-in">
              <h3 className="text-base font-bold text-gold mb-4">📊 نتائج حسابات ورشة الملابس</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="تكلفة القطعة" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} variant="navy" />
                <StatCard label="سعر الجملة" value={`${fmt(res.wholesalePrice || 0)} ${cur}`} variant="gold" />
                <StatCard label="سعر التجزئة" value={`${fmt(res.retailPrice || 0)} ${cur}`} variant="default" />
                <StatCard label="نقطة التعادل" value={`${res.breakEvenUnits || 0} قطعة`} variant="success" />
              </div>
              <div className="space-y-1">
                <ResultRow label="تكلفة الخامة للقطعة" value={`${fmt(res.fabricCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة الإكسسوار للقطعة" value={`${fmt(res.accessoriesCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة العمالة للقطعة" value={`${fmt(res.laborCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة الكهرباء للقطعة" value={`${fmt(res.energyCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="التكلفة الثابتة للقطعة" value={`${fmt(res.fixedCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="إجمالي تكلفة القطعة" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} highlight variant="navy" />
                <ResultRow label="إجمالي تكلفة الأوردر" value={`${fmt(res.totalOrderCost || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="سعر البيع بالجملة" value={`${fmt(res.wholesalePrice || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="سعر البيع بالتجزئة" value={`${fmt(res.retailPrice || 0)} ${cur}`} highlight variant="default" />
                <ResultRow label="نقطة التعادل (Break Even)" value={`${res.breakEvenUnits || 0} قطعة`} highlight variant="default" />
                <ResultRow label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} highlight variant="success" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <button className="btn-ghost" onClick={() => { setPrintingOrder(null); setTimeout(handlePrint, 100) }}>
              <Printer size={16} /> طباعة فاتورة احترافية
            </button>
            <button className="btn-gold" onClick={handleSave}><Save size={16} /> {editingId ? 'تحديث' : 'حفظ الأوردر'}</button>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف"
        footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDelete}>حذف</button></>}>
        <div className="space-y-3">
          <p className="text-white text-sm font-bold">هل أنت متأكد من حذف هذا الأوردر نهائياً؟</p>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 leading-relaxed">
              ⚠️ تحذير: سيتم حذف قيمة الأوردر من مديونية العميل. إذا كان العميل قد دفع عربوناً، سيبقى العربون في حسابه كرصيد دائن.
            </p>
          </div>
        </div>
      </Modal>

      <Modal open={showClearModal} onClose={() => setShowClearModal(false)} title="تأكيد مسح جميع الأوردرات"
        footer={<><button className="btn-ghost" onClick={() => setShowClearModal(false)}>إلغاء</button><button className="btn-danger" onClick={() => { clearClothing(); setShowClearModal(false); setToast({ msg: 'تم مسح جميع أوردرات الملابس بنجاح', type: 'error' }) }}>نعم، امسح الكل</button></>}>
        <p className="text-white text-sm">سيتم حذف جميع أوردرات الملابس نهائياً. هل أنت متأكد؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ClothingPage
