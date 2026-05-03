import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Zap, Save, Plus, Trash2, FileText, ChevronDown, ChevronUp, Search, Printer } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { useClientsStore } from '../store/useClientsStore'
import type { DTFOrder } from '../store/useOrdersStore'
import { calcDTF, fmt, generateId, todayISO, n } from '../utils/calculations'
import { Input, Select, Grid, ResultRow, StatCard, PageHeader, Toast, EmptyState, Modal, Card, Badge } from '../components/ui'

const initOrder = (): DTFOrder => ({
  id: generateId(), date: todayISO(), orderNumber: '', printingUnit: '', orderDays: 1,
  clientId: '', paidAmount: 0, status: 'pending',
  filmRollPrice: 0, designWidth: 0, designHeight: 0, designsPerRoll: 0, rollConsumptionPer100: 0,
  powderPricePerKg: 0, powderGramsPer100: 0,
  cmykInkPricePer100ml: 0, whiteInkPricePer100ml: 0,
  cmykMlPerA4: 0, whiteMlPerA4: 0, piecesPerA4Equivalent: 0,
  printHeadLifeMl: 0, printHeadPrice: 0, maintenanceCost: 0, wasteTankCost: 0,
  printerKw: 0, ovenKw: 0, electricityPricePerKw: 0, operatingHours: 0,
  numWorkers: 0, workerDaily: 0, printTimePerPieceMins: 0, pressingTimeMins: 0,
  shipping: 0, packaging: 0, profitMargin: 0, taxRate: 0, totalPieces: 0,
  filmCostPerPiece: 0, inkCostPerPiece: 0, powderCostPerPiece: 0,
  energyCostPerPiece: 0, laborCostPerPiece: 0, machineCostPerPiece: 0, totalCostPerPiece: 0,
  totalOrderCost: 0, suggestedPricePerPiece: 0, suggestedTotalPrice: 0, netProfit: 0, profitPercent: 0
})

