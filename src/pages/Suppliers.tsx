import React, { useState } from 'react'
import { Truck, UserPlus, CreditCard, Clock, Trash2, Printer, Search, Edit3, Check, X, AlertTriangle, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSuppliersStore, type Supplier } from '../store/useSuppliersStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { fmt } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import {
  Input, PageHeader, MetricCard, EmptyState, Card, Modal, Toast, Badge
} from '../components/ui'

const Suppliers: React.FC = () => {
  const { suppliers, transactions, addSupplier, updateSupplier, deleteSupplier, clearAll, addTransaction, deleteTransaction } = useSuppliersStore()
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'

  const [view, setView] = useState<'list' | 'transactions'>('list')
  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', contactPhone: '', company: '' })

  // New Supplier Form
  const [suppForm, setSuppForm] = useState({ name: '', contactPhone: '', company: '', supplyType: '' })
  
  // New Transaction Form
  const [txForm, setTxForm] = useState({ amount: '', type: 'debt' as 'payment' | 'debt', notes: '' })

  const handleStartEdit = (e: React.MouseEvent, supp: Supplier) => {
    e.stopPropagation()
    setEditingId(supp.id)
    setEditForm({ name: supp.name, contactPhone: supp.contactPhone, company: supp.company })
  }

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editingId) return
    if (!editForm.name.trim() || !editForm.company.trim()) {
      setToast({ msg: 'الاسم والشركة مطلوبان', type: 'error' })
      return
    }
    updateSupplier(editingId, editForm)
    setEditingId(null)
    setToast({ msg: 'تم تحديث بيانات المورد', type: 'success' })
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleDeleteSupplier = () => {
    if (deleteId) {
      deleteSupplier(deleteId)
      setDeleteId(null)
      setToast({ msg: 'تم حذف المورد وكافة سجلاته', type: 'error' })
    }
  }

  const handleClearAll = () => {
    clearAll()
    setShowClearConfirm(false)
    setToast({ msg: 'تم مسح كافة الموردين', type: 'error' })
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.company && s.company.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalOwed = suppliers.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0)

  const handleExportExcel = () => {
    const data = filteredSuppliers.map(s => ({
      'كود المورد': s.id.slice(0, 8),
      'اسم المورد/المندوب': s.name,
      'اسم الشركة': s.company,
      'رقم الهاتف': s.contactPhone || '—',
      'نوع البضاعة': s.supplyType || '—',
      'إجمالي الديون علينا': s.balance,
      'تاريخ الإضافة': new Date(s.createdAt).toLocaleDateString('ar-EG'),
      'العملة': cur
    }))
    exportToExcel(data, `ProTex_Suppliers_Report_${new Date().toISOString().split('T')[0]}`)
  }

  const handleCreateSupplier = () => {
    if (!suppForm.name.trim() || !suppForm.company.trim()) {
      setToast({ msg: 'يرجى إدخال اسم المورد والشركة', type: 'error' })
      return
    }
    addSupplier(suppForm)
    setShowAddSupplier(false)
    setSuppForm({ name: '', contactPhone: '', company: '', supplyType: '' })
    setToast({ msg: 'تم إضافة المورد بنجاح', type: 'success' })
  }

  const handleCreateTx = () => {
    if (!activeSupplier) return
    const amt = parseFloat(txForm.amount)
    if (isNaN(amt) || amt <= 0) {
      setToast({ msg: 'يرجى إدخال مبلغ صحيح', type: 'error' })
      return
    }
    addTransaction({
      supplierId: activeSupplier.id,
      amount: amt,
      type: txForm.type,
      notes: txForm.notes || (txForm.type === 'payment' ? 'سداد لمورد' : 'إضافة مديونية لمورد (شراء بضاعة)')
    })
    
    // 🔗 ERP LINKAGE: Update Treasury if we paid the supplier cash
    if (txForm.type === 'payment') {
      useTreasuryStore.getState().addTransaction({
        amount: amt,
        type: 'expense_supplier',
        isIncome: false,
        notes: `دفع نقدية للمورد: ${activeSupplier.company} - ${txForm.notes || 'سداد بضاعة'}`,
        referenceId: activeSupplier.id
      })
    }

    setShowAddTx(false)
    setTxForm({ amount: '', type: 'debt', notes: '' })
    setToast({ msg: 'تم تسجيل العملية وتسميعها في الخزينة بنجاح', type: 'success' })
    const updatedSupp = useSuppliersStore.getState().suppliers.find(c => c.id === activeSupplier.id)
    if (updatedSupp) setActiveSupplier(updatedSupp)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الموردين والمشتريات"
        subtitle={`${suppliers.length} مورد مسجل`}
        icon={<Truck size={18} />}
        actions={
          <div className="flex gap-2">
            {view === 'transactions' && (
              <button className="btn-ghost" onClick={() => { setView('list'); setActiveSupplier(null) }}>القائمة</button>
            )}
            {view === 'list' && suppliers.length > 0 && (
              <>
                <button className="btn-ghost hidden md:flex" onClick={handleExportExcel}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn-ghost text-danger border-danger/20 hover:bg-danger/10" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 size={14} /> مسح الكل
                </button>
              </>
            )}
            <button className="btn-gold" onClick={() => setShowAddSupplier(true)}>
              <UserPlus size={14} /> مورد جديد
            </button>
          </div>
        }
      />

      {view === 'list' && (
        <React.Fragment>
          <div className="flex flex-col md:flex-row gap-4 mb-4 print:hidden">
            <Input 
              prefix={<Search size={14} />} 
              placeholder="ابحث عن مورد..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="md:w-64"
            />
          </div>

          {suppliers.length > 0 && (
            <div className="grid grid-cols-1 mb-5 print:hidden">
              <MetricCard label="إجمالي ديون الموردين (التزامات للمصنع)" value={`${fmt(totalOwed)} ${cur}`} variant="danger" large />
            </div>
          )}

          {filteredSuppliers.length === 0 ? (
            <Card>
              <EmptyState 
                icon={<Truck />} 
                title="لا يوجد موردين بعد" 
                description="سجل بيانات تجار القماش والأحبار لتبدأ بتنظيم ديون السوق"
                action={<button className="btn-gold" onClick={() => setShowAddSupplier(true)}><UserPlus size={14} /> مورد جديد</button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSuppliers.map(supp => (
                <motion.div 
                  key={supp.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`card p-4 border cursor-pointer hover:bg-white/5 transition-colors ${
                    supp.balance < 0 ? 'border-danger/30' : 'border-white/5'
                  }`}
                  onClick={() => { if (!editingId) { setActiveSupplier(supp); setView('transactions') } }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-navy-light flex items-center justify-center font-bold text-lg text-white flex-shrink-0">
                        {supp.name.charAt(0)}
                      </div>
                      
                      {editingId === supp.id ? (
                        <div className="flex flex-col gap-2 flex-1 mr-2" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <input 
                              className="bank-input flex-1 h-8 text-xs" 
                              value={editForm.company} 
                              onChange={e => setEditForm({...editForm, company: e.target.value})}
                              placeholder="الشركة"
                            />
                            <input 
                              className="bank-input flex-1 h-8 text-xs" 
                              value={editForm.name} 
                              onChange={e => setEditForm({...editForm, name: e.target.value})}
                              placeholder="الاسم"
                            />
                          </div>
                          <input 
                            className="bank-input w-full h-8 text-xs" 
                            value={editForm.contactPhone} 
                            onChange={e => setEditForm({...editForm, contactPhone: e.target.value})}
                            placeholder="رقم الهاتف"
                            dir="ltr"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-0.5">{supp.company}</h3>
                          <p className="text-xs text-white/40">{supp.name} · {supp.supplyType}</p>
                          {supp.contactPhone && <p className="text-[10px] text-white/30 num" dir="ltr">{supp.contactPhone}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left hidden sm:block">
                        <p className="text-[10px] text-white/30 mb-0.5">الرصيد المتبقي</p>
                        {supp.balance === 0 ? (
                          <Badge variant="muted">حساب مصفر</Badge>
                        ) : supp.balance < 0 ? (
                          <p className="text-danger font-bold num text-sm">{fmt(Math.abs(supp.balance))} {cur}</p>
                        ) : (
                          <p className="text-success font-bold num text-sm">{fmt(supp.balance)} {cur}</p>
                        )}
                      </div>

                      <div className="flex gap-2 mr-2">
                        {editingId === supp.id ? (
                          <>
                            <button className="w-8 h-8 rounded-lg bg-success/20 text-success hover:bg-success/30 flex items-center justify-center transition-colors" onClick={handleSaveEdit}>
                              <Check size={14} />
                            </button>
                            <button className="w-8 h-8 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center transition-colors" onClick={handleCancelEdit}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="w-8 h-8 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors" 
                              onClick={(e) => handleStartEdit(e, supp)}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              className="w-8 h-8 rounded-lg bg-danger/10 text-danger/60 hover:bg-danger/20 flex items-center justify-center transition-colors" 
                              onClick={(e) => { e.stopPropagation(); setDeleteId(supp.id) }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </React.Fragment>
      )}

      {view === 'transactions' && activeSupplier && (
        <div className="space-y-4">
          <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-blue-600 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{activeSupplier.company}</h2>
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span>{activeSupplier.name}</span>
                {activeSupplier.contactPhone && <span>· {activeSupplier.contactPhone}</span>}
                <Badge variant="navy">{activeSupplier.supplyType}</Badge>
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-0.5">الالتزامات تجاه المورد</p>
                <div className={`text-2xl font-black num ${
                  activeSupplier.balance < 0 ? 'text-danger' : activeSupplier.balance > 0 ? 'text-success' : 'text-white'
                }`}>
                  {fmt(Math.abs(activeSupplier.balance))} <span className="text-sm font-normal text-white/40">{cur}</span>
                  {activeSupplier.balance !== 0 && (
                     <span className="text-sm mr-2">{activeSupplier.balance < 0 ? '(مستحق الدفع للمورد)' : '(مدفوع بزيادة)'}</span>
                  )}
                </div>
              </div>
              <button className="btn-ghost hidden md:flex" onClick={() => window.print()}>
                <Printer size={15} /> طباعة دفتر المورد
              </button>
              <button className="btn-gold" onClick={() => setShowAddTx(true)}>
                <CreditCard size={15} /> تسجيل فاتورة / سداد
              </button>
            </div>
          </Card>

          <div className="hidden print:block mb-8 text-center border-b pb-4 border-black">
            <h1 className="text-2xl font-black mb-2">كشف حساب مورد</h1>
            <h2 className="text-xl">{activeSupplier.company} ({activeSupplier.name})</h2>
            <p className="mt-2 text-lg">الرصيد المستحق: {activeSupplier.balance < 0 ? 'عليه (ديون لنا)' : 'بالسالب (ديون علينا)'} {fmt(Math.abs(activeSupplier.balance))} {cur}</p>
          </div>

          <h3 className="section-title print:hidden">دفتر فواتير وسداد المورد</h3>
          
          <div className="space-y-2">
            {transactions.filter(t => t.supplierId === activeSupplier.id).length === 0 ? (
              <EmptyState 
                icon={<Clock />} 
                title="لا توجد حركات مسجلة" 
                description="ابدأ بإضافة فاتورة شراء بضاعة أو سداد جزء من المبلغ المورد" 
              />
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>نوع الحركة</th>
                    <th>البيان / الفاتورة</th>
                    <th>المبلغ</th>
                    <th className="w-10 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => t.supplierId === activeSupplier.id)
                    .sort((a,b) => b.date.localeCompare(a.date))
                    .map(tx => (
                    <tr key={tx.id}>
                      <td className="text-white/60">{tx.date}</td>
                      <td>
                        <Badge variant={tx.type === 'payment' ? 'success' : 'danger'}>
                          {tx.type === 'payment' ? 'سداد نقدية' : 'فاتورة مشتريات'}
                        </Badge>
                      </td>
                      <td className="text-white/80">{tx.notes}</td>
                      <td className={`num font-bold ${tx.type === 'payment' ? 'text-success print:text-black' : 'text-danger print:text-black'}`}>
                        {tx.type === 'payment' ? '+' : '-'}{fmt(tx.amount)} {cur}
                      </td>
                      <td className="print:hidden">
                        <button className="btn-icon-ghost text-danger hover:bg-danger/20" onClick={() => deleteTransaction(tx.id)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={showAddSupplier} onClose={() => setShowAddSupplier(false)} title="إضافة مورد جديد" footer={
        <>
          <button className="btn-ghost" onClick={() => setShowAddSupplier(false)}>إلغاء</button>
          <button className="btn-gold" onClick={handleCreateSupplier}>حفظ المورد</button>
        </>
      }>
        <div className="space-y-3">
          <Input label="الشركة أو اسم المحل" value={suppForm.company} onChange={e => setSuppForm({...suppForm, company: e.target.value})} placeholder="مثال: شركة النور للأقمشة" />
          <Input label="اسم التاجر أو المسئول" value={suppForm.name} onChange={e => setSuppForm({...suppForm, name: e.target.value})} placeholder="الاسم" />
          <Input label="تخصص التوريد" value={suppForm.supplyType} onChange={e => setSuppForm({...suppForm, supplyType: e.target.value})} placeholder="مثال: أقمشة بولو، أحبار سيلك سكرين" />
          <Input label="رقم الهاتف" value={suppForm.contactPhone} onChange={e => setSuppForm({...suppForm, contactPhone: e.target.value})} placeholder="(اختياري)" dir="ltr" />
        </div>
      </Modal>

      <Modal open={showAddTx} onClose={() => setShowAddTx(false)} title="تسجيل حركة مورد" footer={
        <>
          <button className="btn-ghost" onClick={() => setShowAddTx(false)}>إلغاء</button>
          <button className="btn-success" onClick={handleCreateTx}>تأكيد التسجيل</button>
        </>
      }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button
              className={`p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                txForm.type === 'debt' ? 'bg-danger/20 border-danger/50 text-danger' : 'bg-bg-card border-white/10 text-white/40'
              }`}
              onClick={() => setTxForm({...txForm, type: 'debt'})}
            >
              شراء بضاعة (دين علينا)
            </button>
            <button
              className={`p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                txForm.type === 'payment' ? 'bg-success/20 border-success/50 text-success' : 'bg-bg-card border-white/10 text-white/40'
              }`}
              onClick={() => setTxForm({...txForm, type: 'payment'})}
            >
              سداد نقدية למورد
            </button>
          </div>
          <Input label="المبلغ" type="number" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} suffix={cur} placeholder="0" />
          <Input label="البيان / الفاتورة" value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} placeholder={txForm.type === 'debt' ? 'مثال: فاتورة قماش رقم 88' : 'مثال: سداد نقدي للمندوب'} />
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد حذف مورد" footer={
        <>
          <button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button>
          <button className="btn-danger" onClick={handleDeleteSupplier}>حذف المورد</button>
        </>
      }>
        <div className="flex items-center gap-3 text-white/80">
          <AlertTriangle className="text-danger flex-shrink-0" size={24} />
          <p className="text-sm">
            هل أنت متأكد من حذف المورد <span className="font-bold text-white">[{suppliers.find(s => s.id === deleteId)?.name}]</span>؟
            <br /> سيتم حذف جميع بياناته وسجلات الفواتير الخاصة به نهائياً.
          </p>
        </div>
      </Modal>

      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="تأكيد مسح كافة الموردين" footer={
        <>
          <button className="btn-ghost" onClick={() => setShowClearConfirm(false)}>إلغاء</button>
          <button className="btn-danger" onClick={handleClearAll}>تأكيد الحذف الكلي</button>
        </>
      }>
        <div className="flex items-center gap-3 text-white/80">
          <AlertTriangle className="text-danger flex-shrink-0" size={24} />
          <p className="text-sm">
            سيتم حذف جميع الموردين وسجلاتهم من النظام. هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Suppliers
