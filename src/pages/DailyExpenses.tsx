import React, { useState, useMemo, useRef } from 'react'
import { Plus, Trash2, Search, Receipt, Trash, FileText, Filter } from 'lucide-react'
import { PageHeader, Card, Modal, Toast, Badge } from '../components/ui'
import { fmt, todayISO, uid } from '../utils/calculations'
import { useSettingsStore } from '../store/useSettingsStore'
import { useDailyExpensesStore } from '../store/useDailyExpensesStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { useReactToPrint } from 'react-to-print'

const CATEGORIES = ['كهرباء', 'مياه', 'إيجار', 'صيانة', 'رواتب', 'بوفيه وضيافة', 'نثريات', 'مواصلات', 'أخرى']

const DailyExpenses: React.FC = () => {
  const { settings } = useSettingsStore()
  const { expenses, addExpense, deleteExpense, clearAll } = useDailyExpensesStore()
  const { addTransaction, deleteTransactionByReference } = useTreasuryStore()

  const cur = settings.currencySymbol || 'ج.م'
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'تقرير_المصاريف_اليومية' })

  // ── Form ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    date: todayISO(),
    category: 'نثريات',
    description: '',
    amount: '' as number | '',
    notes: '',
  })

  // ── Filters ───────────────────────────────────────────────────────────
  const [catFilter, setCatFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showClearModal, setShowClearModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── Add Handler ───────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!form.description.trim()) {
      setToast({ msg: 'يرجى إدخال وصف المصروف', type: 'error' })
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setToast({ msg: 'يرجى إدخال مبلغ صحيح أكبر من صفر', type: 'error' })
      return
    }

    const amount = Number(form.amount)
    const expenseId = uid()

    // 1. Add to daily expenses store
    addExpense({
      id: expenseId,
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount,
      notes: form.notes.trim() || undefined,
    })

    // 2. Sync to treasury as a deduction
    addTransaction({
      amount,
      type: 'expense_factory',
      isIncome: false,
      date: new Date(form.date).toISOString(),
      notes: `${form.description.trim()} - ${form.category}`,
      referenceId: expenseId,
    })

    setToast({ msg: 'تم تسجيل المصروف وخصمه من الخزينة ✓', type: 'success' })
    setForm(prev => ({ ...prev, description: '', amount: '', notes: '' }))
  }

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return expenses.filter(e => {
      const matchesCat = catFilter === 'all' || e.category === catFilter
      const matchesSearch =
        e.description.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [expenses, catFilter, searchQuery])

  // ── Totals ────────────────────────────────────────────────────────────
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0)
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)
  const todayTotal = expenses
    .filter(e => e.date === todayISO())
    .reduce((s, e) => s + e.amount, 0)

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [expenses])

  // ── Category breakdown for print ──────────────────────────────────────
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const dynamicCategories = useMemo(() => {
    const set = new Set(CATEGORIES)
    expenses.forEach(e => set.add(e.category))
    return Array.from(set)
  }, [expenses])

  return (
    <div className="space-y-6 pb-20">

      {/* ── Header ── */}
      <PageHeader
        title="المصاريف اليومية المشتركة"
        subtitle={`${expenses.length} بند مسجل — إجمالي: ${fmt(totalAll)} ${cur}`}
        icon={<Receipt size={20} />}
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => handlePrint()}>
              <FileText size={14} /> طباعة
            </button>
            <button
              className="btn-ghost border-danger/30 text-danger hover:bg-danger/10"
              onClick={() => setShowClearModal(true)}
            >
              <Trash size={14} /> مسح الكل
            </button>
          </div>
        }
      />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المصاريف', value: `${fmt(totalAll)} ${cur}`, color: 'text-gold' },
          { label: 'نصيب الشريك (50%)', value: `${fmt(totalAll / 2)} ${cur}`, color: 'text-orange-400' },
          { label: 'مصاريف اليوم', value: `${fmt(todayTotal)} ${cur}`, color: 'text-blue-400' },
          { label: 'عدد البنود', value: `${expenses.length} بند`, color: 'text-success' },
        ].map((c, i) => (
          <div key={i} className="bank-card p-4 rounded-2xl">
            <p className="text-[11px] text-white/40 font-bold mb-1">{c.label}</p>
            <p className={`font-black text-lg num ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Add Form ── */}
        <div className="lg:col-span-1">
          <div className="bank-card rounded-3xl p-5">
            <h3 className="section-title mb-4">إضافة مصروف جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">التاريخ</label>
                <input
                  type="date"
                  className="bank-input w-full"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">التصنيف</label>
                <input
                  type="text"
                  list="categories-list"
                  className="bank-input w-full"
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  placeholder="اختر أو اكتب تصنيف جديد..."
                />
                <datalist id="categories-list">
                  {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">الوصف <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="bank-input w-full"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="مثال: فاتورة كهرباء شهر أبريل"
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">المبلغ <span className="text-danger">*</span></label>
                <div className="relative">
                  <input
                    type="number"
                    className="bank-input w-full pl-14"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value === '' ? '' : +e.target.value }))}
                    placeholder="0.00"
                    min={0}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-bold">{cur}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">ملاحظات (اختياري)</label>
                <textarea
                  className="bank-input w-full min-h-[72px] resize-none"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="أي تفاصيل إضافية..."
                />
              </div>
              <button className="btn-gold w-full py-3 shadow-lg shadow-gold/20" onClick={handleAdd}>
                <Plus size={16} /> تسجيل المصروف في الخزينة
              </button>
            </div>
          </div>
        </div>

        {/* ── List ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                className="bank-input w-full pr-9"
                placeholder="ابحث في الوصف أو الملاحظات..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative sm:w-48">
              <Filter size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
              <select
                className="bank-input w-full pr-8"
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
              >
                <option value="all">كل التصنيفات</option>
                {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bank-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>التصنيف</th>
                    <th>الوصف</th>
                    <th className="text-left">المبلغ</th>
                    <th className="text-left text-orange-400/80">نصيب الفرد</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-white/20 italic text-sm">
                        لا توجد مصاريف مسجلة تطابق البحث
                      </td>
                    </tr>
                  ) : filtered.map(e => (
                    <tr key={e.id} className="group">
                      <td className="text-xs text-white/40 whitespace-nowrap">{e.date}</td>
                      <td>
                        <span className="badge-navy text-[11px]">{e.category}</span>
                      </td>
                      <td>
                        <p className="text-sm font-bold text-white">{e.description}</p>
                        {e.notes && <p className="text-[10px] text-white/30 truncate max-w-[200px]">{e.notes}</p>}
                      </td>
                      <td className="text-left font-bold text-gold num whitespace-nowrap">
                        {fmt(e.amount)} <span className="text-white/30 text-[10px]">{cur}</span>
                      </td>
                      <td className="text-left font-medium text-orange-400/90 num whitespace-nowrap bg-orange-400/5">
                        {fmt(e.amount / 2)}
                      </td>
                      <td>
                        <button
                          className="w-8 h-8 rounded-xl bg-danger/0 group-hover:bg-danger/10 text-danger/0 group-hover:text-danger flex items-center justify-center transition-all"
                          onClick={() => setDeleteId(e.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="py-3 px-4 font-bold text-white/50 text-sm text-left">
                        {catFilter !== 'all' || searchQuery ? `إجمالي الفلتر (${filtered.length} بند)` : `الإجمالي الكلي`}
                      </td>
                      <td className="py-3 px-4 text-left font-black text-gold text-base num">
                        {fmt(totalFiltered)} {cur}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-orange-400 text-sm num bg-orange-400/5">
                        {fmt(totalFiltered / 2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT AREA (Hidden) ── */}
      <div ref={printRef} className="hidden print:block bg-white text-black p-10" dir="rtl">
        <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{settings.companyName || 'ProTex ERP'}</h1>
            <h2 className="text-lg font-bold text-slate-600 mt-1">تقرير المصاريف اليومية المشتركة</h2>
          </div>
          <div className="text-left text-sm text-slate-500">
            <p>تاريخ التقرير: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></p>
            <p>عدد البنود: <strong>{filtered.length}</strong></p>
          </div>
        </div>

        {/* Category Breakdown */}
        {breakdown.length > 0 && (
          <div className="mb-8 grid grid-cols-4 gap-4">
            {breakdown.map(([cat, amt]) => (
              <div key={cat} className="border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 font-bold mb-1">{cat}</p>
                <p className="font-black text-slate-900 text-lg">{fmt(amt)}</p>
                <p className="text-[10px] text-slate-400">{cur}</p>
              </div>
            ))}
          </div>
        )}

        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-y-2 border-slate-900 bg-slate-50">
              <th className="py-3 px-3 text-right">التاريخ</th>
              <th className="py-3 px-3 text-right">التصنيف</th>
              <th className="py-3 px-3 text-right">الوصف</th>
              <th className="py-3 px-3 text-left">المبلغ ({cur})</th>
              <th className="py-3 px-3 text-left">النصيب (50%)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="py-3 px-3 font-mono text-xs">{e.date}</td>
                <td className="py-3 px-3 font-bold">{e.category}</td>
                <td className="py-3 px-3">{e.description}</td>
                <td className="py-3 px-3 text-left font-black font-mono">{fmt(e.amount)}</td>
                <td className="py-3 px-3 text-left font-bold bg-slate-50">{fmt(e.amount / 2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-4 border-slate-900 bg-slate-100">
              <td colSpan={3} className="py-4 px-3 font-black text-lg text-left">الإجمالي الكلي:</td>
              <td className="py-4 px-3 font-black text-2xl font-mono text-left">{fmt(totalFiltered)}</td>
              <td className="py-4 px-3 font-black text-xl font-mono text-left bg-slate-200">{fmt(totalFiltered / 2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 flex justify-between text-sm text-slate-400 border-t border-slate-200 pt-6">
          <p>توقيع المسؤول المالي: ____________________</p>
          <p>توقيع المدير: ____________________</p>
        </div>
      </div>

      {/* ── Modals ── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="تأكيد حذف المصروف"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteId(null)}>إلغاء</button>
            <button
              className="btn-danger"
              onClick={() => {
                if (deleteId) {
                  // Delete from both stores
                  deleteExpense(deleteId)
                  deleteTransactionByReference(deleteId)
                  
                  setDeleteId(null)
                  setToast({ msg: 'تم حذف المصروف وتعديل رصيد الخزينة بنجاح ✓', type: 'success' })
                }
              }}
            >
              حذف
            </button>
          </>
        }
      >
        <p className="text-sm text-white/80">
          هل أنت متأكد من حذف هذا المصروف؟
          <br />
          <span className="text-success text-xs">سيتم استرداد المبلغ وإضافته لرصيد الخزينة تلقائياً.</span>
        </p>
      </Modal>

      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="تأكيد مسح جميع المصاريف"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowClearModal(false)}>إلغاء</button>
            <button
              className="btn-danger"
              onClick={() => {
                clearAll()
                setShowClearModal(false)
                setToast({ msg: 'تم مسح جميع سجلات المصاريف', type: 'error' })
              }}
            >
              نعم، امسح الكل
            </button>
          </>
        }
      >
        <p className="text-sm text-white/80">
          سيتم حذف كافة بنود المصاريف اليومية نهائياً. هل أنت متأكد؟
          <br />
          <span className="text-danger font-bold text-xs">هذا الإجراء لا رجعة فيه.</span>
        </p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default DailyExpenses