const DTFPage: React.FC = () => {
  const { settings } = useSettingsStore()
  const { dtfOrders, saveDTF, deleteDTF, clearDTF } = useOrdersStore()
  const { clients } = useClientsStore()

  const [order, setOrder] = useState<DTFOrder>(initOrder())
  const [results, setResults] = useState<Partial<DTFOrder>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    film: true, powder: true, ink: true, machine: true, energy: true, labor: true, expenses: true
  })
  const printRef = useRef<HTMLDivElement>(null)
  const listPrintRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({ contentRef: printRef })
  const handlePrintList = useReactToPrint({ contentRef: listPrintRef })

  useEffect(() => { setResults(calcDTF(order)) }, [order])

  const set = (field: keyof DTFOrder, value: string | number) =>
    setOrder(prev => ({ ...prev, [field]: value }))

  const toggle = (k: string) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  const handleSave = () => {
    if (!order.printingUnit.trim()) { setToast({ msg: 'يرجى إدخال اسم المطبعة', type: 'error' }); return }
    if (n(order.totalPieces) <= 0) { setToast({ msg: 'يرجى إدخال عدد القطع', type: 'error' }); return }
    saveDTF({ ...order, ...results })
    setToast({ msg: 'تم حفظ الأوردر بنجاح ✓', type: 'success' })
    setEditingId(null); setShowList(true)
  }

  const handleEdit = (o: DTFOrder) => { setOrder(o); setEditingId(o.id); setShowList(false); window.scrollTo(0, 0) }
  
  const handleNew = () => { 
    const nextNum = `DTF-${String(dtfOrders.length + 1).padStart(3, '0')}`
    setOrder({ ...initOrder(), orderNumber: nextNum })
    setEditingId(null)
    setShowList(false)
    window.scrollTo(0, 0) 
  }

  const handleExternalPrint = (o: DTFOrder) => {
    setOrder(o)
    setTimeout(() => {
      handlePrint()
    }, 150)
  }

  const filteredOrders = dtfOrders.filter(o => {
    const client = clients.find(c => c.id === o.clientId)
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.printingUnit || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = () => { 
    if (deleteId) { 
      deleteDTF(deleteId); 
      setDeleteId(null); 
      setToast({ msg: 'تم حذف أوردر DTF وتحديث مديونية العميل بنجاح ✓', type: 'error' }) 
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
      <PageHeader
        title="طباعة DTF"
        subtitle={`${dtfOrders.length} أوردر محفوظ`}
        icon={<Zap size={20} />}
        actions={
          <div className="flex gap-2">
            {showList && dtfOrders.length > 0 && (
              <>
                <button className="btn-ghost" onClick={() => handlePrintList()}>
                  <Printer size={16} /> طباعة الكشف
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
                icon={<Zap size={28} />}
                title="لا توجد نتائج"
                description="لم يتم العثور على أوردرات DTF تطابق البحث"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={16} /> أوردر جديد</button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(o => (
                <div key={o.id} className="bank-card-gold p-4 rounded-3xl hover:border-gold/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white">{o.orderNumber}</span>
                        <span className="text-muted">|</span>
                        <span className="font-bold text-gold">
                          {clients.find(c => c.id === o.clientId)?.name || o.printingUnit || '—'}
                        </span>
                        <Badge variant="gold">DTF</Badge>
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
                          <p className="text-xs text-muted">التكلفة</p>
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
                        className="w-8 h-8 rounded-xl bg-gold/10 hover:bg-gold/20 flex items-center justify-center text-gold transition-colors"
                        onClick={() => handleExternalPrint(o)}
                        title="طباعة سريعة"
                      >
                        <Printer size={14} />
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
          {/* ── List Print Area (Hidden Summary) ── */}
          <div ref={listPrintRef} className="print-only p-10 bg-white text-slate-900" dir="rtl">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 mb-1">{settings.companyName || 'ProTex ERP'}</h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">كشف تفصيلي بأوردرات الطباعة الرقمية DTF</p>
              </div>
              <div className="text-left text-slate-900">
                <p className="text-xs font-bold uppercase text-slate-400">تاريخ التقرير</p>
                <p className="font-mono text-sm">{new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>

            <table className="w-full text-xs text-right mb-8">
              <thead>
                <tr className="border-y-2 border-slate-900 bg-slate-50">
                  <th className="py-3 px-2">رقم الأوردر</th>
                  <th className="py-3 px-2">العميل / المطبعة</th>
                  <th className="py-3 px-2 text-center">التاريخ</th>
                  <th className="py-3 px-2 text-center">الحالة</th>
                  <th className="py-3 px-2 text-left">الإجمالي ({cur})</th>
                  <th className="py-3 px-2 text-left">المدفوع</th>
                  <th className="py-3 px-2 text-left">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="py-3 px-2 font-bold">{o.orderNumber}</td>
                    <td className="py-3 px-2 font-medium">{clients.find(c => c.id === o.clientId)?.name || o.printingUnit || '—'}</td>
                    <td className="py-3 px-2 text-center text-slate-500">{o.date}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-bold">
                        {o.status === 'delivered' ? 'مكتمل' : o.status === 'canceled' ? 'ملغي' : o.status === 'processing' ? 'تحت التنفيذ' : 'جديد'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-left font-mono">{fmt(o.totalOrderCost)}</td>
                    <td className="py-3 px-2 text-left font-mono text-emerald-600">{fmt(o.paidAmount || 0)}</td>
                    <td className="py-3 px-2 text-left font-mono text-red-600 font-bold">
                      {fmt(n(o.totalOrderCost) - n(o.paidAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-4 border-slate-900 bg-slate-50 font-black">
                  <td colSpan={4} className="py-4 px-2 text-left text-sm uppercase">الإجمالي الكلي المستحق:</td>
                  <td className="py-4 px-2 text-left font-mono text-sm">{fmt(filteredOrders.reduce((sum, o) => sum + n(o.totalOrderCost), 0))}</td>
                  <td className="py-4 px-2 text-left font-mono text-sm text-emerald-700">{fmt(filteredOrders.reduce((sum, o) => sum + n(o.paidAmount), 0))}</td>
                  <td className="py-4 px-2 text-left font-mono text-lg text-red-700">
                    {fmt(filteredOrders.reduce((sum, o) => sum + (n(o.totalOrderCost) - n(o.paidAmount)), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            
            <div className="flex justify-between mt-20 text-xs italic text-slate-400">
              <p>توقيع المدير المسؤول: ____________________</p>
              <p>توقيع المحاسب: ____________________</p>
            </div>
          </div>

          {/* ── Professional Print Area ── */}
          <div ref={printRef} className="print-only p-10 bg-white text-slate-900" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 mb-1">{settings.companyName || 'ProTex ERP'}</h1>
                <p className="text-sm text-slate-500">نظام إدارة الإنتاج والطباعة المتكامل</p>
              </div>
              <div className="text-left text-slate-900">
                <h2 className="text-xl font-bold uppercase tracking-wider mb-1">تقرير تكاليف DTF</h2>
                <p className="text-sm font-mono">{order.orderNumber}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-8 mb-10 text-sm">
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">العميل</p>
                <p className="font-bold text-lg">{clients.find(c => c.id === order.clientId)?.name || order.printingUnit || 'عميل نقدي'}</p>
                <p className="text-slate-500">{clients.find(c => c.id === order.clientId)?.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">تفاصيل الأوردر</p>
                <p className="font-bold">التاريخ: {order.date}</p>
                <p className="font-bold">المطبعة: {order.printingUnit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">الحالة الفنية</p>
                <p className="font-bold">عدد القطع: {order.totalPieces}</p>
                <p className="font-bold">مساحة التصميم: {order.designWidth}×{order.designHeight}سم</p>
              </div>
            </div>

            {/* Main Cost Table */}
            <table className="w-full mb-10">
              <thead>
                <tr className="border-b-2 border-slate-900 text-right text-xs uppercase font-black">
                  <th className="py-3 px-2">البند / المكون</th>
                  <th className="py-3 px-2">الوصف الفني</th>
                  <th className="py-3 px-2 text-left">التكلفة ({cur})</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { label: 'تكلفة الفيلم DTF', desc: `${order.designsPerRoll} تصميم بالرول`, val: res.filmCostPerPiece ? n(res.filmCostPerPiece) * n(order.totalPieces) : 0 },
                  { label: 'أحبار الطباعة', desc: `CMYK + White`, val: res.inkCostPerPiece ? n(res.inkCostPerPiece) * n(order.totalPieces) : 0 },
                  { label: 'البودرة الحرارية', desc: `${order.powderGramsPer100}جم لكل 100`, val: res.powderCostPerPiece ? n(res.powderCostPerPiece) * n(order.totalPieces) : 0 },
                  { label: 'تكلفة المعدات والهلاك', desc: `رأس الطباعة والصيانة`, val: res.machineCostPerPiece ? n(res.machineCostPerPiece) * n(order.totalPieces) : 0 },
                  { label: 'الطاقة والكهرباء', desc: `${order.operatingHours} ساعة تشغيل`, val: res.energyCostPerPiece ? n(res.energyCostPerPiece) * n(order.totalPieces) : 0 },
                  { label: 'العمالة واليوميات', desc: `${order.numWorkers} عمال`, val: res.laborCostPerPiece ? n(res.laborCostPerPiece) * n(order.totalPieces) : 0 },
                ].map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-4 px-2 font-bold">{item.label}</td>
                    <td className="py-4 px-2 text-slate-500">{item.desc}</td>
                    <td className="py-4 px-2 text-left font-mono">{fmt(item.val || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">إجمالي تكاليف الإنتاج</span>
                  <span className="font-mono">{fmt(res.totalOrderCost || 0)} {cur}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">المبلغ المدفوع (عربون)</span>
                  <span className="font-mono text-emerald-600">-{fmt(order.paidAmount || 0)} {cur}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-900">
                  <span className="font-black text-lg">المتبقي للتحصيل</span>
                  <span className="font-black text-2xl text-slate-900 font-mono">
                    {fmt(n(res.totalOrderCost) - n(order.paidAmount))} {cur}
                  </span>
                </div>
                
                <div className="pt-6 grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">تكلفة القطعة</p>
                    <p className="font-bold text-slate-900">{fmt(res.totalCostPerPiece || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-center">
                    <p className="text-[10px] text-slate-300 uppercase font-bold mb-1">السعر المقترح</p>
                    <p className="font-bold text-white">{fmt(res.suggestedPricePerPiece || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end italic text-sm text-slate-400">
              <div className="text-right">
                <p>توقيع الحسابات: ____________________</p>
                <p className="mt-2 text-[10px]">صدر بواسطة ProTex ERP {new Date().toLocaleString('ar-EG')}</p>
              </div>
              <div className="text-center w-32 h-32 border-2 border-dashed border-slate-200 flex items-center justify-center rounded-full opacity-50"> ختم الشركة </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bank-card p-5 rounded-3xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h3 className="section-title mb-0 border-0 pb-0">البيانات الأساسية</h3>
              <Badge variant="gold" className="text-sm px-3">{order.orderNumber}</Badge>
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
              <Input label="اسم المطبعة / الوحدة" value={order.printingUnit} onChange={e => set('printingUnit', e.target.value)} placeholder="اسم المطبعة" />
              <Input label="تاريخ الأوردر" type="date" value={order.date} onChange={e => set('date', e.target.value)} />
              <Input label="عدد القطع الكلي" type="number" value={order.totalPieces || ''} onChange={e => set('totalPieces', +e.target.value)} suffix="قطعة" placeholder="0" />
              <div className="space-y-1">
                <Input label="المبلغ المدفوع مقدماً (عربون)" type="number" value={order.paidAmount || ''} onChange={e => set('paidAmount', +e.target.value)} suffix={cur} placeholder="0" />
                <p className="text-[10px] text-muted pr-2">
                  المتبقي: <span className="num font-bold text-danger">{fmt(n(res.totalOrderCost) - n(order.paidAmount))}</span> {cur}
                </p>
              </div>
            </Grid>
          </div>

          {/* Film */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="مستلزمات الفيلم" k="film" icon="🎞️" />
            {expanded.film && (
              <Grid cols={2}>
                <Input label="سعر رول الفيلم DTF" type="number" value={order.filmRollPrice || ''} onChange={e => set('filmRollPrice', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="عرض التصميم (سم)" type="number" value={order.designWidth || ''} onChange={e => set('designWidth', +e.target.value)} suffix="سم" placeholder="0" />
                <Input label="ارتفاع التصميم (سم)" type="number" value={order.designHeight || ''} onChange={e => set('designHeight', +e.target.value)} suffix="سم" placeholder="0" />
                <Input label="عدد التصميمات على الرول" type="number" value={order.designsPerRoll || ''} onChange={e => set('designsPerRoll', +e.target.value)} suffix="تصميم" placeholder="0" hint="لحساب تكلفة الفيلم لكل قطعة" />
              </Grid>
            )}
          </div>

          {/* Powder */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="البودرة الحرارية" k="powder" icon="🌡️" />
            {expanded.powder && (
              <Grid cols={2}>
                <Input label="سعر كيلو البودرة الحرارية" type="number" value={order.powderPricePerKg || ''} onChange={e => set('powderPricePerKg', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="كمية البودرة لكل 100 قطعة" type="number" value={order.powderGramsPer100 || ''} onChange={e => set('powderGramsPer100', +e.target.value)} suffix="جم" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Ink */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="أحبار DTF (CMYK + White)" k="ink" icon="🖨️" />
            {expanded.ink && (
              <Grid cols={2}>
                <Input label="سعر حبر CMYK (100مل)" type="number" value={order.cmykInkPricePer100ml || ''} onChange={e => set('cmykInkPricePer100ml', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="سعر حبر White (100مل)" type="number" value={order.whiteInkPricePer100ml || ''} onChange={e => set('whiteInkPricePer100ml', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="استهلاك CMYK لكل A4 (مل)" type="number" value={order.cmykMlPerA4 || ''} onChange={e => set('cmykMlPerA4', +e.target.value)} suffix="مل" placeholder="0" />
                <Input label="استهلاك White لكل A4 (مل)" type="number" value={order.whiteMlPerA4 || ''} onChange={e => set('whiteMlPerA4', +e.target.value)} suffix="مل" placeholder="0" />
                <Input label="عدد القطع لكل A4 مكافئ" type="number" value={order.piecesPerA4Equivalent || ''} onChange={e => set('piecesPerA4Equivalent', +e.target.value)} suffix="قطعة" placeholder="1" hint="كم قطعة ينتج عن مساحة A4 واحدة" />
              </Grid>
            )}
          </div>

          {/* Machine */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="معدات DTF" k="machine" icon="⚙️" />
            {expanded.machine && (
              <Grid cols={2}>
                <Input label="سعر رأس الطباعة" type="number" value={order.printHeadPrice || ''} onChange={e => set('printHeadPrice', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="عمر رأس الطباعة (بالمل)" type="number" value={order.printHeadLifeMl || ''} onChange={e => set('printHeadLifeMl', +e.target.value)} suffix="مل" placeholder="0" />
                <Input label="تكلفة الصيانة الدورية" type="number" value={order.maintenanceCost || ''} onChange={e => set('maintenanceCost', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تكلفة Waste Tank" type="number" value={order.wasteTankCost || ''} onChange={e => set('wasteTankCost', +e.target.value)} suffix={cur} placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Energy */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="الطاقة" k="energy" icon="⚡" />
            {expanded.energy && (
              <Grid cols={2}>
                <Input label="استهلاك الطابعة" type="number" value={order.printerKw || ''} onChange={e => set('printerKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
                <Input label="استهلاك فرن التثبيت DTF" type="number" value={order.ovenKw || ''} onChange={e => set('ovenKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
                <Input label="ساعات التشغيل" type="number" value={order.operatingHours || ''} onChange={e => set('operatingHours', +e.target.value)} suffix="ساعة" placeholder="0" />
                <Input label="سعر الكيلوواط/ساعة" type="number" value={order.electricityPricePerKw || ''} onChange={e => set('electricityPricePerKw', +e.target.value)} suffix={cur} placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Labor */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="العمالة" k="labor" icon="👷" />
            {expanded.labor && (
              <Grid cols={2}>
                <Input label="عدد العمال" type="number" value={order.numWorkers || ''} onChange={e => set('numWorkers', +e.target.value)} suffix="عامل" placeholder="0" />
                <Input label="يومية العامل" type="number" value={order.workerDaily || ''} onChange={e => set('workerDaily', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="وقت طباعة كل قطعة" type="number" value={order.printTimePerPieceMins || ''} onChange={e => set('printTimePerPieceMins', +e.target.value)} suffix="دقيقة" placeholder="0" />
                <Input label="وقت كبس وتثبيت" type="number" value={order.pressingTimeMins || ''} onChange={e => set('pressingTimeMins', +e.target.value)} suffix="دقيقة" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Expenses */}
          <div className="bank-card p-5 rounded-3xl">
            <SH title="مصاريف وهامش الربح" k="expenses" icon="💰" />
            {expanded.expenses && (
              <Grid cols={2}>
                <Input label="شحن وتوصيل" type="number" value={order.shipping || ''} onChange={e => set('shipping', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تعبئة وتغليف" type="number" value={order.packaging || ''} onChange={e => set('packaging', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="هامش الربح" type="number" value={order.profitMargin || ''} onChange={e => set('profitMargin', +e.target.value)} suffix="%" placeholder="0" />
                <Input label="ضريبة / رسوم" type="number" value={order.taxRate || ''} onChange={e => set('taxRate', +e.target.value)} suffix="%" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Results */}
          {n(order.totalPieces) > 0 && (
            <div className="bank-card-gold p-5 rounded-3xl animate-scale-in">
              <h3 className="text-base font-bold text-gold mb-4">📊 نتائج حسابات DTF</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <StatCard label="تكلفة القطعة" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} variant="navy" />
                <StatCard label="سعر البيع" value={`${fmt(res.suggestedPricePerPiece || 0)} ${cur}`} variant="gold" />
                <StatCard label="ربح الأوردر" value={`${fmt(res.netProfit || 0)} ${cur}`} variant="success" />
              </div>
              <div className="space-y-1">
                <ResultRow label="تكلفة الفيلم للقطعة" value={`${fmt(res.filmCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة الحبر للقطعة (CMYK+White)" value={`${fmt(res.inkCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة البودرة للقطعة" value={`${fmt(res.powderCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة الطاقة للقطعة" value={`${fmt(res.energyCostPerPiece || 0)} ${cur}`} />
                <ResultRow label="تكلفة العمالة للقطعة" value={`${fmt(res.laborCostPerPiece || 0)} ${cur}`} />
                <ResultRow label={`الضريبة المضافة (${res.taxRate || 0}%)`} value={`${fmt(res.taxAmount || 0)} ${cur}`} />
                <ResultRow label="إجمالي تكلفة القطعة (شامل الضريبة)" value={`${fmt(res.totalCostPerPiece || 0)} ${cur}`} highlight variant="navy" />
                <ResultRow label="إجمالي تكلفة الأوردر" value={`${fmt(res.totalOrderCost || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="سعر البيع المقترح (بدون ضريبة)" value={`${fmt(res.priceWithoutTax || 0)} ${cur}`} />
                <ResultRow label="سعر البيع المقترح (شامل الضريبة)" value={`${fmt(res.priceWithTax || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} highlight variant="success" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <button className="btn-ghost" onClick={handlePrint}><FileText size={16} /> طباعة التقرير</button>
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
        footer={<><button className="btn-ghost" onClick={() => setShowClearModal(false)}>إلغاء</button><button className="btn-danger" onClick={() => { clearDTF(); setShowClearModal(false); setToast({ msg: 'تم مسح جميع الأوردرات بنجاح', type: 'error' }) }}>نعم، امسح الكل</button></>}>
        <p className="text-white text-sm">سيتم حذف جميع أوردرات DTF نهائياً. هل أنت متأكد؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default DTFPage
