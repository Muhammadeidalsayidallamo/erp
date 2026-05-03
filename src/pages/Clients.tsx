import React, { useState } from 'react'
import { Users, UserPlus, CreditCard, Clock, FileText, ChevronDown, Trash2, Printer, Search, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClientsStore, type Client, type Transaction } from '../store/useClientsStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { fmt } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import {
  Input, PageHeader, MetricCard, EmptyState, Card, Modal, Toast, Badge
} from '../components/ui'

const Clients: React.FC = () => {
  const { clients, transactions, addClient, updateClient, deleteClient, addTransaction, deleteTransaction, clearAll } = useClientsStore()
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'

  const [view, setView] = useState<'list' | 'transactions'>('list')
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [showAddClient, setShowAddClient] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null)
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // New Client Form
  const [clientForm, setClientForm] = useState({ name: '', phone: '', company: '' })
  
  // New Transaction Form
  const [txForm, setTxForm] = useState({ amount: '', type: 'payment' as 'payment' | 'debt', notes: '' })

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalDebts = clients.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0)
  const totalCreditors = clients.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0)

  const handleCreateClient = () => {
    if (!clientForm.name.trim()) {
      setToast({ msg: 'يرجى إدخال اسم العميل', type: 'error' })
      return
    }
    addClient(clientForm)
    setShowAddClient(false)
    setClientForm({ name: '', phone: '', company: '' })
    setToast({ msg: 'تم إضافة العميل بنجاح', type: 'success' })
  }

  const handleCreateTx = () => {
    if (!activeClient) return
    const amt = parseFloat(txForm.amount)
    if (isNaN(amt) || amt <= 0) {
      setToast({ msg: 'يرجى إدخال مبلغ صحيح', type: 'error' })
      return
    }
    addTransaction({
      clientId: activeClient.id,
      orderId: null,
      amount: amt,
      type: txForm.type,
      notes: txForm.notes || (txForm.type === 'payment' ? 'سداد نقدية' : 'إضافة مديونية بقيد يدوي')
    })
    
    // 🔗 ERP LINKAGE: Update Treasury if it's a cash payment
    if (txForm.type === 'payment') {
      useTreasuryStore.getState().addTransaction({
        amount: amt,
        type: 'income_client',
        isIncome: true,
        notes: `دفعة من العميل: ${activeClient.name} - ${txForm.notes || 'سداد نقدية'}`,
        referenceId: activeClient.id
      })
    }
    
    setShowAddTx(false)
    setTxForm({ amount: '', type: 'payment', notes: '' })
    setToast({ msg: 'تم تسجيل العملية وتسميعها في الخزينة بنجاح', type: 'success' })
    // Refresh active client info
    const updatedClient = useClientsStore.getState().clients.find(c => c.id === activeClient.id)
    if (updatedClient) setActiveClient(updatedClient)
  }

  const handleExportExcel = () => {
    const data = filteredClients.map(c => ({
      'كود العميل': c.id.slice(0, 8),
      'اسم العميل': c.name,
      'الشركة': c.company || '—',
      'رقم الهاتف': c.phone || '—',
      'إجمالي الديون/الرصيد': c.balance,
      'تاريخ الإضافة': new Date(c.createdAt).toLocaleDateString('ar-EG'),
      'العملة': cur
    }))
    exportToExcel(data, `ProTex_Clients_Report_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملاء والديون"
        subtitle={`${clients.length} عميل مُسجل`}
        icon={<Users size={18} />}
        actions={
          <div className="flex gap-2">
            {view === 'transactions' && (
              <button className="btn-ghost" onClick={() => { setView('list'); setActiveClient(null) }}>العودة للقائمة</button>
            )}
            {clients.length > 0 && view === 'list' && (
              <>
                <button className="btn-ghost hidden md:flex" onClick={handleExportExcel}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn-ghost text-danger border-danger/30 hover:bg-danger/10" onClick={() => setShowClear(true)}>
                  <Trash2 size={14} /> مسح الكل
                </button>
              </>
            )}
            <button className="btn-gold" onClick={() => setShowAddClient(true)}>
              <UserPlus size={14} /> عميل جديد
            </button>
          </div>
        }
      />

      {view === 'list' && (
        <React.Fragment>
          <div className="flex flex-col md:flex-row gap-4 mb-4 print:hidden">
            <Input 
              prefix={<Search size={14} />} 
              placeholder="ابحث عن عميل..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="md:w-64"
            />
          </div>

          {(totalDebts > 0 || totalCreditors > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-5 print:hidden">
              <MetricCard label="إجمالي ديون مستحقة (ديون السوق لنا)" value={`${fmt(totalDebts)} ${cur}`} variant="danger" large />
              <MetricCard label="أرصدة للعملاء (عربون زائد/دائن)" value={`${fmt(totalCreditors)} ${cur}`} variant="success" />
            </div>
          )}

          {filteredClients.length === 0 ? (
            <Card>
              <EmptyState 
                icon={<Users />} 
                title="لا يوجد عملاء مطاقبون" 
                description="لم يتم العثور على عملاء بهذا الاسم"
                action={<button className="btn-gold" onClick={() => setShowAddClient(true)}><UserPlus size={14} /> عميل جديد</button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredClients.map(client => (
                <motion.div 
                  key={client.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`card p-4 border cursor-pointer hover:bg-white/5 transition-colors ${
                    client.balance < 0 ? 'border-danger/30' : client.balance > 0 ? 'border-success/30' : 'border-white/5'
                  }`}
                  onClick={() => { setActiveClient(client); setView('transactions') }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-lg text-white/50">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-0.5">{client.name}</h3>
                        <p className="text-xs text-white/40">{client.company || 'فرد'} · {client.phone || 'بدون رقم'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="text-[10px] text-white/30 mb-0.5">الرصيد</p>
                        {client.balance === 0 ? (
                          <Badge variant="muted">خالص (0)</Badge>
                        ) : client.balance < 0 ? (
                          <p className="text-danger font-bold num">{fmt(Math.abs(client.balance))} {cur} (مدين)</p>
                        ) : (
                          <p className="text-success font-bold num">{fmt(client.balance)} {cur} (دائن)</p>
                        )}
                      </div>
                      <button className="btn-icon-danger opacity-60 hover:opacity-100" onClick={e => { e.stopPropagation(); setDeleteClientId(client.id) }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </React.Fragment>
      )}

      {view === 'transactions' && activeClient && (
        <div className="space-y-4">
          <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{activeClient.name}</h2>
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span>{activeClient.company}</span>
                {activeClient.phone && <span>· {activeClient.phone}</span>}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-0.5">الرصيد الحالي</p>
                <div className={`text-2xl font-black num ${
                  activeClient.balance < 0 ? 'text-danger' : activeClient.balance > 0 ? 'text-success' : 'text-white'
                }`}>
                  {fmt(Math.abs(activeClient.balance))} <span className="text-sm font-normal text-white/40">{cur}</span>
                  {activeClient.balance !== 0 && (
                     <span className="text-sm mr-2">{activeClient.balance < 0 ? '(مدين - عليه)' : '(دائن - له)'}</span>
                  )}
                </div>
              </div>
              <button className="btn-ghost hidden md:flex" onClick={() => window.print()}>
                <Printer size={15} /> طباعة كشف حساب
              </button>
              <button className="btn-gold" onClick={() => setShowAddTx(true)}>
                <CreditCard size={15} /> إضافة حركة
              </button>
            </div>
          </Card>

          <div className="hidden print:block mb-8 text-center border-b pb-4 border-black">
            <h1 className="text-2xl font-black mb-2">كشف حساب عميل</h1>
            <h2 className="text-xl">{activeClient.name} {activeClient.company && `(${activeClient.company})`}</h2>
            <p>الرصيد الحالي المستحق: {activeClient.balance < 0 ? 'عليه مدين' : 'له دائن'} {fmt(Math.abs(activeClient.balance))} {cur}</p>
          </div>

          <h3 className="section-title print:hidden">سجل الحساب المالي (Ledger)</h3>
          
          <div className="space-y-2">
            {transactions.filter(t => t.clientId === activeClient.id).length === 0 ? (
              <EmptyState 
                icon={<Clock />} 
                title="لا توجد حركات مالية" 
                description="لم يتم تسجيل أي مديونيات أو مدفوعات لهذا العميل" 
              />
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>نوع الحركة</th>
                    <th>البيان / ملاحظات</th>
                    <th>المبلغ</th>
                    <th className="w-10 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => t.clientId === activeClient.id)
                    .sort((a,b) => b.date.localeCompare(a.date))
                    .map(tx => (
                    <tr key={tx.id}>
                      <td className="text-white/60">{tx.date}</td>
                      <td>
                        <Badge variant={tx.type === 'payment' ? 'success' : 'danger'}>
                          {tx.type === 'payment' ? 'سداد (قبض)' : 'مديونية (أوردر)'}
                        </Badge>
                      </td>
                      <td className="text-white/80">{tx.notes} {tx.orderId && <span className="text-[10px] text-white/30">(مربوط بفيلم/أوردر)</span>}</td>
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

      {/* Add Client Modal */}
      <Modal open={showAddClient} onClose={() => setShowAddClient(false)} title="إضافة عميل جديد" footer={
        <>
          <button className="btn-ghost" onClick={() => setShowAddClient(false)}>إلغاء</button>
          <button className="btn-gold" onClick={handleCreateClient}>حفظ العميل</button>
        </>
      }>
        <div className="space-y-3">
          <Input label="اسم العميل" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} placeholder="الاسم الرباعي أو الشهرة" />
          <Input label="الشركة / العلامة التجارية" value={clientForm.company} onChange={e => setClientForm({...clientForm, company: e.target.value})} placeholder="(اختياري)" />
          <Input label="رقم الهاتف" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} placeholder="(اختياري)" dir="ltr" />
        </div>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal open={showAddTx} onClose={() => setShowAddTx(false)} title="تسجيل حركة مالية" footer={
        <>
          <button className="btn-ghost" onClick={() => setShowAddTx(false)}>إلغاء</button>
          <button className="btn-success" onClick={handleCreateTx}>تأكيد الحركة</button>
        </>
      }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button
              className={`p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                txForm.type === 'payment' ? 'bg-success/20 border-success/50 text-success' : 'bg-bg-card border-white/10 text-white/40'
              }`}
              onClick={() => setTxForm({...txForm, type: 'payment'})}
            >
               استلام دفعة / سداد
            </button>
            <button
              className={`p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                txForm.type === 'debt' ? 'bg-danger/20 border-danger/50 text-danger' : 'bg-bg-card border-white/10 text-white/40'
              }`}
              onClick={() => setTxForm({...txForm, type: 'debt'})}
            >
              تسجيل مديونية
            </button>
          </div>
          <Input label="المبلغ" type="number" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} suffix={cur} placeholder="0" />
          <Input label="البيان / ملاحظات" value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} placeholder="مثال: دفعة عربون أو ديون سابقة" />
        </div>
      </Modal>

      <Modal open={showClear} onClose={() => setShowClear(false)} title="تأكيد مسح جميع العملاء"
        footer={<><button className="btn-ghost" onClick={() => setShowClear(false)}>إلغاء</button><button className="btn-danger" onClick={() => { clearAll(); setShowClear(false); setToast({ msg: 'تم مسح جميع بيانات العملاء', type: 'error' }) }}>نعم، امسح</button></>}>
        <p className="text-sm text-white/70">سيتم حذف {clients.length} عميل وجميع سجلاتهم. هذا الإجراء لا رجعة فيه!</p>
      </Modal>

      <Modal open={!!deleteClientId} onClose={() => setDeleteClientId(null)} title="حذف عميل"
        footer={<><button className="btn-ghost" onClick={() => setDeleteClientId(null)}>إلغاء</button><button className="btn-danger" onClick={() => { if(deleteClientId) { deleteClient(deleteClientId); setDeleteClientId(null); setToast({ msg: 'تم حذف العميل', type: 'error' }) } }}>حذف نهائياً</button></>}>
        <p className="text-sm text-white/70">سيتم حذف العميل وجميع سجلاته المالية نهائياً. هل أنت متأكد؟</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Clients
