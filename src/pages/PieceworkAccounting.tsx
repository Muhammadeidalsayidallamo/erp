import React, { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Image as ImageIcon, Calculator, FileText } from 'lucide-react'
import { PageHeader, Card, Grid, Input, StatCard, Toast } from '../components/ui'
import { generateId, fmt, n } from '../utils/calculations'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { usePieceworkersStore } from '../store/usePieceworkersStore'
import { useReactToPrint } from 'react-to-print'

interface Expense {
  id: string
  desc: string
  amount: number
}

const PieceworkAccounting: React.FC = () => {
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'
  const printRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [modelName, setModelName] = useState('')
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(0)
  const [sellPrice, setSellPrice] = useState<number>(0)
  const [workerPrice, setWorkerPrice] = useState<number>(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recordIncome, setRecordIncome] = useState<boolean>(true)
  const [actualLaborLedgerCost, setActualLaborLedgerCost] = useState<number | null>(null)

  const { clothingOrders } = useOrdersStore()
  const { tickets: ledgerTickets } = usePieceworkersStore()

  // ===== ARCHIVE SYSTEM =====
  const [currentId, setCurrentId] = useState<string>(generateId())
  const [archive, setArchive] = useState<any[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('protex_piecework_archive')
    if (saved) setArchive(JSON.parse(saved))
  }, [])

  const handleSave = () => {
    const newArchive = [...archive]
    const existingIdx = newArchive.findIndex(x => x.id === currentId)
    const payload = {
      id: currentId,
      title: modelName || 'حساب موديل بدون اسم',
      updated: new Date().toLocaleDateString('ar-EG'),
      modelName,
      modelImage,
      quantity,
      sellPrice,
      workerPrice,
      expenses
    }
    if (existingIdx >= 0) newArchive[existingIdx] = payload
    else newArchive.push(payload)
    
    setArchive(newArchive)
    localStorage.setItem('protex_piecework_archive', JSON.stringify(newArchive))

    // — Link to Treasury —
    const label = modelName ? `موديل: ${modelName}` : 'محاسبة إنتاج بالقطعة'
    const tStore = useTreasuryStore.getState()
    // Record revenue if any (only if not already recorded via Client system)
    if (totalIncome > 0 && recordIncome) {
      tStore.addTransaction({
        amount: totalIncome,
        type: 'income_other',
        isIncome: true,
        notes: `إيراد بيع ${label} (${quantity} قطعة × ${sellPrice} ${cur})`,
      })
    }
    // Record worker cost
    if (totalWorkerCost > 0) {
      tStore.addTransaction({
        amount: totalWorkerCost,
        type: 'expense_factory',
        isIncome: false,
        notes: `أجرة صنايعية ${label} (${quantity} قطعة × ${workerPrice} ${cur})`,
      })
    }
    // Record extra expenses
    expenses.filter(e => n(e.amount) > 0).forEach(e => {
      tStore.addTransaction({
        amount: n(e.amount),
        type: 'expense_other',
        isIncome: false,
        notes: `مصروف ${label}: ${e.desc || 'مصروف إضافي'}`,
      })
    })

    setToast({ msg: `✓ تم حفظ الموديل وتسجيل القيود في الخزينة`, type: 'success' })
  }

  const handleLoad = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const id = e.target.value
     if (!id) return
     if (id === 'new') {
        setCurrentId(generateId())
        setModelName('')
        setModelImage(null)
        setQuantity(0)
        setSellPrice(0)
        setWorkerPrice(0)
        setExpenses([])
        return
     }
     const found = archive.find(x => x.id === id)
     if (found) {
        setCurrentId(found.id)
        setModelName(found.modelName)
        setModelImage(found.modelImage)
        setQuantity(found.quantity)
        setSellPrice(found.sellPrice)
        setWorkerPrice(found.workerPrice)
        setExpenses(found.expenses)
     }
  }

  const handleImportOrder = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const orderId = e.target.value
     if (!orderId) return
     const order = clothingOrders.find(o => o.id === orderId)
     if (order) {
        setModelName(`أوردر ${order.orderNumber} - ${order.factoryName || 'بدون مصنع'}`)
        setQuantity(order.totalPieces || 0)
        setSellPrice((order.wholesalePrice || order.totalOrderCost / order.totalPieces) || 0)
        
        if (order.isCMT && order.productionStyle === 'whole') {
           setWorkerPrice(order.wholePieceLaborCost || 0)
        } else if (order.isCMT && order.productionStyle === 'stages') {
           setWorkerPrice(order.laborCostPerPiece || 0)
        } else {
           setWorkerPrice(order.laborCostPerPiece || 0)
        }

        // Calculate actual labor from ledger
        const orderTickets = ledgerTickets.filter(t => t.orderId === order.id)
        const actualPaid = orderTickets.reduce((sum, t) => sum + t.totalAmount, 0)
        setActualLaborLedgerCost(actualPaid > 0 ? actualPaid : null)

        setRecordIncome(false) // Revenue is already tracked in Client Debt
     }
  }
  // ==========================

  const totalIncome = n(quantity) * n(sellPrice)
  const totalWorkerCost = actualLaborLedgerCost !== null ? actualLaborLedgerCost : (n(quantity) * n(workerPrice))
  const totalExpenses = expenses.reduce((sum, e) => sum + n(e.amount), 0)
  const totalCosts = totalWorkerCost + totalExpenses
  const netProfit = totalIncome - totalCosts

  const handleAddExpense = () => setExpenses([...expenses, { id: generateId(), desc: '', amount: 0 }])
  
  const handleRemoveExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id))

  const onChangeExpense = (index: number, field: keyof Expense, val: string | number) => {
    const newExps = [...expenses]
    newExps[index] = { ...newExps[index], [field]: val }
    setExpenses(newExps)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = ev => setModelImage(ev.target?.result as string)
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="محاسبة الإنتاج بالموديل"
          subtitle="حساب تكلفة الدخول (للصنايعية والمصروفات) وإيراد الخروج (البيع)"
          icon={<Calculator size={20} />}
          actions={
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <select className="bg-[#1a2540] text-sm text-white px-3 py-2 rounded-lg border border-white/20 focus:border-gold outline-none" onChange={handleLoad} value={currentId}>
                 <option value="new">✦ إنشاء سجل موديل جديد</option>
                 <optgroup label="الأرشيف المحفوظ">
                   {archive.map(a => <option key={a.id} value={a.id}>{a.title} ({a.updated})</option>)}
                 </optgroup>
              </select>
              
              <select className="bg-success/20 text-success text-sm px-3 py-2 rounded-lg border border-success/30 focus:border-success outline-none" onChange={handleImportOrder} defaultValue="">
                 <option value="" disabled>📥 استيراد من ورش الملابس...</option>
                 {clothingOrders.map(o => (
                   <option key={o.id} value={o.id}>أوردر {o.orderNumber} ({o.totalPieces}ق)</option>
                 ))}
              </select>

              <button className="btn-navy" onClick={handleSave}>
                حفظ التقدم
              </button>
              <button className="btn-gold shadow-lg shadow-gold/20" onClick={() => handlePrint()}>
                <FileText size={16} /> طباعة التقرير
              </button>
            </div>
          }
        />
      </div>

      {/* ===== SCREEN VIEW ===== */}
      <div className="space-y-6 print:hidden">
        {/* Model Info */}
        <Card>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Box */}
            <div className="w-full md:w-32 h-32 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden flex-shrink-0 group">
              {modelImage ? (
                <img src={modelImage} className="w-full h-full object-cover" alt="Model" />
              ) : (
                <div className="text-center text-white/30 hidden md:block">
                  <ImageIcon size={28} className="mx-auto mb-1 opacity-50" />
                  <span className="text-[10px]">اضغط لإضافة صورة</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleImageUpload} 
              />
              {modelImage && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-white">تغيير</span>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="flex-1">
              <Grid cols={2} className="md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input 
                  label="اسم / رقم الموديل" 
                  value={modelName} 
                  onChange={e => setModelName(e.target.value)} 
                  placeholder="مثال: ترنج صيفي"
                />
                <Input 
                  label="الكمية (عدد القطع)" 
                  type="number" 
                  value={quantity || ''} 
                  onChange={e => setQuantity(+e.target.value)} 
                  placeholder="0"
                  suffix="قطعة"
                />
                <Input 
                  label="السعر من العميل (الخروج)" 
                  type="number" 
                  value={sellPrice || ''} 
                  onChange={e => setSellPrice(+e.target.value)} 
                  placeholder="0"
                  suffix={cur}
                />
                <Input 
                  label="سعر الصنايعي (الدخول)" 
                  type="number" 
                  value={workerPrice || ''} 
                  onChange={e => setWorkerPrice(+e.target.value)} 
                  placeholder="0"
                  suffix={cur}
                />
              </Grid>
            </div>
          </div>
        </Card>

        {/* Tables/Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inflow (Costs) -> Left side in code, shows on right side in RTL visually sometimes depending on grid setup */}
          <Card variant="navy">
            <h3 className="text-lg font-bold text-blue-400 mb-4">الدخول (التكاليف والمصروفات)</h3>
            
            <div className={`bg-white/5 p-4 rounded-xl flex flex-col mb-6 border ${actualLaborLedgerCost !== null ? 'border-success/30' : 'border-white/5'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">أجرة الصنايعية {actualLaborLedgerCost === null && `(${n(quantity)} × ${n(workerPrice)})`}</span>
                <span className="font-bold text-white text-lg">{fmt(totalWorkerCost)} {cur}</span>
              </div>
              {actualLaborLedgerCost !== null ? (
                <span className="text-[10px] text-success font-bold flex justify-between">
                  <span>تم سحب الأجر الفعلي تلقائياً من (كشوف العمالة)</span>
                  <button onClick={() => setActualLaborLedgerCost(null)} className="text-white/40 hover:text-white underline">العودة للحساب التقديري</button>
                </span>
              ) : (
                <span className="text-[10px] text-white/40">حساب تقديري بناءً على الكمية × الأجر</span>
              )}
            </div>

            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-white/70">مصروفات أخرى</span>
              <button className="btn-ghost text-xs px-2 py-1" onClick={handleAddExpense}>
                <Plus size={14} /> إضافة مصروف
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4 bg-white/5 rounded-xl border border-white/5">لا توجد مصروفات إضافية مسجلة</p>
            ) : (
              <div className="space-y-2 mb-4">
                {expenses.map((exp, idx) => (
                  <div key={exp.id} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input 
                        placeholder="وصف المصروف" 
                        value={exp.desc} 
                        onChange={e => onChangeExpense(idx, 'desc', e.target.value)} 
                      />
                    </div>
                    <div className="w-32">
                      <Input 
                        type="number" 
                        placeholder="المبلغ" 
                        value={exp.amount || ''} 
                        onChange={e => onChangeExpense(idx, 'amount', +e.target.value)} 
                        suffix={cur}
                      />
                    </div>
                    <button 
                      className="w-10 h-[42px] flex items-center justify-center text-danger hover:bg-danger/10 rounded-xl mt-6"
                      onClick={() => handleRemoveExpense(exp.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="font-bold text-white text-lg">إجمالي الدخول</span>
              <span className="font-black text-blue-400 text-xl">{fmt(totalCosts)} {cur}</span>
            </div>
          </Card>

          {/* Outflow (Revenues) */}
          <div className="space-y-6">
            <Card variant="gold" className="h-fit">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gold">الخروج (الإيرادات)</h3>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/50">
                  <input type="checkbox" className="accent-gold w-4 h-4" checked={recordIncome} onChange={e => setRecordIncome(e.target.checked)} />
                  تسجيل في الخزينة؟
                </label>
              </div>
              <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-gold/20 mb-2">
                <span className="text-sm">إجمالي البيع ({n(quantity)} × {n(sellPrice)})</span>
                <span className="font-black text-gold text-2xl">{fmt(totalIncome)} {cur}</span>
              </div>
              {!recordIncome && <p className="text-[10px] text-white/40 text-center">الإيراد مسجل مسبقاً في حسابات العملاء</p>}
            </Card>

            {/* Results Overview in Screen View */}
            <div className="grid grid-cols-1 gap-4">
              <StatCard 
                label="الصافي (الربح النهائي)" 
                value={`${fmt(netProfit)} ${cur}`} 
                variant={netProfit > 0 ? 'success' : netProfit < 0 ? 'danger' : 'default'} 
                large 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== PRINT VIEW ===== */}
      <div 
        ref={printRef} 
        className="hidden print:block bg-white text-black min-h-screen p-8" 
        dir="rtl"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Official Header */}
        <div className="flex justify-between items-end border-b-[3px] border-[#0f3460] pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#0f3460] mb-2">{settings.companyName || 'نظام إدارة الإنتاج'}</h1>
            <h2 className="text-xl font-bold tracking-tight text-gray-700 bg-gray-100 inline-block px-4 py-1.5 rounded-lg border border-gray-200">فحص وتكلفة الموديل</h2>
          </div>
          <div className="text-left text-sm font-medium text-gray-500 space-y-1">
            <p>تاريخ التقرير: <span className="text-gray-900 font-bold">{new Date().toLocaleDateString('ar-EG')}</span></p>
            <p className="bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
               رقم الموديل: <span className="text-[#0f3460] font-bold text-base">{modelName || '—'}</span>
            </p>
          </div>
        </div>

        {/* Basic Data Strip */}
        <div className="flex gap-6 mb-10 bg-gray-50 p-6 rounded-2xl border border-gray-200">
          {modelImage && (
            <div className="w-32 h-32 rounded-xl overflow-hidden shadow-sm border-2 border-white shrink-0 bg-gray-200">
              <img src={modelImage} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <p className="text-gray-500 text-sm mb-1">اسم الموديل</p>
              <p className="font-black text-xl text-[#0f3460]">{modelName || 'غير مسجل'}</p>
              <div className="mt-4 flex items-center gap-2 bg-[#0f3460]/10 px-3 py-2 rounded-lg w-fit">
                <span className="text-gray-600 text-sm font-bold">الكمية:</span>
                <span className="font-black text-lg text-[#0f3460]">{n(quantity)}<span className="text-sm font-normal mr-1">قطعة</span></span>
              </div>
            </div>
            
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-sm mb-1 font-bold">سعر الدخول للقطعة</p>
                <div className="flex items-end gap-1">
                  <p className="font-black text-2xl text-gray-900">{fmt(workerPrice)}</p>
                  <span className="text-gray-500 text-sm mb-1">{cur}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1 font-medium bg-blue-50 w-fit px-2 py-0.5 rounded">حساب الصنايعية</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-sm mb-1 font-bold">سعر الخروج للقطعة</p>
                <div className="flex items-end gap-1">
                  <p className="font-black text-2xl text-gray-900">{fmt(sellPrice)}</p>
                  <span className="text-gray-500 text-sm mb-1">{cur}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 w-fit px-2 py-0.5 rounded">البيع للعميل</p>
              </div>
            </div>
          </div>
        </div>

        {/* The Tables */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          
          {/* Right Side: Expenses / Inflow (الدخول) */}
          <div>
            <h3 className="text-lg font-black text-[#0f3460] mb-4 flex items-center gap-2 border-b-2 border-gray-100 pb-2">
              <span className="w-3 h-3 rounded-md bg-[#0f3460] shadow-sm shadow-[#0f3460]/30"></span>
              جدول الدخول (التكاليف)
            </h3>
            <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm border border-gray-200 text-sm">
              <thead>
                <tr className="bg-[#0f3460] text-white">
                  <th className="py-3 px-4 text-right font-bold w-2/3">البيان</th>
                  <th className="py-3 px-4 text-left font-bold w-1/3">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 bg-white">
                  <td className="py-4 px-4 font-bold text-gray-800">
                    أجرة الصنايعية 
                    {actualLaborLedgerCost === null ? (
                      <span className="text-gray-400 font-normal mr-2">({n(quantity)} × {n(workerPrice)})</span>
                    ) : (
                      <span className="text-success font-normal mr-2 text-xs bg-success/10 px-2 py-0.5 rounded-md">(أجر فعلي مسحوب من الكشوف)</span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-black flex justify-end gap-1 text-[#0f3460] text-left">
                     {fmt(totalWorkerCost)} <span className="text-gray-400 text-xs mt-1">{cur}</span>
                  </td>
                </tr>
                {expenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 bg-gray-50/70">
                    <td className="py-3 px-4 text-gray-600 font-medium">❖ {e.desc || 'مصروف إضافي'}</td>
                    <td className="py-3 px-4 text-gray-800 flex justify-end gap-1 text-left font-bold">
                       {fmt(e.amount)} <span className="text-gray-400 text-xs mt-0.5">{cur}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#0f3460]/5 border-t-2 border-[#0f3460]">
                  <td className="py-4 px-4 font-bold text-gray-900 text-base">الإجمالي العام (للدخول)</td>
                  <td className="py-4 px-4 flex justify-end gap-1 font-black text-[#0f3460] text-left text-lg">
                    {fmt(totalCosts)} <span className="text-gray-500 text-sm mt-1">{cur}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Left Side: Income / Outflow (الخروج) */}
          <div>
            <h3 className="text-lg font-black text-[#e8a020] mb-4 flex items-center gap-2 border-b-2 border-gray-100 pb-2">
              <span className="w-3 h-3 rounded-md bg-[#e8a020] shadow-sm shadow-[#e8a020]/30"></span>
              جدول الخروج (الإيرادات)
            </h3>
            <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm border border-gray-200 text-sm">
              <thead>
                <tr className="bg-[#e8a020] text-white">
                  <th className="py-3 px-4 text-right font-bold w-2/3">البيان</th>
                  <th className="py-3 px-4 text-left font-bold w-1/3">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b-2 border-[#e8a020]">
                  <td className="py-4 px-4 font-bold text-gray-800">
                    إجمالي فاتورة البيع للعميل <span className="text-gray-400 font-normal mr-2">({n(quantity)} × {n(sellPrice)})</span>
                  </td>
                  <td className="py-4 px-4 font-black flex justify-end gap-1 text-[#e8a020] text-left text-lg">
                     {fmt(totalIncome)} <span className="text-gray-400 text-sm mt-1">{cur}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Summary Footer Box */}
        <div className="flex justify-end mt-12 mb-16">
          <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden bg-white">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <span className="font-bold text-gray-600">إجمالي قيمة الخروج</span>
              <span className="font-black text-gray-900 border border-gray-200 px-3 py-1 rounded bg-gray-50">{fmt(totalIncome)} {cur}</span>
            </div>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <span className="font-bold text-gray-600 border-b-2 border-transparent">يخصم إجمالي تكاليف الدخول</span>
              <span className="font-black text-red-600 border border-red-100 px-3 py-1 rounded bg-red-50">- {fmt(totalCosts)} {cur}</span>
            </div>
            <div className={`flex justify-between items-center p-6 ${netProfit >= 0 ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
              <div>
                 <span className="font-black text-xl block">الصافي</span>
                 <span className="text-sm font-bold text-gray-500">{netProfit >= 0 ? 'ربح نهائي' : 'خسارة'}</span>
              </div>
              <span className={`font-black text-3xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ direction: 'ltr' }}>
                {fmt(netProfit)} <span className="text-lg">{cur}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 text-center px-12 mt-auto">
          <div className="border-t-2 border-dashed border-gray-300 pt-3">
            <p className="font-bold text-gray-700">توقيع المستلم</p>
          </div>
          <div className="border-t-2 border-dashed border-gray-300 pt-3 opacity-0">
            {/* Empty center */}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 pt-3">
            <p className="font-bold text-gray-700">توقيع الحسابات / الإدارة</p>
          </div>
        </div>
        
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default PieceworkAccounting
