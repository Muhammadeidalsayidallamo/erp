import React, { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Users, UserPlus, Scissors, Plus, Trash2, Calendar, ArrowDownRight, Receipt, Printer } from 'lucide-react'
import { PageHeader, Card, Input, Toast, Badge, Modal, Grid } from '../components/ui'
import { usePieceworkersStore, Pieceworker } from '../store/usePieceworkersStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { useProductionStore } from '../store/useProductionStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { generateId, todayISO, fmt, n } from '../utils/calculations'
import { PieceworkerStatementTemplate } from '../components/ui/PieceworkersPrintTemplate'

const PieceworkersLedger: React.FC = () => {
  const { workers, tickets, advances, payments, addWorker, updateWorker, deleteWorker, addTicket, deleteTicket, addAdvance, deleteAdvance, addPayment, deletePayment, payPieceworker, payAllUnpaid } = usePieceworkersStore()
  const { clothingOrders } = useOrdersStore()
  const { models } = useProductionStore()
  const treasury = useTreasuryStore()

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })

  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', role: 'خياط' })

  // Active Worker Modals
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Ticket Form
  const [ticketForm, setTicketForm] = useState({
    date: todayISO(),
    orderId: '',
    type: 'whole' as 'whole' | 'stage',
    stageName: '',
    quantity: '',
    pricePerPiece: '',
    notes: ''
  })

  // Advance / Payment Form
  const [moneyForm, setMoneyForm] = useState({
    date: todayISO(),
    amount: '',
    notes: ''
  })

  const activeWorker = workers.find(w => w.id === activeWorkerId)

  // Calculations
  const workerTickets = tickets.filter(t => t.workerId === activeWorkerId)
  const workerAdvances = advances.filter(a => a.workerId === activeWorkerId)
  const workerPayments = payments.filter(p => p.workerId === activeWorkerId)

  const totalEarned = workerTickets.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalAdvances = workerAdvances.reduce((sum, a) => sum + a.amount, 0)
  const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0)
  const currentBalance = totalEarned - totalAdvances - totalPaid

  const hasUnpaidTickets = workerTickets.some(t => !t.isPaid)

  const handleAddWorker = () => {
    if (!newWorker.name) return setToast({ msg: 'يرجى إدخال اسم الصنايعي', type: 'error' })
    const w: Pieceworker = {
      id: generateId(),
      name: newWorker.name,
      phone: newWorker.phone,
      role: newWorker.role,
      joinDate: todayISO()
    }
    addWorker(w)
    setShowAddWorker(false)
    setNewWorker({ name: '', phone: '', role: 'خياط' })
    setActiveWorkerId(w.id)
    setToast({ msg: 'تم إضافة الصنايعي بنجاح', type: 'success' })
  }

  const handleOrderSelect = (orderId: string) => {
    const order = clothingOrders.find(o => o.id === orderId)
    if (!order) return
    
    // Auto-detect type based on order's productionStyle
    const type = order.productionStyle === 'whole' ? 'whole' : 'stage'
    let price = 0

    if (type === 'whole') {
      price = order.wholePieceLaborCost || 0
    }

    setTicketForm(prev => ({
      ...prev,
      orderId,
      type,
      stageName: '', // reset stage
      pricePerPiece: price ? String(price) : ''
    }))
  }

  const handleStageSelect = (stageName: string) => {
    const order = clothingOrders.find(o => o.id === ticketForm.orderId)
    if (!order || !order.modelId) return

    const model = models.find(m => m.id === order.modelId)
    if (!model) return

    const stage = model.stages.find(s => s.name === stageName)
    if (stage) {
      setTicketForm(prev => ({
        ...prev,
        stageName,
        pricePerPiece: String(stage.pricePiastres / 100) // Convert piastres to EGP
      }))
    }
  }

  const handleAddTicket = () => {
    if (!activeWorkerId) return
    const order = clothingOrders.find(o => o.id === ticketForm.orderId)
    if (!order) return setToast({ msg: 'يرجى اختيار الأوردر أولاً', type: 'error' })
    if (n(ticketForm.quantity) <= 0) return setToast({ msg: 'يرجى إدخال كمية صحيحة', type: 'error' })
    if (n(ticketForm.pricePerPiece) <= 0) return setToast({ msg: 'يرجى إدخال أجر القطعة', type: 'error' })

    const qty = n(ticketForm.quantity)
    const price = n(ticketForm.pricePerPiece)
    const total = qty * price

    addTicket({
      id: generateId(),
      workerId: activeWorkerId,
      date: ticketForm.date,
      orderId: order.id,
      orderNumber: order.orderNumber,
      modelName: order.factoryName ? `${order.orderNumber} - ${order.factoryName}` : order.orderNumber,
      type: ticketForm.type,
      stageName: ticketForm.type === 'stage' ? ticketForm.stageName : undefined,
      quantity: qty,
      pricePerPiece: price,
      totalAmount: total,
      notes: ticketForm.notes,
      isPaid: false
    })

    setShowTicketModal(false)
    setTicketForm({ date: todayISO(), orderId: '', type: 'whole', stageName: '', quantity: '', pricePerPiece: '', notes: '' })
    setToast({ msg: 'تم تسجيل الإنتاج بنجاح', type: 'success' })
  }

  const handleAddAdvance = () => {
    if (!activeWorkerId || n(moneyForm.amount) <= 0) return
    const amount = n(moneyForm.amount)
    
    addAdvance({
      id: generateId(),
      workerId: activeWorkerId,
      date: moneyForm.date,
      amount,
      notes: moneyForm.notes
    })

    // Register in treasury
    treasury.addTransaction({
      amount,
      type: 'expense_factory',
      isIncome: false,
      notes: `سلفة للصنايعي: ${activeWorker?.name} - ${moneyForm.notes}`
    })

    setShowAdvanceModal(false)
    setMoneyForm({ date: todayISO(), amount: '', notes: '' })
    setToast({ msg: 'تم تسجيل السلفة وخصمها من الخزينة', type: 'success' })
  }

  const handleAddPayment = () => {
    if (!activeWorkerId || n(moneyForm.amount) <= 0) return
    const amount = n(moneyForm.amount)
    
    addPayment({
      id: generateId(),
      workerId: activeWorkerId,
      date: moneyForm.date,
      amount,
      notes: moneyForm.notes || 'تصفية حساب إنتاج'
    })

    // Register in treasury
    treasury.addTransaction({
      amount,
      type: 'expense_factory',
      isIncome: false,
      notes: `صرف أرباح/حساب للصنايعي: ${activeWorker?.name} - ${moneyForm.notes}`
    })

    setShowPaymentModal(false)
    setMoneyForm({ date: todayISO(), amount: '', notes: '' })
    setToast({ msg: 'تم تسجيل الصرف وخصمه من الخزينة', type: 'success' })
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Hidden print template */}
      <div style={{ display: 'none' }}>
        {activeWorker && (
          <PieceworkerStatementTemplate
            ref={printRef}
            worker={activeWorker}
            tickets={workerTickets}
            advances={workerAdvances}
            payments={workerPayments}
          />
        )}
      </div>

      <PageHeader
        title="كشوف حساب العمالة والرواتب بالقطعة"
        subtitle="متابعة إنتاج وصرفيات الصنايعية (ورش الملابس)"
        icon={<Scissors size={20} />}
        actions={
          <div className="flex gap-2">
            {hasUnpaidTickets && (
              <button 
                className="btn-success text-sm py-1.5" 
                onClick={() => {
                  payAllUnpaid(activeWorkerId!)
                  setToast({ msg: 'تم دفع كافة التذاكر غير المدفوعة وترحيلها للخزينة', type: 'success' })
                }}
              >
                دفع كافة التذاكر 
              </button>
            )}
            {activeWorker && (
              <button className="btn-ghost" onClick={() => handlePrint()}>
                <Printer size={15} /> طباعة كشف {activeWorker.name}
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Workers Sidebar */}
        <Card className="w-80 flex flex-col shrink-0 p-0 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0d1626]">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-gold" />
              قائمة الصنايعية
            </h3>
            <button 
              className="w-8 h-8 rounded-lg bg-gold/10 hover:bg-gold/20 flex items-center justify-center text-gold transition-colors"
              onClick={() => setShowAddWorker(true)}
              title="إضافة صنايعي"
            >
              <UserPlus size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {workers.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">لا يوجد صنايعية مسجلين</div>
            ) : (
              workers.map(w => {
                const wTickets = tickets.filter(t => t.workerId === w.id)
                const wAdvances = advances.filter(a => a.workerId === w.id)
                const wPayments = payments.filter(p => p.workerId === w.id)
                const bal = wTickets.reduce((s, t) => s + t.totalAmount, 0) - wAdvances.reduce((s, a) => s + a.amount, 0) - wPayments.reduce((s, p) => s + p.amount, 0)

                return (
                  <button
                    key={w.id}
                    onClick={() => setActiveWorkerId(w.id)}
                    className={`w-full text-right p-3 rounded-xl transition-all border flex items-center justify-between ${
                      activeWorkerId === w.id 
                        ? 'bg-blue-500/20 border-blue-500/30' 
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white text-sm mb-1">{w.name}</p>
                      <Badge variant="muted" className="text-[10px]">{w.role}</Badge>
                    </div>
                    <div className="text-left">
                      <p className={`font-mono font-bold text-sm ${bal > 0 ? 'text-success' : bal < 0 ? 'text-danger' : 'text-white/40'}`}>
                        {fmt(bal)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {/* Main Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeWorker ? (
            <div className="space-y-6">
              {/* Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 bg-blue-500/5">
                  <p className="text-white/60 text-xs font-bold mb-1">الرصيد المستحق (الصافي)</p>
                  <p className={`text-2xl font-black font-mono ${currentBalance > 0 ? 'text-blue-400' : 'text-white/50'}`}>
                    {fmt(currentBalance)} ج.م
                  </p>
                </Card>
                <Card className="p-5 border-l-4 border-l-success bg-success/5">
                  <p className="text-white/60 text-xs font-bold mb-1">إجمالي ما تم إنتاجه</p>
                  <p className="text-2xl font-black font-mono text-success">
                    {fmt(totalEarned)} ج.م
                  </p>
                </Card>
                <Card className="p-5 border-l-4 border-l-danger bg-danger/5">
                  <p className="text-white/60 text-xs font-bold mb-1">إجمالي السلف</p>
                  <p className="text-2xl font-black font-mono text-danger">
                    {fmt(totalAdvances)} ج.م
                  </p>
                </Card>
                <Card className="p-5 border-l-4 border-l-gold bg-gold/5">
                  <p className="text-white/60 text-xs font-bold mb-1">إجمالي ما تم صرفه (تصفية)</p>
                  <p className="text-2xl font-black font-mono text-gold">
                    {fmt(totalPaid)} ج.م
                  </p>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 btn-success py-3 flex justify-center items-center gap-2" onClick={() => setShowTicketModal(true)}>
                  <Plus size={18} /> تسجيل تذكرة إنتاج
                </button>
                <button className="flex-1 btn-danger py-3 flex justify-center items-center gap-2 bg-danger/20 text-danger hover:bg-danger/30 border-danger/30" onClick={() => setShowAdvanceModal(true)}>
                  <ArrowDownRight size={18} /> صرف سلفة
                </button>
                <button className="flex-1 btn-gold py-3 flex justify-center items-center gap-2" onClick={() => {
                  setMoneyForm(prev => ({ ...prev, amount: String(currentBalance > 0 ? currentBalance : '') }))
                  setShowPaymentModal(true)
                }}>
                  <Receipt size={18} /> تصفية حساب
                </button>
                <button className="btn-ghost py-3 px-4 flex justify-center items-center gap-2" onClick={() => handlePrint()}>
                  <Printer size={16} /> طباعة الكشف
                </button>
              </div>

              {/* History Table */}
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-[#0d1626]">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Calendar size={16} className="text-white/50" />
                    كشف الحساب التفصيلي (العمليات)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-white/5 text-white/50">
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-4">البيان / الأوردر</th>
                        <th className="py-3 px-4">النوع</th>
                        <th className="py-3 px-4">الكمية</th>
                        <th className="py-3 px-4">دائن (له)</th>
                        <th className="py-3 px-4">مدين (عليه)</th>
                        <th className="py-3 px-4 text-center">حالة الدفع</th>
                        <th className="py-3 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Combine and sort all transactions */}
                      {[
                        ...workerTickets.map(t => ({ ...t, _type: 'ticket', _date: new Date(t.date).getTime() })),
                        ...workerAdvances.map(a => ({ ...a, _type: 'advance', _date: new Date(a.date).getTime() })),
                        ...workerPayments.map(p => ({ ...p, _type: 'payment', _date: new Date(p.date).getTime() }))
                      ].sort((a, b) => b._date - a._date).map((item: any) => (
                        <tr key={`${item._type}-${item.id}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-mono text-white/70">{item.date}</td>
                          <td className="py-3 px-4 font-bold">
                            {item._type === 'ticket' && (
                              <div className="flex flex-col">
                                <span className="text-blue-400">إنتاج: {item.modelName}</span>
                                {item.type === 'stage' && <span className="text-xs text-white/40">مرحلة: {item.stageName}</span>}
                              </div>
                            )}
                            {item._type === 'advance' && <span className="text-danger">سلفة نقدية {item.notes && `- ${item.notes}`}</span>}
                            {item._type === 'payment' && <span className="text-gold">صرف/تصفية حساب {item.notes && `- ${item.notes}`}</span>}
                          </td>
                          <td className="py-3 px-4">
                            {item._type === 'ticket' && <Badge variant="navy">إنتاج</Badge>}
                            {item._type === 'advance' && <Badge variant="danger">سلفة</Badge>}
                            {item._type === 'payment' && <Badge variant="gold">تصفية</Badge>}
                          </td>
                          <td className="py-3 px-4 font-mono text-white/60">
                            {item._type === 'ticket' ? `${item.quantity} ق` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-success">
                            {item._type === 'ticket' ? fmt(item.totalAmount) : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-danger">
                            {item._type !== 'ticket' ? fmt(item.amount) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item._type === 'ticket' && (
                              item.isPaid ? (
                                <Badge variant="success" className="text-[10px]">مدفوع</Badge>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="danger" className="text-[10px]">غير مدفوع</Badge>
                                  <button 
                                    className="text-[10px] bg-white/10 hover:bg-success hover:text-white px-2 py-1 rounded transition-colors"
                                    onClick={() => {
                                      payPieceworker(item.id)
                                      setToast({ msg: 'تم الدفع والترحيل للخزينة', type: 'success' })
                                    }}
                                  >
                                    دفع وترحيل
                                  </button>
                                </div>
                              )
                            )}
                          </td>
                          <td className="py-3 px-4 text-left">
                            <button 
                              className="p-2 rounded-lg hover:bg-danger/20 text-danger/50 hover:text-danger transition-colors"
                              onClick={() => {
                                if (window.confirm('هل أنت متأكد من الحذف؟')) {
                                  if (item._type === 'ticket') deleteTicket(item.id)
                                  if (item._type === 'advance') deleteAdvance(item.id)
                                  if (item._type === 'payment') deletePayment(item.id)
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {workerTickets.length === 0 && workerAdvances.length === 0 && workerPayments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-white/30">لا توجد حركات مسجلة لهذا الصنايعي</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <Users size={48} className="mb-4 opacity-20" />
              <p>يرجى اختيار صنايعي من القائمة لعرض كشف الحساب</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      
      {/* Add Worker Modal */}
      <Modal open={showAddWorker} onClose={() => setShowAddWorker(false)} title="إضافة صنايعي جديد"
        footer={<><button className="btn-ghost" onClick={() => setShowAddWorker(false)}>إلغاء</button><button className="btn-gold" onClick={handleAddWorker}>حفظ</button></>}>
        <div className="space-y-4">
          <Input label="الاسم الرباعي" value={newWorker.name} onChange={e => setNewWorker(prev => ({ ...prev, name: e.target.value }))} placeholder="اسم الصنايعي" autoFocus />
          <Input label="رقم الموبايل" value={newWorker.phone} onChange={e => setNewWorker(prev => ({ ...prev, phone: e.target.value }))} placeholder="01X..." />
          <Input label="الوظيفة / التخصص" value={newWorker.role} onChange={e => setNewWorker(prev => ({ ...prev, role: e.target.value }))} placeholder="مثال: خياط، تشطيب، أورليه" />
        </div>
      </Modal>

      {/* Add Ticket Modal */}
      <Modal open={showTicketModal} onClose={() => setShowTicketModal(false)} title={`تسجيل إنتاج لصالح: ${activeWorker?.name}`}
        footer={<><button className="btn-ghost" onClick={() => setShowTicketModal(false)}>إلغاء</button><button className="btn-success" onClick={handleAddTicket}>حفظ وتأكيد</button></>}>
        <div className="space-y-4">
          <Input label="التاريخ" type="date" value={ticketForm.date} onChange={e => setTicketForm(p => ({ ...p, date: e.target.value }))} />
          
          <div>
            <label className="text-xs font-bold text-white/60 block mb-1">الأوردر المرتبط</label>
            <select className="bank-input w-full font-bold" value={ticketForm.orderId} onChange={e => handleOrderSelect(e.target.value)}>
              <option value="">-- اختر أوردر الملابس --</option>
              {clothingOrders.filter(o => o.status !== 'canceled').map(o => (
                <option key={o.id} value={o.id}>
                  أوردر {o.orderNumber} - {o.factoryName || 'بدون مصنع'} ({o.productionStyle === 'whole' ? 'نظام حتة كاملة' : 'نظام مراحل'})
                </option>
              ))}
            </select>
          </div>

          {ticketForm.type === 'stage' && ticketForm.orderId && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <label className="text-xs font-bold text-blue-400 block mb-1">اختيار المرحلة (مسحوبة من مخطط العمليات)</label>
              <select className="bank-input w-full text-blue-300" value={ticketForm.stageName} onChange={e => handleStageSelect(e.target.value)}>
                <option value="">-- اختر المرحلة التي قام بها الصنايعي --</option>
                {(() => {
                  const o = clothingOrders.find(x => x.id === ticketForm.orderId)
                  if (!o || !o.modelId) return null
                  const m = models.find(x => x.id === o.modelId)
                  if (!m) return null
                  return m.stages.map(s => (
                    <option key={s.id} value={s.name}>{s.name} - ({s.pricePiastres} قرش)</option>
                  ))
                })()}
              </select>
            </div>
          )}

          <Grid cols={2}>
            <Input label="الكمية المنتجة" type="number" value={ticketForm.quantity} onChange={e => setTicketForm(p => ({ ...p, quantity: e.target.value }))} suffix="قطعة" />
            <Input label="سعر القطعة (أجر)" type="number" value={ticketForm.pricePerPiece} onChange={e => setTicketForm(p => ({ ...p, pricePerPiece: e.target.value }))} suffix="ج.م" />
          </Grid>
          
          <div className="p-4 bg-[#0a101d] rounded-xl flex justify-between items-center border border-white/5">
            <span className="font-bold text-white/50">إجمالي الأجر المستحق:</span>
            <span className="font-black text-xl text-success">{fmt(n(ticketForm.quantity) * n(ticketForm.pricePerPiece))} ج.م</span>
          </div>

          <Input label="ملاحظات (اختياري)" value={ticketForm.notes} onChange={e => setTicketForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات حول الجودة أو الخصم..." />
        </div>
      </Modal>

      {/* Advance Modal */}
      <Modal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title={`تسجيل سلفة لصالح: ${activeWorker?.name}`}
        footer={<><button className="btn-ghost" onClick={() => setShowAdvanceModal(false)}>إلغاء</button><button className="btn-danger" onClick={handleAddAdvance}>صرف من الخزينة</button></>}>
        <div className="space-y-4">
          <Input label="التاريخ" type="date" value={moneyForm.date} onChange={e => setMoneyForm(p => ({ ...p, date: e.target.value }))} />
          <Input label="المبلغ" type="number" value={moneyForm.amount} onChange={e => setMoneyForm(p => ({ ...p, amount: e.target.value }))} suffix="ج.م" autoFocus />
          <Input label="ملاحظات" value={moneyForm.notes} onChange={e => setMoneyForm(p => ({ ...p, notes: e.target.value }))} placeholder="سبب السلفة..." />
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`تصفية حساب لصالح: ${activeWorker?.name}`}
        footer={<><button className="btn-ghost" onClick={() => setShowPaymentModal(false)}>إلغاء</button><button className="btn-gold" onClick={handleAddPayment}>صرف وتصفية الحساب</button></>}>
        <div className="space-y-4">
          <Input label="التاريخ" type="date" value={moneyForm.date} onChange={e => setMoneyForm(p => ({ ...p, date: e.target.value }))} />
          <Input label="المبلغ المراد صرفه" type="number" value={moneyForm.amount} onChange={e => setMoneyForm(p => ({ ...p, amount: e.target.value }))} suffix="ج.م" autoFocus />
          <Input label="ملاحظات" value={moneyForm.notes} onChange={e => setMoneyForm(p => ({ ...p, notes: e.target.value }))} placeholder="حساب أسبوعي، تصفية نهائية..." />
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default PieceworkersLedger
