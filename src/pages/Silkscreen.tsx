import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Save, Plus, Trash2, FileText, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { useClientsStore } from '../store/useClientsStore'
import type { SilkscreenOrder } from '../store/useOrdersStore'
import {
  calcSilkscreen, fmt, generateId, todayISO, n
} from '../utils/calculations'
import {
  Input, Select, Grid, ResultRow, StatCard, PageHeader,
  Toast, EmptyState, Modal, Card, Badge
} from '../components/ui'

const printLocationsOptions = [
  { value: 'صدر', label: 'صدر فقط' },
  { value: 'ظهر', label: 'ظهر فقط' },
  { value: 'صدر_وظهر', label: 'صدر وظهر' },
  { value: 'كم', label: 'كم' },
  { value: 'متعدد', label: 'مواضع متعددة' },
]

const inkTypes = [
  { value: 'plastisol', label: 'حبر بلاستيزول' },
  { value: 'water', label: 'حبر مائي' },
  { value: 'flock', label: 'حبر فلوك / مخمل' },
  { value: 'phosphor', label: 'حبر فسفوري' },
]

const initOrder = (): SilkscreenOrder => ({
  id: generateId(),
  date: todayISO(),
  orderNumber: '',
  printingUnit: '',
  clientId: '',
  paidAmount: 0,
  status: 'pending',
  itemDescription: '', printLocations: '',
  totalPieces: 0,
  screenPrice: 0, numColors: 1, screenLifeOrders: 1,
  emulsionCostPerScreen: 0, emulsionRemoverCost: 0, thinnerCost: 0,
  inkType: '', inkPricePerKg: 0, inkConsumptionPer100: 0,
  ovenKw: 0, electricityPricePerKw: 0, operatingHours: 0, gasOrFuelCost: 0,
  printWorkers: 0, printWorkerDaily: 0, screenPrepWorkers: 0, screenPrepDaily: 0,
  fixingWorkers: 0, fixingDaily: 0, qcWorkers: 0, qcDaily: 0,
  packagingWorkers: 0, packagingDaily: 0, orderDays: 1,
  overtimeHours: 0, overtimeRate: 0,
  rent: 0, maintenance: 0, shipping: 0, packaging: 0,
  profitMargin: 0, taxRate: 0,
  screenCost: 0, inkCost: 0, electricityCost: 0, laborCost: 0, otherCost: 0,
  totalOrderCost: 0, printCostPerPiece: 0, suggestedPrice: 0, suggestedTotalPrice: 0, netProfit: 0, profitPercent: 0,
})

