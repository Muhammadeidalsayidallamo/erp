import React, { useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Hash, Filter, Trash2, Printer, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTreasuryStore, type TreasuryTransactionType } from '../store/useTreasuryStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { fmt } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import { PageHeader, MetricCard, EmptyState, Card, Modal, Input, Select, Badge, Toast } from '../components/ui'

const txLabels: Record<TreasuryTransactionType, string> = {
  income_client: 'إيراد عملاء (عربون/سداد)',
  income_other: 'إيرادات أخرى / نقدية خارجية',
  expense_supplier: 'دفع لمورد / مشتريات بضاعة',
  expense_salary: 'صرف رواتب وأجور عمال',
  expense_factory: 'مصروفات تشغيل (كهرباء/إيجار)',
  expense_other: 'مصروفات نثرية عامة',
}

const Treasury: React.FC = () => {
  const { balance, transactions, addTransaction, deleteTransaction, clearAll } = useTreasuryStore()
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'

  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showClear, setShowClear] = useState(false)
  const [formType, setFormType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [txType, setTxType] = useState<TreasuryTransactionType>('income_other')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const incomeTotal = transactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0)
  const expenseTotal = transactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0)

  // ── Applied filters ────────────────────────────────────────────────────────────
  const filteredTx = transactions
    .filter(t => filterType === 'all' || (filterType === 'income' ? t.isIncome : !t.isIncome))
    .filter(t => !filterFrom || new Date(t.date) >= new Date(filterFrom))
    .filter(t => !filterTo || new Date(t.date) <= new Date(filterTo + 'T23:59:59'))
    .slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Last 6 months summary ──────────────────────────────────────────────────
  const now = new Date()
  const monthSummary = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const y = d.getFullYear(); const m = d.getMonth()
    const monthTx = transactions.filter(t => {
      const td = new Date(t.date)
      return td.getFullYear() === y && td.getMonth() === m
    })
    const inc = monthTx.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0)
    const exp = monthTx.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0)
    return {
      label: d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }),
      income: inc, expense: exp, net: inc - exp
    }
  })

  const handleOpenForm = (type: 'income' | 'expense') => {
    setFormType(type)
    setTxType(type === 'income' ? 'income_other' : 'expense_other')
    setAmount('')
    setNotes('')
    setShowAdd(true)
  }

  const handleSave = () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      setToast({ msg: 'برجاء إدخال مبلغ صحيح أكبر من الصفر', type: 'error' })
      return
    }
    
    addTransaction({
      amount: val,
      type: txType,
      isIncome: formType === 'income',
      notes: notes || txLabels[txType],
    })
    
    setToast({ msg: 'تم تسجيل العملية في الخزينة بنجاح', type: 'success' })
    setShowAdd(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId)
      setDeleteId(null)
      setToast({ msg: 'تم حذف العملية ورجوع الرصيد لسابق عهده', type: 'error' })
    }
  }

  const handleExportExcel = () => {
    const data = filteredTx.map(tx => ({
      'التاريخ': new Date(tx.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      'نوع الحركة': tx.isIncome ? 'إيراد / إيداع' : 'مصروف / سحب',
      'البيان الأساسي': txLabels[tx.type],
      'الملاحظات': tx.notes,
      'القيمة': tx.amount,
      'العملة': cur
    }))
    exportToExcel(data, `ProTex_Treasury_Report_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="إدارة الخزينة والماليات"
        subtitle="تتبع الكاش والسيولة في درج المصنع"
        icon={<Wallet size={18} />}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-ghost hidden md:flex" onClick={handleExportExcel}>
              <Download size={14} /> Excel
            </button>
            <button className="btn-ghost hidden md:flex" onClick={() => window.print()}>
              <Printer size={14} /> طباعة كشف الخزينة
            </button>
            {transactions.length > 0 && (
              <button className="btn-ghost text-danger border-danger/30 hover:bg-danger/10" onClick={() => setShowClear(true)}>
                <Trash2 size={14} /> مسح الخزينة
              </button>
            )}
            <button className="btn-danger" onClick={() => handleOpenForm('expense')}>
              <ArrowUpRight size={14} /> سحب مصروف
            </button>
            <button className="btn-success" onClick={() => handleOpenForm('income')}>
              <ArrowDownRight size={14} /> إيداع إيراد
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
        <MetricCard 
          label="رصيد الخزينة الحالي (الكاش المتاح)" 
          value={`${fmt(balance)} ${cur}`} 
          large 
          variant={balance >= 0 ? 'navy' : 'danger'}
        />
        <MetricCard 
          label="إجمالي الإيرادات (كل الأوقات)" 
          value={`${fmt(incomeTotal)} ${cur}`} 
          variant="success" 
          icon={<ArrowDownRight size={18} />} 
        />
        <MetricCard 
          label="إجمالي المصروفات (كل الأوقات)" 
          value={`${fmt(expenseTotal)} ${cur}`} 
          variant="danger" 
          icon={<ArrowUpRight size={18} />} 
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 mb-4 border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title mb-0">
              سجل حركات الخزينة
              <span className="mr-2 text-xs text-white/30 font-normal">({filteredTx.length} حركة)</span>
            </h3>
            <div className="flex gap-2">
              {(['all','income','expense'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    filterType === f ? 'bg-gold/20 border-gold/40 text-gold' : 'border-white/10 text-white/40 hover:text-white/70'
                  }`}>
                  {f === 'all' ? 'الكل' : f === 'income' ? '↓ إيرادات' : '↑ مصروفات'}
                </button>
              ))}
            </div>
          </div>
          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-white/30" />
              <span className="text-xs text-white/40">تصفية بالتاريخ:</span>
            </div>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:border-gold outline-none"
            />
            <span className="text-white/30 text-xs">→</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:border-gold outline-none"
            />
            {(filterFrom || filterTo) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                className="text-xs text-danger hover:underline">إلغاء التصفية</button>
            )}
          </div>
        </div>

        {transactions.length === 0 ? (
          <EmptyState 
            icon={<Hash />} 
            title="لا توجد حركات مالية مسجلة بعد" 
            description="الخزينة فارغة، اقبض عربون من عميل أو سجل إيداعاً للبدء." 
          />
        ) : filteredTx.length === 0 ? (
          <EmptyState icon={<Filter />} title="لا توجد نتائج" description="جرب تغيير فلتر التاريخ أو نوع الحركة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الحركة</th>
                  <th>البيان والملاحظات</th>
                  <th className="text-left w-32">المبلغ</th>
                  <th className="w-10 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-white/50 text-xs whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td>
                      <Badge variant={tx.isIncome ? 'success' : 'danger'}>
                        {tx.isIncome ? 'مدخول  +' : 'سحب  -'}
                      </Badge>
                    </td>
                    <td>
                      <p className="font-medium text-white/90 text-sm mb-0.5">{tx.notes}</p>
                      <p className="text-[10px] text-white/30">{txLabels[tx.type]}</p>
                    </td>
                    <td className="text-left">
                      <p className={`num font-bold ${tx.isIncome ? 'text-success' : 'text-danger'}`}>
                        {tx.isIncome ? '+' : '-'}{fmt(tx.amount)} {cur}
                      </p>
                    </td>
                    <td className="print:hidden">
                      <button className="btn-icon-danger opacity-50 hover:opacity-100" onClick={() => setDeleteId(tx.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6-Month Summary */}
        {transactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="section-title mb-4">ملخص آخر 6 أشهر</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-white/30 font-bold border-b border-white/5">
                    <th className="text-right pb-2">الشهر</th>
                    <th className="text-left pb-2 text-success">إيرادات</th>
                    <th className="text-left pb-2 text-danger">مصروفات</th>
                    <th className="text-left pb-2">صافي</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSummary.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-2 text-white/60 text-xs">{row.label}</td>
                      <td className="py-2 text-left num text-success font-bold text-xs">{row.income > 0 ? `+${fmt(row.income, 0)}` : '—'}</td>
                      <td className="py-2 text-left num text-danger font-bold text-xs">{row.expense > 0 ? `-${fmt(row.expense, 0)}` : '—'}</td>
                      <td className={`py-2 text-left num font-black text-sm ${row.net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {fmt(row.net, 0)} {cur}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={formType === 'income' ? 'تسجيل إيداع إيرادات' : 'تسجيل سحب مصروفات'} footer={
        <>
          <button className="btn-ghost" onClick={() => setShowAdd(false)}>إلغاء</button>
          <button className={formType === 'income' ? 'btn-success' : 'btn-danger'} onClick={handleSave}>
            تأكيد العملية
          </button>
        </>
      }>
        <div className="space-y-4">
          <Input 
            label="المبلغ" 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            suffix={cur} 
            placeholder="0" 
            autoFocus 
          />
          
          <Select 
            label="تصنيف العملية" 
            value={txType} 
            onChange={e => setTxType(e.target.value as TreasuryTransactionType)}
            options={
              formType === 'income' 
                ? [
                  { value: 'income_other', label: txLabels['income_other'] },
                  { value: 'income_client', label: txLabels['income_client'] },
                ] 
                : [
                  { value: 'expense_other', label: txLabels['expense_other'] },
                  { value: 'expense_factory', label: txLabels['expense_factory'] },
                  { value: 'expense_salary', label: txLabels['expense_salary'] },
                  { value: 'expense_supplier', label: txLabels['expense_supplier'] },
                ]
            } 
          />

          <Input 
            label="البيان (اختياري)" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="اكتب ملاحظة أو سبب العملية..." 
          />
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد حذف الحركة" footer={<><button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button><button className="btn-danger" onClick={handleDelete}>حذف نهائياً</button></>}>
        <p className="text-sm text-white/70">تحذير: سيتم حذف هذه العملية من سجل الخزينة، وسيؤثر هذا على إجمالي الرصيد. هل أنت متأكد؟</p>
      </Modal>

      <Modal open={showClear} onClose={() => setShowClear(false)} title="⚠️ مسح جميع حركات الخزينة"
        footer={<><button className="btn-ghost" onClick={() => setShowClear(false)}>إلغاء</button><button className="btn-danger" onClick={() => { clearAll(); setShowClear(false); setToast({ msg: 'تم مسح جميع حركات الخزينة', type: 'error' }) }}>نعم، امسح الكل</button></>}>
        <p className="text-sm text-white/70">سيتم حذف جميع حركات الخزينة ({transactions.length} حركة) وإعادة الرصيد إلى الصفر. هذا الإجراء لا رجعة فيه!</p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Treasury
