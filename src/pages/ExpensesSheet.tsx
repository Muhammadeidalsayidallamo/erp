import React, { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, FileSpreadsheet, Printer, Receipt, FileText, Wallet } from 'lucide-react'
import { PageHeader, Card, StatCard, Toast } from '../components/ui'
import { generateId, fmt, today } from '../utils/calculations'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { useExpensesSheetStore, type ExpenseSheet } from '../store/useExpensesSheetStore'
import { useReactToPrint } from 'react-to-print'
import { Badge } from '../components/ui'

interface ExpenseSingleItem {
  id: string
  date: string
  category: string
  note: string
  receiptNo: string
  amount: number | ''
}

const defaultCategories = ['بوفيه وضيافة', 'مواصلات', 'نثريات', 'رواتب وأجور', 'تشغيل وصيانة', 'كهرباء وإنترنت', 'مشتريات خامات', 'تسويق وإعلانات']

const ExpensesSheet: React.FC = () => {
  const { settings } = useSettingsStore()
  const cur = settings.currencySymbol || 'ج.م'
  const printRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Report Metadata
  const [reportTitle, setReportTitle] = useState('كشف مصروفات منفرد / تسوية عهدة')
  const [reportDate, setReportDate] = useState(today())
  const [personName, setPersonName] = useState('')
  const [fundAmount, setFundAmount] = useState<number | ''>('')

  // Items
  const [items, setItems] = useState<ExpenseSingleItem[]>([
    { id: generateId(), date: today(), category: '', note: '', receiptNo: '', amount: '' }
  ])

  // ===== STORE SYSTEM =====
  const { sheets, saveSheet, deleteSheet } = useExpensesSheetStore()
  const [currentId, setCurrentId] = useState<string>(generateId())
  const [isSaved, setIsSaved] = useState(false)

  // Sync isSaved state when items or metadata change
  useEffect(() => {
    setIsSaved(false)
  }, [reportTitle, reportDate, personName, fundAmount, items])

  const handleSave = () => {
    const payload: ExpenseSheet = {
      id: currentId,
      title: reportTitle || 'مسودة تسوية',
      reportDate,
      personName,
      fundAmount,
      items,
      status: 'saved',
      updatedAt: new Date().toISOString()
    }
    
    saveSheet(payload)
    setIsSaved(true)

    // — Link to Treasury: record each expense item as a treasury transaction —
    const validItems = items.filter(i => Number(i.amount) > 0)
    
    // Cleanup removed items from treasury
    const previousSheet = sheets.find(x => x.id === currentId)
    if (previousSheet) {
      const removedItems = previousSheet.items.filter(old => !items.find(curr => curr.id === old.id))
      removedItems.forEach(item => {
        useTreasuryStore.getState().deleteTransactionByReference(`expitem-${item.id}`)
      })
    }

    if (validItems.length > 0) {
      validItems.forEach(item => {
        // useTreasuryStore.addTransaction already handles updating if referenceId exists
        useTreasuryStore.getState().addTransaction({
          amount: Number(item.amount),
          type: 'expense_other',
          isIncome: false,
          date: item.date || reportDate,
          notes: `كشف مصروفات [${reportTitle}] — ${item.category || 'عام'}: ${item.note || 'مصروف'}`,
          referenceId: `expitem-${item.id}`
        })
      })
    }

    setToast({ msg: `✓ تم الحفظ ومزامنة ${validItems.length} بند مع الخزينة بنجاح`, type: 'success' })
  }

  const handleLoad = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const id = e.target.value
     if (!id) return
     if (id === 'new') {
        setCurrentId(generateId())
        setReportTitle('كشف مصروفات منفرد / تسوية عهدة')
        setReportDate(today())
        setPersonName('')
        setFundAmount('')
        setItems([{ id: generateId(), date: today(), category: '', note: '', receiptNo: '', amount: '' }])
        return
     }
     const found = sheets.find(x => x.id === id)
     if (found) {
        setCurrentId(found.id)
        setReportTitle(found.title)
        setReportDate(found.reportDate)
        setPersonName(found.personName)
        setFundAmount(found.fundAmount)
        setItems(found.items)
        setIsSaved(true)
     }
  }

  const handleDelete = () => {
    if (window.confirm('هل أنت متأكد من حذف هذا الكشف نهائياً؟ سيتم أيضاً حذف القيود المرتبطة من الخزينة.')) {
      // Clean up treasury
      items.forEach(item => {
        useTreasuryStore.getState().deleteTransactionByReference(`expitem-${item.id}`)
      })
      deleteSheet(currentId)
      setToast({ msg: 'تم حذف الكشف والقيود المالية التابعة له', type: 'error' })
      // Reset to new
      handleLoad({ target: { value: 'new' } } as any)
    }
  }
  // ==========================

  // Smart Categories
  const learnedCategories = Array.from(new Set(items.map(i => i.category).filter(c => c.trim().length > 0)))
  const allCategories = Array.from(new Set([...defaultCategories, ...learnedCategories]))

  // Handlers
  const addItem = () => {
    setItems([...items, { id: generateId(), date: reportDate, category: '', note: '', receiptNo: '', amount: '' }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof ExpenseSingleItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  // Calculations
  const totalSpent = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const isFundAccounting = typeof fundAmount === 'number' && fundAmount > 0
  const remainingBalance = isFundAccounting ? fundAmount - totalSpent : 0
  
  const validItemsCount = items.filter(i => Number(i.amount) > 0).length

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Voucher_${reportDate}` })

  return (
    <div className="space-y-6 pb-20">
      <div className="print:hidden">
        <PageHeader
          title="كشف المصروفات المنفرد (ورقة واحدة)"
          subtitle="محاسبة ذكية دقيقة للصفقات أو تسوية العهد الشخصية في تقرير مجمع"
          icon={<FileSpreadsheet size={22} />}
          actions={
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <select className="bg-[#1a2540] text-sm text-white px-3 py-2 rounded-lg border border-white/20 focus:border-gold outline-none" onChange={handleLoad} value={currentId}>
                 <option value="new">✦ إنشاء كشف جديد</option>
                 <optgroup label="الكشوف المحفوظة">
                    {sheets.map(a => <option key={a.id} value={a.id}>{a.title} ({new Date(a.updatedAt).toLocaleDateString('ar-EG')})</option>)}
                 </optgroup>
              </select>
              <button className="btn-navy" onClick={handleSave}>
                {isSaved ? 'تم الحفظ ✅' : 'حفظ التغييرات'}
              </button>
              {sheets.find(s => s.id === currentId) && (
                <button className="btn-ghost text-danger border-danger/30 hover:bg-danger/10" onClick={handleDelete}>
                  <Trash2 size={14} />
                </button>
              )}
              <button className="btn-gold shadow-lg shadow-gold/20" onClick={() => handlePrint()}>
                <Printer size={16} /> طباعة الكشف
              </button>
            </div>
          }
        />
      </div>

      {/* ===== SCREEN VIEW ===== */}
      <div className="space-y-6 print:hidden">
        
        {/* Top Report Info & Fund Math */}
        <Card>
           <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <div className="bg-gold/10 text-gold p-2 rounded-lg">
                <Receipt size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">بيانات الكشف / العهدة</h3>
              </div>
              <Badge variant={isSaved ? 'success' : 'gold'}>
                {isSaved ? 'محفوظ ومزامن ✅' : 'بانتظار الحفظ...'}
              </Badge>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="lg:col-span-2">
                 <label className="text-xs text-white/50 mb-1 block font-bold">اسم الكشف أو الفعالية</label>
                 <input 
                   type="text" 
                   value={reportTitle} 
                   onChange={e => setReportTitle(e.target.value)}
                   className="w-full bg-[#1a2540] border border-white/10 focus:border-gold rounded-lg px-4 py-2.5 text-white font-bold"
                   placeholder="مثال: تسوية عهدة فرع الإسكندرية / كشف رحلة"
                 />
              </div>
              <div>
                 <label className="text-xs text-white/50 mb-1 block font-bold">التاريخ العام</label>
                 <input 
                   type="date" 
                   value={reportDate} 
                   onChange={e => setReportDate(e.target.value)}
                   className="w-full bg-[#1a2540] border border-white/10 focus:border-gold rounded-lg px-4 py-2.5 text-white font-bold"
                 />
              </div>
              <div>
                 <label className="text-xs text-white/50 mb-1 block font-bold">اسم المسئول / أمين العهدة</label>
                 <input 
                   type="text" 
                   value={personName} 
                   onChange={e => setPersonName(e.target.value)}
                   className="w-full bg-[#1a2540] border border-white/10 focus:border-gold rounded-lg px-4 py-2.5 text-white font-bold"
                   placeholder="المسئول عن الكشف"
                 />
              </div>
           </div>

           <div className="mt-6 bg-[#0f3460]/40 rounded-xl p-5 border border-[#0f3460]">
               <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="w-full md:w-1/3">
                    <label className="text-xs text-blue-300 font-bold mb-1 flex items-center gap-1">
                      <Wallet size={14}/> قيمة العهدة المستلمة مبدئياً (اختياري للصرافة)
                    </label>
                    <div className="relative">
                       <input 
                         type="number" 
                         value={fundAmount} 
                         onChange={e => setFundAmount(e.target.value ? Number(e.target.value) : '')}
                         className="w-full bg-black/20 border border-blue-500/30 focus:border-blue-500 rounded-lg px-4 py-3 text-white text-xl font-black outline-none num text-left pr-12"
                         placeholder="0"
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-white/30">{cur}</span>
                    </div>
                  </div>
                  
                  {isFundAccounting && (
                    <div className="w-full md:flex-1 grid grid-cols-2 gap-4">
                       <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-full h-1 bg-red-500/50"></div>
                          <p className="text-xs font-bold text-white/50 mb-1">تم صرف / استهلاك</p>
                          <p className="text-2xl font-black text-rose-400 num">{fmt(totalSpent)} <span className="text-sm font-normal text-white/30">{cur}</span></p>
                       </div>
                       <div className={`border rounded-xl p-4 text-center relative overflow-hidden ${remainingBalance >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                          <div className={`absolute top-0 right-0 w-full h-1 ${remainingBalance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <p className="text-xs font-bold text-white/70 mb-1">{remainingBalance >= 0 ? 'يُرد للصندوق (فائض)' : 'مستحق للمسئول (عجز)'}</p>
                          <p className={`text-2xl font-black num ${remainingBalance >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ direction: 'ltr' }}>
                            {fmt(Math.abs(remainingBalance))} <span className="text-sm font-normal opacity-50">{cur}</span>
                          </p>
                       </div>
                    </div>
                  )}
               </div>
           </div>
        </Card>

        {/* Expenses List */}
        <Card variant="gold">
           <div className="flex items-center justify-between gap-3 mb-6 border-b border-gold/10 pb-4">
              <div className="flex items-center gap-3 text-gold">
                <FileText size={20} />
                <h3 className="font-bold text-lg text-white">نطاق إدخال المصاريف</h3>
              </div>
              <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20">
                إجمالي مسجل: {fmt(totalSpent)} {cur}
              </span>
           </div>

           <div className="space-y-3">
              {/* Desktop Headers */}
              <div className="hidden md:flex gap-3 px-2 text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">
                 <div className="w-8 text-center">#</div>
                 <div className="w-32">التاريخ (اختياري)</div>
                 <div className="w-48">إسم البند / النوع</div>
                 <div className="flex-1">البيان والتفاصيل</div>
                 <div className="w-24">رقم الفاتورة</div>
                 <div className="w-32">المبلغ</div>
                 <div className="w-10"></div>
              </div>

              {items.map((item, idx) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white/[0.04] p-3 rounded-xl border border-transparent hover:border-gold/30 transition-colors">
                   
                   <div className="hidden md:flex w-8 justify-center">
                     <span className="w-6 h-6 bg-black/20 rounded-full flex items-center justify-center text-xs text-white/30 font-bold num">{idx + 1}</span>
                   </div>

                   <div className="w-full md:w-32 relative">
                     <label className="text-[10px] text-white/30 font-bold block mb-1 md:hidden">تاريخ الصرف</label>
                     <input 
                       type="date" 
                       value={item.date} 
                       onChange={e => updateItem(item.id, 'date', e.target.value)}
                       className="w-full bg-[#1a2540] border border-white/5 focus:border-gold rounded-lg px-2 py-2 text-white text-xs outline-none"
                     />
                   </div>

                   <div className="w-full md:w-48 relative">
                     <label className="text-[10px] text-white/30 font-bold block mb-1 md:hidden">التصنيف</label>
                     <input 
                       type="text" 
                       list="single-categories-list"
                       value={item.category} 
                       onChange={e => updateItem(item.id, 'category', e.target.value)}
                       className="w-full bg-[#1a2540] border border-white/5 focus:border-gold rounded-lg px-3 py-2 text-white text-sm outline-none placeholder:text-white/20"
                       placeholder="مثال: بوفيه.."
                     />
                   </div>

                   <div className="w-full md:flex-1 relative">
                     <label className="text-[10px] text-white/30 font-bold block mb-1 md:hidden">البيان (وصف المصروف)</label>
                     <input 
                       type="text" 
                       value={item.note} 
                       onChange={e => updateItem(item.id, 'note', e.target.value)}
                       className="w-full bg-transparent border border-white/10 focus:bg-[#1a2540] focus:border-gold rounded-lg px-3 py-2 text-white text-sm outline-none placeholder:text-white/20"
                       placeholder="اشرح فيم صُرف المبلغ..."
                     />
                   </div>

                   <div className="w-full md:w-24 relative hidden md:block">
                     <input 
                       type="text" 
                       value={item.receiptNo} 
                       onChange={e => updateItem(item.id, 'receiptNo', e.target.value)}
                       className="w-full bg-black/20 border border-white/5 focus:border-gold rounded-lg px-2 py-2 text-white text-xs text-center outline-none placeholder:text-white/20"
                       placeholder="رقم الفاتورة"
                     />
                   </div>

                   <div className="w-full md:w-32 relative">
                     <label className="text-[10px] text-white/30 font-bold block mb-1 md:hidden">المبلغ المنصرف</label>
                     <input 
                       type="number" 
                       step="any"
                       value={item.amount} 
                       onChange={e => updateItem(item.id, 'amount', e.target.value)}
                       className="w-full bg-[#1a2540] border border-white/5 focus:border-gold rounded-lg px-3 py-2 text-gold font-bold text-lg outline-none placeholder:text-white/10 num text-left pr-8"
                       placeholder="0.00"
                     />
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 md:hidden pb-4">{cur}</span>
                   </div>

                   <div className="w-full md:w-10 flex justify-end shrink-0">
                      <button onClick={() => removeItem(item.id)} className="w-full md:w-10 h-10 rounded-lg text-white/20 hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors">
                        <Trash2 size={16} /><span className="md:hidden ml-2 text-sm font-bold text-danger">حذف</span>
                      </button>
                   </div>

                </div>
              ))}
              
              <div className="pt-2">
                 <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-success hover:bg-success/10 px-4 py-2.5 rounded-lg transition-colors border border-transparent hover:border-success/20">
                    <Plus size={16} /> إضافة مرفق مصروف جديد
                 </button>
              </div>
           </div>
        </Card>

      </div>

      <datalist id="single-categories-list">
        {allCategories.map((c, i) => <option key={i} value={c} />)}
      </datalist>

      {/* ===== PRINT VIEW ===== */}
      <div 
        ref={printRef} 
        className="hidden print:flex flex-col bg-white text-black w-full" 
        dir="rtl"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontFamily: 'Cairo, sans-serif' }}
      >
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 8mm; }
            body { margin: 0; padding: 0; }
            .print-container { height: 280mm; display: flex; flex-direction: column; overflow: hidden; }
          `}
        </style>

        <div className="print-container border-2 border-[#0f3460] p-4 relative rounded-xl">
           
           {/* Header - Compact */}
           <div className="flex justify-between items-start border-b-2 border-[#0f3460] pb-3 mb-4">
              <div>
                <h1 className="text-2xl font-black text-[#0f3460] mb-1">{settings.companyName || 'مؤسستك - نموذج مالي'}</h1>
                <div className="bg-gray-100 border border-gray-300 rounded px-4 py-1 shadow-sm w-fit">
                   <h2 className="text-xl font-bold text-gray-800">{reportTitle}</h2>
                </div>
              </div>
              <div className="bg-white border border-gray-300 p-2 rounded-lg shadow-sm text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                   <div><span className="text-gray-500 font-bold block">الرقم المرجعي:</span><span className="font-bold">V-{Date.now().toString().slice(-5)}</span></div>
                   <div><span className="text-gray-500 font-bold block">التاريخ:</span><span className="font-bold">{reportDate.split('-').reverse().join('/')}</span></div>
                   <div className="col-span-2 border-t border-gray-200 mt-1 pt-1"><span className="text-gray-500 font-bold inline-block w-16">المسئول:</span><span className="font-black text-sm text-[#0f3460]">{personName || '—'}</span></div>
                </div>
              </div>
           </div>

           {/* Fund Accounting Block (If Used) - Compact */}
           {isFundAccounting && (
              <div className="bg-blue-50/30 border border-[#0f3460] rounded-lg p-3 mb-4 flex justify-between items-center h-16">
                 <div className="text-center w-1/3 border-l border-gray-300">
                   <p className="text-[10px] font-bold text-gray-600">العهدة الأساسية المستلمة</p>
                   <p className="font-black text-xl text-gray-900 num block">{fmt(Number(fundAmount))} <span className="text-[10px] font-bold">{cur}</span></p>
                 </div>
                 <div className="text-center w-1/3 border-l border-gray-300">
                   <p className="text-[10px] font-bold text-red-600">إجمالي المنصرف المعُتمد</p>
                   <p className="font-black text-xl text-red-600 num block">{fmt(totalSpent)} <span className="text-[10px] font-bold">{cur}</span></p>
                 </div>
                 <div className="text-center w-1/3 relative">
                   <p className={`text-[10px] font-bold ${remainingBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {remainingBalance >= 0 ? 'المتبقي لُيرد للصندوق (فائض)' : 'عجز مستحق يُدفع للمسئول'}
                   </p>
                   <p className={`font-black text-2xl block num ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ direction: 'ltr' }}>
                     {fmt(Math.abs(remainingBalance))} <span className="text-xs font-bold">{cur}</span>
                   </p>
                 </div>
              </div>
           )}

           {/* Table - Ultra Compact flex-grow to fill middle */}
           <div className="flex-1 overflow-hidden flex flex-col">
             <table className="w-full text-xs border-collapse border border-gray-800">
                <thead>
                  <tr className="bg-[#0f3460] text-white">
                    <th className="border border-gray-800 py-1.5 px-2 w-8 text-center font-bold">#</th>
                    <th className="border border-gray-800 py-1.5 px-2 w-20 text-center font-bold">التاريخ</th>
                    <th className="border border-gray-800 py-1.5 px-2 w-32 text-right font-bold">التصنيف</th>
                    <th className="border border-gray-800 py-1.5 px-2 text-right font-bold">البيان ومبررات الصرف</th>
                    <th className="border border-gray-800 py-1.5 px-2 w-20 text-center font-bold">المستند</th>
                    <th className="border border-gray-800 py-1.5 px-2 w-28 text-center font-bold">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => Number(i.amount) > 0 || i.note).map((item, idx) => (
                    <tr key={item.id} className="odd:bg-white even:bg-gray-50/50">
                      <td className="border border-gray-800 py-1.5 px-2 text-center font-bold text-gray-600 num">{idx+1}</td>
                      <td className="border border-gray-800 py-1.5 px-2 text-center num text-[10px]">{item.date.split('-').reverse().join('/')}</td>
                      <td className="border border-gray-800 py-1.5 px-2 font-bold text-[#0f3460] text-[10px] truncate">{item.category}</td>
                      <td className="border border-gray-800 py-1.5 px-2 text-gray-900 font-medium leading-tight truncate max-w-[200px]">{item.note || '-'}</td>
                      <td className="border border-gray-800 py-1.5 px-2 text-center text-[10px] text-gray-700">{item.receiptNo || 'بدون'}</td>
                      <td className="border border-gray-800 py-1.5 px-2 text-left font-black text-gray-900 num text-sm bg-gray-100">
                        {fmt(Number(item.amount))} <span className="text-[8px] text-gray-500 mr-0.5">{cur}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Fill fewer empty rows to just finish table bottom lightly */}
                  {Array.from({ length: Math.max(0, 5 - validItemsCount) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="bg-white">
                      <td className="border border-gray-800 py-3"></td><td className="border border-gray-800"></td><td className="border border-gray-800"></td><td className="border border-gray-800"></td><td className="border border-gray-800"></td><td className="border border-gray-800 bg-gray-50"></td>
                    </tr>
                  ))}
                </tbody>
             </table>
             {/* Total Strip */}
             <div className="flex border border-t-0 border-gray-800">
                <div className="flex-1 bg-[#e8a020] text-gray-900 font-black text-sm px-4 py-2 flex items-center shadow-inner">
                  الإجمالي الكلي للمنصرفات الموثقة 
                </div>
                <div className="w-28 bg-yellow-100 font-black text-xl text-gray-900 px-2 py-1 text-left flex items-center justify-end shadow-inner border-l border-gray-800 num">
                  {fmt(totalSpent)} <span className="text-[10px] text-gray-700 ml-1 mt-1">{cur}</span>
                </div>
             </div>
           </div>

           {/* Signatures Formality - Compact at very bottom */}
           <div className="mt-4 pt-4 border-t-2 border-[#0f3460] shrink-0">
             <div className="grid grid-cols-4 gap-4 text-center bg-gray-50 p-3 border border-gray-200">
               <div>
                 <p className="font-bold text-[11px] text-gray-800 mb-6 border-b border-dashed border-gray-400 pb-1">المسئول / الطالب</p>
                 <p className="text-[9px] text-gray-500">تم الإستلام والتصفية</p>
               </div>
               <div>
                 <p className="font-bold text-[11px] text-gray-800 mb-6 border-b border-dashed border-gray-400 pb-1">المدير المباشر</p>
                 <p className="text-[9px] text-gray-500">تمت المراجعة الفنية</p>
               </div>
               <div>
                 <p className="font-bold text-[11px] text-gray-800 mb-6 border-b border-dashed border-gray-400 pb-1">الحسابات والصندوق</p>
                 <p className="text-[9px] text-gray-500">تمت المراجعة المالية</p>
               </div>
               <div>
                 <p className="font-bold text-[11px] text-gray-800 mb-6 border-b border-dashed border-gray-400 pb-1">إعتماد الإدارة</p>
                 <p className="text-[9px] text-gray-500">تصريح الصرف / التسوية</p>
               </div>
             </div>
           </div>

     </div>
    </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ExpensesSheet