const SilkscreenPage: React.FC = () => {
  const { settings } = useSettingsStore()
  const { silkscreenOrders, saveSilkscreen, deleteSilkscreen, clearSilkscreen } = useOrdersStore()
  const { clients } = useClientsStore()
  
  const [order, setOrder] = useState<SilkscreenOrder>(initOrder())
  const [results, setResults] = useState<Partial<SilkscreenOrder>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    items: true, screens: true, ink: true, energy: true, labor: true, expenses: true
  })
  const printRef = useRef<HTMLDivElement>(null)
  const listPrintRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({ contentRef: printRef })
  const handlePrintList = useReactToPrint({ contentRef: listPrintRef })

  // Auto-calculate on every change
  useEffect(() => {
    const calc = calcSilkscreen(order)
    setResults(calc)
  }, [order])

  const set = (field: keyof SilkscreenOrder, value: string | number) => {
    setOrder(prev => ({ ...prev, [field]: value }))
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    if (!order.printingUnit.trim()) {
      setToast({ msg: 'يرجى إدخال اسم المطبعة', type: 'error' })
      return
    }
    if (n(order.totalPieces) <= 0) {
      setToast({ msg: 'يرجى إدخال عدد القطع', type: 'error' })
      return
    }
    const finalOrder = { ...order, ...results }
    saveSilkscreen(finalOrder)
    setToast({ msg: 'تم حفظ الأوردر بنجاح ✓', type: 'success' })
    setEditingId(null)
    setShowList(true)
  }

  const handleEdit = (o: SilkscreenOrder) => {
    setOrder(o)
    setEditingId(o.id)
    setShowList(false)
    window.scrollTo(0, 0)
  }

  const handleNew = () => {
    const nextNum = `SLK-${String(silkscreenOrders.length + 1).padStart(3, '0')}`
    setOrder({ ...initOrder(), orderNumber: nextNum })
    setEditingId(null)
    setShowList(false)
    window.scrollTo(0, 0)
  }

  const filteredOrders = silkscreenOrders.filter(o => {
    const client = clients.find(c => c.id === o.clientId)
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.printingUnit || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExternalPrint = (o: SilkscreenOrder) => {
    setOrder(o)
    // Small timeout to allow state sync and calcSilkscreen to run before print
    setTimeout(() => {
      handlePrint()
    }, 150)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteSilkscreen(deleteId)
      setDeleteId(null)
      setToast({ msg: 'تم حذف الأوردر وتحديث مديونية العميل بنجاح ✓', type: 'error' })
    }
  }

  const cur = settings.currencySymbol || settings.currency || 'جنيه'
  const res = { ...results }

  const SectionHeader: React.FC<{ title: string; sectionKey: string; icon: React.ReactNode }> = ({ title, sectionKey, icon }) => (
    <button
      className="w-full flex items-center gap-2 text-right mb-3 group"
      onClick={() => toggleSection(sectionKey)}
    >
      <span className="text-gold">{icon}</span>
      <span className="section-title flex-1 mb-0 border-0 pb-0 text-gold">{title}</span>
      {expandedSections[sectionKey] ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
    </button>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="الطباعة بالسيلك سكرين"
        subtitle={`${silkscreenOrders.length} أوردر محفوظ`}
        icon={<Printer size={20} />}
        actions={
          <div className="flex gap-2">
            {showList && silkscreenOrders.length > 0 && (
              <>
                <button className="btn-ghost" onClick={() => handlePrintList()}>
                  <Printer size={16} /> طباعة الكشف
                </button>
                <button className="btn-ghost text-danger border-danger/30 hover:bg-danger/10" onClick={() => setShowClearModal(true)}>
                  <Trash2 size={16} /> مسح الكل
                </button>
              </>
            )}
            {!showList && (
              <button className="btn-ghost" onClick={() => { setShowList(true); setEditingId(null) }}>
                القائمة
              </button>
            )}
            <button className="btn-gold" onClick={handleNew}>
              <Plus size={16} /> أوردر جديد
            </button>
          </div>
        }
      />

      {showList ? (
        /* ── Orders List ── */
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
                icon={<Printer size={28} />}
                title="لا توجد نتائج"
                description="لم يتم العثور على أوردرات تطابق البحث"
                action={<button className="btn-gold" onClick={handleNew}><Plus size={16} /> أوردر جديد</button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(o => (
                <div key={o.id} className="bank-card p-4 rounded-3xl hover:border-gold/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white">{o.orderNumber}</span>
                        <span className="text-muted">|</span>
                        <span className="font-bold text-gold">
                          {clients.find(c => c.id === o.clientId)?.name || o.printingUnit || '—'}
                        </span>
                        {o.itemDescription && <Badge variant="navy">{o.itemDescription}</Badge>}
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
                      <p className="text-xs text-muted">{o.date} · {o.totalPieces} قطعة · {o.numColors} لون</p>
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
        /* ── Order Form ── */
        <div className="space-y-4">
          {/* ── List Print Area (Hidden Summary) ── */}
          <div ref={listPrintRef} className="print-only p-10 bg-white text-slate-900" dir="rtl">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 mb-1">{settings.companyName || 'ProTex ERP'}</h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">كشف تفصيلي بأوردرات السيلك سكرين</p>
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
                <h2 className="text-xl font-bold uppercase tracking-wider mb-1">تقرير تكاليف إنتاج</h2>
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
                <p className="text-slate-400 font-bold uppercase text-[10px]">المنتج المستلم</p>
                <p className="font-bold">عدد القطع: {order.totalPieces}</p>
                <p className="font-bold">المنتج: {order.itemDescription || '—'}</p>
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
                  { label: 'تجهيز الشاشات', desc: `${order.numColors} لون · موضع: ${order.printLocations}`, val: res.screenCost },
                  { label: 'الأحبار والكيماويات', desc: `${order.inkType} · استهلاك 100/${order.inkConsumptionPer100}جم`, val: res.inkCost },
                  { label: 'الطاقة والكهرباء', desc: `${order.operatingHours} ساعة تشغيل`, val: res.electricityCost },
                  { label: 'العمالة واليوميات', desc: `${order.orderDays} يوم عمل`, val: res.laborCost },
                  { label: 'مصاريف إضافية', desc: `شحن / تغليف / صيانة`, val: res.otherCost },
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
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">تكلفة الطباعة للقطعة</p>
                    <p className="font-bold text-slate-900">{fmt(res.printCostPerPiece || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg text-center">
                    <p className="text-[10px] text-slate-300 uppercase font-bold mb-1">أجر الطباعة المقترح</p>
                    <p className="font-bold text-white">{fmt(res.suggestedPrice || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end italic text-sm text-slate-400">
              <div className="text-right">
                <p>توقيع الحسابات: ____________________</p>
                <p className="mt-2 text-[10px]">صدر بواسطة ProTex ERP {new Date().toLocaleString('ar-EG')}</p>
              </div>
              <div className="text-center w-32 h-32 border-2 border-dashed border-slate-200 flex items-center justify-center rounded-full opacity-50">
                ختم الشركة
              </div>
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
              <div className="space-y-1">
                <Input label="المبلغ المدفوع مقدماً (عربون)" type="number" value={order.paidAmount || ''} onChange={e => set('paidAmount', +e.target.value)} suffix={cur} placeholder="0" />
                <p className="text-[10px] text-muted pr-2">
                  المتبقي: <span className="num font-bold text-danger">{fmt(n(res.totalOrderCost) - n(order.paidAmount))}</span> {cur}
                </p>
              </div>
            </Grid>
          </div>

          {/* Items Section (Client Provides) */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="المنتجات المستلمة للطباعة (من العميل)" sectionKey="items" icon="📦" />
            {expandedSections.items && (
              <Grid cols={3}>
                <Input label="وصف المنتج (مثال: تيشرت بولو أبيض)" value={order.itemDescription || ''} onChange={e => set('itemDescription', e.target.value)} placeholder="وصف المنتج" />
                <Input label="العدد الإجمالي" type="number" value={order.totalPieces || ''} onChange={e => set('totalPieces', +e.target.value)} suffix="قطعة" placeholder="0" />
                <Select
                  label="موضع الطباعة"
                  options={printLocationsOptions}
                  value={order.printLocations || ''}
                  onChange={e => set('printLocations', e.target.value)}
                />
              </Grid>
            )}
          </div>

          {/* Screens Section */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="تكاليف الشاشات" sectionKey="screens" icon="🖼️" />
            {expandedSections.screens && (
              <Grid cols={2}>
                <Input label="سعر الشاشة الواحدة" type="number" value={order.screenPrice || ''} onChange={e => set('screenPrice', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="عدد الشاشات (= عدد الألوان)" type="number" value={order.numColors || ''} onChange={e => set('numColors', +e.target.value)} suffix="شاشة" placeholder="1" />
                <Input label="عمر الشاشة (بالأوردر)" type="number" value={order.screenLifeOrders || ''} onChange={e => set('screenLifeOrders', +e.target.value)} suffix="أوردر" placeholder="1" hint="تكلفة إعداد الشاشة تُقسَّم على عمرها" />
                <Input label="تكلفة الإيمولشن لكل شاشة" type="number" value={order.emulsionCostPerScreen || ''} onChange={e => set('emulsionCostPerScreen', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تكلفة مزيل الإيمولشن والكيماويات" type="number" value={order.emulsionRemoverCost || ''} onChange={e => set('emulsionRemoverCost', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تكلفة المخفف / الميديوم" type="number" value={order.thinnerCost || ''} onChange={e => set('thinnerCost', +e.target.value)} suffix={cur} placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Ink Section */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="الأحبار والكيماويات" sectionKey="ink" icon="🎨" />
            {expandedSections.ink && (
              <Grid cols={2}>
                <Select label="نوع الحبر" options={inkTypes} value={order.inkType} onChange={e => set('inkType', e.target.value)} />
                <Input label="سعر كيلو الحبر" type="number" value={order.inkPricePerKg || ''} onChange={e => set('inkPricePerKg', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="كمية الحبر لكل 100 قطعة" type="number" value={order.inkConsumptionPer100 || ''} onChange={e => set('inkConsumptionPer100', +e.target.value)} suffix="جم" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Energy Section */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="الطاقة والكهرباء" sectionKey="energy" icon="⚡" />
            {expandedSections.energy && (
              <Grid cols={2}>
                <Input label="استهلاك الكهرباء (فرن/درام)" type="number" value={order.ovenKw || ''} onChange={e => set('ovenKw', +e.target.value)} suffix="كيلوواط" placeholder="0" />
                <Input label="سعر الكيلوواط/ساعة" type="number" value={order.electricityPricePerKw || ''} onChange={e => set('electricityPricePerKw', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="ساعات التشغيل" type="number" value={order.operatingHours || ''} onChange={e => set('operatingHours', +e.target.value)} suffix="ساعة" placeholder="0" />
                <Input label="تكلفة الغاز / الوقود" type="number" value={order.gasOrFuelCost || ''} onChange={e => set('gasOrFuelCost', +e.target.value)} suffix={cur} placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Labor Section */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="العمالة واليوميات" sectionKey="labor" icon="👷" />
            {expandedSections.labor && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <span className="text-xs text-gold font-semibold">الفئة</span>
                  <span className="text-xs text-gold font-semibold text-center">العدد</span>
                  <span className="text-xs text-gold font-semibold text-center">اليومية ({cur})</span>
                </div>
                {[
                  { label: 'عمال طباعة', countKey: 'printWorkers' as keyof SilkscreenOrder, dailyKey: 'printWorkerDaily' as keyof SilkscreenOrder },
                  { label: 'عمال تحضير شاشات', countKey: 'screenPrepWorkers' as keyof SilkscreenOrder, dailyKey: 'screenPrepDaily' as keyof SilkscreenOrder },
                  { label: 'عمال تثبيت / فرن', countKey: 'fixingWorkers' as keyof SilkscreenOrder, dailyKey: 'fixingDaily' as keyof SilkscreenOrder },
                  { label: 'عمال مراقبة جودة', countKey: 'qcWorkers' as keyof SilkscreenOrder, dailyKey: 'qcDaily' as keyof SilkscreenOrder },
                  { label: 'عمال تعبئة وتغليف', countKey: 'packagingWorkers' as keyof SilkscreenOrder, dailyKey: 'packagingDaily' as keyof SilkscreenOrder },
                ].map(({ label, countKey, dailyKey }) => (
                  <div key={label} className="grid grid-cols-3 gap-3 mb-2 items-center">
                    <span className="text-xs text-white/70">{label}</span>
                    <input
                      type="number"
                      className="bank-input text-center"
                      placeholder="0"
                      value={(order[countKey] as number) || ''}
                      onChange={e => set(countKey, +e.target.value)}
                    />
                    <input
                      type="number"
                      className="bank-input text-center"
                      placeholder="0"
                      value={(order[dailyKey] as number) || ''}
                      onChange={e => set(dailyKey, +e.target.value)}
                    />
                  </div>
                ))}
                <Grid cols={3} className="mt-3">
                  <Input label="عدد أيام الأوردر" type="number" value={order.orderDays || ''} onChange={e => set('orderDays', +e.target.value)} suffix="يوم" placeholder="1" />
                  <Input label="ساعات أوفر تايم" type="number" value={order.overtimeHours || ''} onChange={e => set('overtimeHours', +e.target.value)} suffix="ساعة" placeholder="0" />
                  <Input label="أجر ساعة الأوفر تايم" type="number" value={order.overtimeRate || ''} onChange={e => set('overtimeRate', +e.target.value)} suffix={cur} placeholder="0" />
                </Grid>
              </>
            )}
          </div>

          {/* Expenses Section */}
          <div className="bank-card p-5 rounded-3xl">
            <SectionHeader title="مصاريف إضافية وهامش الربح" sectionKey="expenses" icon="💰" />
            {expandedSections.expenses && (
              <Grid cols={2}>
                <Input label="إيجار المكان (موزع على الأوردر)" type="number" value={order.rent || ''} onChange={e => set('rent', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="صيانة المعدات (موزعة)" type="number" value={order.maintenance || ''} onChange={e => set('maintenance', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تكاليف شحن وتوصيل" type="number" value={order.shipping || ''} onChange={e => set('shipping', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="تعبئة وتغليف" type="number" value={order.packaging || ''} onChange={e => set('packaging', +e.target.value)} suffix={cur} placeholder="0" />
                <Input label="هامش الربح" type="number" value={order.profitMargin || ''} onChange={e => set('profitMargin', +e.target.value)} suffix="%" placeholder="0" />
                <Input label="ضريبة / رسوم" type="number" value={order.taxRate || ''} onChange={e => set('taxRate', +e.target.value)} suffix="%" placeholder="0" />
              </Grid>
            )}
          </div>

          {/* Results Card */}
          {n(order.totalPieces) > 0 && (
            <div className="bank-card-gold p-5 rounded-3xl animate-scale-in">
              <h3 className="text-base font-bold text-gold mb-4">📊 نتائج الحسابات (أجر الطباعة فقط)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <StatCard label="تكلفة الطباعة / للقطعة" value={`${fmt(res.printCostPerPiece || 0)} ${cur}`} variant="navy" />
                <StatCard label="أجر الطباعة المقترح" value={`${fmt(res.suggestedPrice || 0)} ${cur}`} variant="gold" />
                <StatCard label="الربح الصافي" value={`${fmt(res.netProfit || 0)} ${cur}`} variant="success" />
              </div>
              <div className="space-y-1">
                <ResultRow label="تكلفة الشاشات" value={`${fmt(res.screenCost || 0)} ${cur}`} />
                <ResultRow label="تكلفة الحبر" value={`${fmt(res.inkCost || 0)} ${cur}`} />
                <ResultRow label="تكلفة الكهرباء" value={`${fmt(res.electricityCost || 0)} ${cur}`} />
                <ResultRow label="تكلفة العمالة" value={`${fmt(res.laborCost || 0)} ${cur}`} />
                <ResultRow label="إجمالي تكلفة المصنع (المصاريف)" value={`${fmt(res.totalOrderCost || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="تكلفة الطباعة للقطعة الواحدة" value={`${fmt(res.printCostPerPiece || 0)} ${cur}`} highlight variant="navy" />
                <ResultRow label="أجر الطباعة المقترح للقطعة" value={`${fmt(res.suggestedPrice || 0)} ${cur}`} highlight variant="gold" />
                <ResultRow label="إجمالي المطلوب تحصيله من العميل" value={`${fmt(res.suggestedTotalPrice || 0)} ${cur}`} highlight variant="success" />
                <ResultRow label="الربح الصافي المتوقع" value={`${fmt(res.netProfit || 0)} ${cur}`} highlight variant="success" />
                <ResultRow label="نسبة ربحية الأوردر" value={`${fmt(res.profitPercent || 0, 1)}%`} highlight variant="success" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end no-print">
            <button className="btn-ghost" onClick={handlePrint}>
              <FileText size={16} /> طباعة التقرير
            </button>
            <button className="btn-gold" onClick={handleSave}>
              <Save size={16} /> {editingId ? 'تحديث الأوردر' : 'حفظ الأوردر'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="تأكيد الحذف"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button>
            <button className="btn-danger" onClick={handleDelete}>حذف</button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-white text-sm font-bold">هل أنت متأكد من حذف هذا الأوردر نهائياً؟</p>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 leading-relaxed">
              ⚠️ تحذير: سيتم حذف قيمة الأوردر من مديونية العميل. إذا كان العميل قد دفع عربوناً، سيبقى العربون في حسابه كرصيد دائن (له مبلغ طرفكم).
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="تأكيد مسح جميع الأوردرات"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowClearModal(false)}>إلغاء</button>
            <button className="btn-danger" onClick={() => { clearSilkscreen(); setShowClearModal(false); setToast({ msg: 'تم مسح جميع الأوردرات بنجاح', type: 'error' }) }}>نعم، امسح الكل</button>
          </>
        }
      >
        <p className="text-white text-sm">سيتم حذف جميع أوردرات السيلك سكرين نهائياً. هل أنت متأكد؟</p>
      </Modal>

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default SilkscreenPage
