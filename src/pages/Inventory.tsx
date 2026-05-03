import React, { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Package, Plus, Minus, Search, AlertTriangle, Layers, Trash2, Download, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInventoryStore, type InventoryItem, type InventoryCategory } from '../store/useInventoryStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useSuppliersStore } from '../store/useSuppliersStore'
import { fmt } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import { PageHeader, Card, MetricCard, Input, Select, Toast, Badge, Modal, EmptyState } from '../components/ui'
import { InventoryReportTemplate } from '../components/ui/InventoryReportTemplate'

const categories: InventoryCategory[] = [
  'DTF (أفلام/أحبار/بودرة)',
  'سيلك سكرين (أحبار/شاشات)',
  'ملابس (قماش/خيوط/إكسسوارات)',
  'عام'
]

const Inventory: React.FC = () => {
  const { items, transactions, addItem, addStock, deductStock } = useInventoryStore()
  const { suppliers } = useSuppliersStore()
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `ProTex_Inventory_${new Date().toISOString().split('T')[0]}` })

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('All')

  const uniqueCategories = Array.from(new Set([...categories, ...items.map(i => i.category)]))

  const [showAddForm, setShowAddForm] = useState(false)
  const [showMoveForm, setShowMoveForm] = useState<{ id: string, type: 'in' | 'out' } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // New Item State
  const [newItem, setNewItem] = useState({ name: '', category: 'DTF (أفلام/أحبار/بودرة)' as InventoryCategory, originalUnit: 'قطعة', minimumStock: '0', costPerUnit: '0' })
  
  // Stock Movement State
  const [moveQuantity, setMoveQuantity] = useState('')
  const [moveCost, setMoveCost] = useState('')
  const [moveRef, setMoveRef] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  const lowStockItems = items.filter(i => i.quantity <= i.minimumStock)
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0)

  const filteredItems = items.filter(i => {
    const mCat = filterCat === 'All' || i.category === filterCat
    const mSearch = i.name.toLowerCase().includes(search.toLowerCase())
    return mCat && mSearch
  })

  // Handlers
  const handleAddNewItem = () => {
    if (!newItem.name.trim()) return setToast({ msg: 'يرجى إدخال اسم الصنف', type: 'error' })
    addItem({
      name: newItem.name,
      category: newItem.category,
      originalUnit: newItem.originalUnit || 'قطعة',
      minimumStock: parseFloat(newItem.minimumStock) || 0,
      quantity: 0,
      costPerUnit: parseFloat(newItem.costPerUnit) || 0
    })
    setShowAddForm(false)
    setNewItem({ name: '', category: 'DTF (أفلام/أحبار/بودرة)', originalUnit: 'قطعة', minimumStock: '0', costPerUnit: '0' })
    setToast({ msg: 'تمت إضافة الصنف بنجاح', type: 'success' })
  }

  const handleStockMove = () => {
    if (!showMoveForm) return
    const qty = parseFloat(moveQuantity)
    if (isNaN(qty) || qty <= 0) return setToast({ msg: 'أدخل كمية صحيحة أكبر من الصفر', type: 'error' })
    if (!moveRef.trim()) return setToast({ msg: 'برجاء كتابة مرجع أو إذن إضافة/صرف', type: 'error' })

    if (showMoveForm.type === 'in') {
      const cost = parseFloat(moveCost) || 0
      const pay = parseFloat(paymentAmount) || 0
      addStock(showMoveForm.id, qty, cost, moveRef, selectedSupplier, pay)
      setToast({ msg: 'تم إضافة الرصيد وتحديث الحسابات المرتبطة', type: 'success' })
    } else {
      const item = items.find(i => i.id === showMoveForm.id)
      if (item && qty > item.quantity) {
         return setToast({ msg: 'الكمية المطلوبة للصرف أكبر من المتاح في المخزن!', type: 'error' })
      }
      deductStock(showMoveForm.id, qty, moveRef)
      setToast({ msg: 'تم صرف الرصيد من المخزن بنجاح', type: 'success' })
    }
    
    setShowMoveForm(null)
    setMoveQuantity('')
    setMoveCost('')
    setMoveRef('')
    setSelectedSupplier('')
    setPaymentAmount('')
  }
  
  const handleDeleteItem = () => {
    if (deleteId) {
       const { deleteItem } = useInventoryStore.getState()
       deleteItem(deleteId)
       setDeleteId(null)
       setToast({ msg: 'تم حذف الصنف من المخزن', type: 'error' })
    }
  }

  const handleExportExcel = () => {
    const data = filteredItems.map(i => ({
      'كود الصنف': i.id.slice(0, 8),
      'اسم الصنف': i.name,
      'القسم': i.category,
      'الكمية المتاحة': i.quantity,
      'وحدة القياس': i.originalUnit,
      'الحد الأدنى': i.minimumStock,
      'متوسط التكلفة': i.costPerUnit,
      'إجمالي القيمة': i.quantity * i.costPerUnit,
      'حالة المخزون': i.quantity <= i.minimumStock ? 'نواقص' : 'متوفر',
      'العملة': cur
    }))
    exportToExcel(data, `ProTex_Inventory_Report_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="إدارة المخازن (الخامات)"
        subtitle={`${items.length} صنف مُسجل`}
        icon={<Package size={18} />}
        actions={
          <div className="flex gap-2">
            {items.length > 0 && (
              <>
                <button className="btn-ghost hidden md:flex" onClick={handleExportExcel}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn-ghost hidden md:flex" onClick={() => handlePrint()}>
                  <Printer size={14} /> طباعة
                </button>
              </>
            )}
            <button className="btn-gold" onClick={() => setShowAddForm(true)}>
              <Plus size={14} /> إضافة صنف جديد
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="إجمالي قيمة المخزون الحالي" value={`${fmt(totalValue)} ${cur}`} variant="navy" large />
        <MetricCard label="إجمالي الأصناف المسجلة" value={items.length.toString()} variant="default" icon={<Layers size={18} />} />
        <MetricCard label="أصناف وصلت للحد الأدنى (نواقص)" value={lowStockItems.length.toString()} variant={lowStockItems.length > 0 ? 'danger' : 'success'} icon={<AlertTriangle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6 pt-2">
          <Input 
            prefix={<Search size={14} />}
            placeholder="بحث عن صنف..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="md:w-64"
          />
          <Select 
            options={[{ value: 'All', label: 'كل الأقسام' }, ...uniqueCategories.map(c => ({ value: c, label: c }))]}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="md:w-48"
          />
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState icon={<Package />} title="لا يوجد خامات هنا" description="لم يتم العثور على أي أصناف مطابقة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>القسم</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">الكمية المتاحة</th>
                  <th className="text-center">متوسط التكلفة</th>
                  <th className="text-center">حالة النواقص</th>
                  <th className="text-left">حركة المخزن</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isLow = item.quantity <= item.minimumStock
                  return (
                    <tr key={item.id} className={isLow ? 'bg-danger/5' : ''}>
                      <td className="font-bold text-white max-w-[200px] truncate">{item.name}</td>
                      <td><Badge variant="navy">{item.category.split(' ')[0]}</Badge></td>
                      <td className="text-center text-white/50">{item.originalUnit}</td>
                      <td className="text-center">
                        <span className={`num font-xl font-bold ${isLow ? 'text-danger' : 'text-success'}`}>{item.quantity}</span>
                      </td>
                      <td className="text-center num text-white/80">{fmt(item.costPerUnit)} {cur}</td>
                      <td className="text-center">
                        {isLow ? <Badge variant="danger">يسحب! (الحد: {item.minimumStock})</Badge> : <Badge variant="success">آمن</Badge>}
                      </td>
                      <td className="w-32">
                        <div className="flex gap-2 justify-end">
                          <button className="btn-icon-success hover:bg-success/20" title="إضافة رصيد (شراء)" onClick={() => setShowMoveForm({ id: item.id, type: 'in' })}>
                            <Plus size={14} />
                          </button>
                          <button className="btn-icon-warning hover:bg-warning/20" title="صرف رصيد للإنتاج" onClick={() => setShowMoveForm({ id: item.id, type: 'out' })}>
                            <Minus size={14} />
                          </button>
                          <button className="btn-icon-danger hover:bg-danger/20" title="حذف الصنف نهائياً" onClick={() => setDeleteId(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add New Item Modal */}
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="تعريف صنف خامة جديد">
        <div className="space-y-4">
          <Input label="اسم الخامة / الصنف" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="مثال: رول فيلم DTF 60cm" />
          
          <Input 
            label="القسم المرتبط" 
            value={newItem.category} 
            onChange={e => setNewItem({...newItem, category: e.target.value})} 
            placeholder="مثال: قسم الملابس، قسم الطباعة..." 
            list="inventory-categories"
          />
          <datalist id="inventory-categories">
            {uniqueCategories.map(c => <option key={c} value={c} />)}
          </datalist>

          <div className="grid grid-cols-2 gap-3">
            <Input label="الوحدة الكبرى" value={newItem.originalUnit} onChange={e => setNewItem({...newItem, originalUnit: e.target.value})} placeholder="رول, متر, لتر, كجم..." />
            <Input label="الحد الأدنى لطلب الشراء (النواقص)" type="number" value={newItem.minimumStock} onChange={e => setNewItem({...newItem, minimumStock: e.target.value})} />
            <Input label="متوسط تكلفة الوحدة المتوقعة" type="number" value={newItem.costPerUnit} onChange={e => setNewItem({...newItem, costPerUnit: e.target.value})} suffix={cur} hint="سيتم تحديثه تلقائياً عند إدخال فواتير شراء" className="col-span-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost flex-1" onClick={() => setShowAddForm(false)}>إلغاء</button>
            <button className="btn-gold flex-1" onClick={handleAddNewItem}>حفظ الصنف ببطاقة المخزن</button>
          </div>
        </div>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal open={!!showMoveForm} onClose={() => setShowMoveForm(null)} title={showMoveForm?.type === 'in' ? 'إذن إضافة توريد (شراء)' : 'إذن صرف خامات للإنتاج'}>
        <div className="space-y-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
            <p className="text-sm font-bold text-white">{items.find(i => i.id === showMoveForm?.id)?.name}</p>
            <Badge variant="muted">الرصيد: {items.find(i => i.id === showMoveForm?.id)?.quantity} {items.find(i => i.id === showMoveForm?.id)?.originalUnit}</Badge>
          </div>

          <Input label="الكمية" type="number" value={moveQuantity} onChange={e => setMoveQuantity(e.target.value)} autoFocus />
          
          {showMoveForm?.type === 'in' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="سعر الوحدة الحالي" type="number" value={moveCost} onChange={e => setMoveCost(e.target.value)} suffix={cur} />
                <Input label="إجمالي الفاتورة" value={fmt((parseFloat(moveQuantity) || 0) * (parseFloat(moveCost) || 0))} disabled suffix={cur} />
              </div>
              
              <Select 
                label="المورد (اختياري لربط الحسابات)"
                options={[{ value: '', label: 'بدون مورد (شراء نقدي)' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
              />

              <Input 
                label="المبلغ المدفوع حالياً (من الخزينة)" 
                type="number" 
                value={paymentAmount} 
                onChange={e => setPaymentAmount(e.target.value)} 
                suffix={cur}
                hint={selectedSupplier ? "الباقي سيتم إضافته كمديونية للمورد" : "سيتم خصمه مباشرة من الخزينة"}
              />
            </>
          )}

          <Input label="مرجع الحركة (أو الملاحظات)" value={moveRef} onChange={e => setMoveRef(e.target.value)} placeholder={showMoveForm?.type === 'in' ? "فاتورة رقم 50 من مورد النور" : "أوردر سيلك سكرين رقم SLK-010"} />

          <div className="flex gap-2 mt-4">
            <button className="btn-ghost flex-1" onClick={() => setShowMoveForm(null)}>إلغاء والتراجع</button>
            <button className={`flex-1 font-bold ${showMoveForm?.type === 'in' ? 'btn-success' : 'btn-danger'}`} onClick={handleStockMove}>
              {showMoveForm?.type === 'in' ? 'تأكيد إضافة الرصيد' : 'تأكيد صرف الكمية'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد حذف الخامة"
        footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDeleteItem}>حذف نهائياً</button></>}>
        <p className="text-sm text-white/70">تحذير: سيتم مسح هذا الصنف وكل تواريخ حركته. هل أنت متأكد؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hidden print template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <InventoryReportTemplate
          ref={printRef}
          items={filteredItems}
          filterLabel={filterCat === 'All' ? 'كل الأقسام' : filterCat}
        />
      </div>
    </div>
  )
}

export default Inventory
