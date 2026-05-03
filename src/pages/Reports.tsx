import React, { useRef, useState, useMemo } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, Printer, Filter, Activity, TrendingUp, TrendingDown, Wallet, Calendar, Download } from 'lucide-react'
import { useOrdersStore } from '../store/useOrdersStore'
import { useEmployeesStore } from '../store/useEmployeesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { useDailyExpensesStore } from '../store/useDailyExpensesStore'
import { usePayrollStore } from '../store/usePayrollStore'
import { fmt, MONTH_NAMES } from '../utils/calculations'
import { exportToExcel } from '../utils/exportExcel'
import { PageHeader, MetricCard, EmptyState, Card, ResultRow, Divider } from '../components/ui'

const COLORS = ['#e8a020', '#3b82f6', '#00d68f', '#f87171', '#a78bfa']

const isWithinPeriod = (dateStr: string, period: string) => {
  if (period === 'all') return true;
  if (!dateStr) return false;
  
  const d = new Date(dateStr);
  const now = new Date();
  
  // Set to start/end of day for accurate comparison
  const dReset = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowReset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(nowReset.getTime() - dReset.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  
  if (period === 'weekly') return diffDays <= 7;
  if (period === 'monthly') return diffDays <= 30;
  if (period === 'quarterly') return diffDays <= 90;
  if (period === 'semi') return diffDays <= 180;
  if (period === 'yearly') return diffDays <= 365;
  return true;
}

const isPayrollWithinPeriod = (year: number, month: number, period: string) => {
  if (period === 'all') return true;
  const d = new Date(year, month, 1);
  return isWithinPeriod(d.toISOString(), period);
}

const Reports: React.FC = () => {
  const { settings } = useSettingsStore()
  const { silkscreenOrders, dtfOrders, clothingOrders } = useOrdersStore()
  const { employees } = useEmployeesStore()
  const { transactions: treasuryTx, generateCashFlowReport } = useTreasuryStore()
  const { expenses: dailyExpensesList } = useDailyExpensesStore()
  const { records: payrollRecords } = usePayrollStore()
  
  const [activeTab, setActiveTab] = useState<'financial' | 'cashflow'>('financial')
  const [period, setPeriod] = useState<string>('all')
  const [cfMonth, setCfMonth] = useState<number>(new Date().getMonth() + 1)
  const [cfYear, setCfYear] = useState<number>(new Date().getFullYear())

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Report_${period}` })
  const cur = settings.currencySymbol || settings.currency || 'ج.م'

  // Filtered Orders
  const silkFiltered = silkscreenOrders.filter(o => isWithinPeriod(o.date, period))
  const dtfFiltered = dtfOrders.filter(o => isWithinPeriod(o.date, period))
  const clothFiltered = clothingOrders.filter(o => isWithinPeriod(o.date, period))

  // Daily Expenses Calculation from Store
  const dailyExpenses = dailyExpensesList
    .filter(e => isWithinPeriod(e.date, period))
    .reduce((sum, e) => sum + e.amount, 0)

  // Revenue (Selling Prices)
  const silkRevenue = silkFiltered.reduce((s, o) => s + ((o.suggestedPrice || 0) * (o.totalPieces || 0)), 0)
  const dtfRevenue = dtfFiltered.reduce((s, o) => s + ((o.suggestedPricePerPiece || 0) * (o.totalPieces || 0)), 0)
  const clothRevenue = clothFiltered.reduce((s, o) => s + ((o.wholesalePrice || 0) * (o.totalPieces || 0)), 0)
  const totalRevenue = silkRevenue + dtfRevenue + clothRevenue

  // Production Costs
  const silkCost = silkFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)
  const dtfCost = dtfFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)
  const clothingCost = clothFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)
  const totalProductionCost = silkCost + dtfCost + clothingCost
  
  // Expenses (Actual Payroll Records + Daily)
  const laborCost = payrollRecords
    .filter(r => isPayrollWithinPeriod(r.year, r.month, period))
    .reduce((sum, r) => sum + (r.netSalary || 0), 0)

  const totalOperatingExpenses = laborCost + dailyExpenses

  // Final Calculations
  const grossProfit = totalRevenue - totalProductionCost
  const totalCost = totalProductionCost + totalOperatingExpenses
  const netProfit = totalRevenue - totalCost
  const totalOrders = silkFiltered.length + dtfFiltered.length + clothFiltered.length

  const silkProfit = silkRevenue - silkCost
  const dtfProfit = dtfRevenue - dtfCost
  const clothingProfit = clothRevenue - clothingCost

  // Month-over-Month Summary (Last 6 Months)
  const monthlySummary = useMemo(() => {
    const summary = []
    for (let i = 0; i < 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth()
      const monthLabel = `${MONTH_NAMES[month]} ${year}`

      const silkM = silkscreenOrders.filter(o => { const od = new Date(o.date); return od.getMonth() === month && od.getFullYear() === year })
      const dtfM = dtfOrders.filter(o => { const od = new Date(o.date); return od.getMonth() === month && od.getFullYear() === year })
      const clothM = clothingOrders.filter(o => { const od = new Date(o.date); return od.getMonth() === month && od.getFullYear() === year })

      const rev = silkM.reduce((s, o) => s + (o.suggestedPrice * o.totalPieces), 0) +
                  dtfM.reduce((s, o) => s + (o.suggestedPricePerPiece * o.totalPieces), 0) +
                  clothM.reduce((s, o) => s + (o.wholesalePrice * o.totalPieces), 0)

      const payrollM = payrollRecords.filter(r => r.month === month && r.year === year)
      const monthlyLabor = payrollM.reduce((s, r) => s + (r.netSalary || 0), 0)

      const cost = silkM.reduce((s, o) => s + o.totalOrderCost, 0) +
                   dtfM.reduce((s, o) => s + o.totalOrderCost, 0) +
                   clothM.reduce((s, o) => s + o.totalOrderCost, 0) +
                   monthlyLabor +
                   dailyExpensesList.filter(e => { const ed = new Date(e.date); return ed.getMonth() === month && ed.getFullYear() === year }).reduce((s, e) => s + e.amount, 0)

      summary.push({ monthLabel, rev, cost, profit: rev - cost })
    }
    return summary
  }, [silkscreenOrders, dtfOrders, clothingOrders, dailyExpensesList, payrollRecords])

  const handleExportExcel = () => {
    const data = [
      { القِسم: 'سيلك سكرين', الإيرادات: silkRevenue, التكاليف: silkCost, 'الربح الصافي': silkProfit },
      { القِسم: 'DTF', الإيرادات: dtfRevenue, التكاليف: dtfCost, 'الربح الصافي': dtfProfit },
      { القِسم: 'ورش الملابس', الإيرادات: clothRevenue, التكاليف: clothingCost, 'الربح الصافي': clothingProfit },
      { القِسم: 'رواتب الموظفين الثابتة', الإيرادات: 0, التكاليف: laborCost, 'الربح الصافي': -laborCost },
      { القِسم: 'المصاريف اليومية المشتركة', الإيرادات: 0, التكاليف: dailyExpenses, 'الربح الصافي': -dailyExpenses }
    ]
    exportToExcel(data, `ProTex_Financial_Summary_${period}`)
  }

  const barData = [
    { name: 'سيلك سكرين', تكلفة: Math.round(silkCost), ربح: Math.round(silkProfit), أوردرات: silkFiltered.length },
    { name: 'DTF', تكلفة: Math.round(dtfCost), ربح: Math.round(dtfProfit), أوردرات: dtfFiltered.length },
    { name: 'ملابس', تكلفة: Math.round(clothingCost), ربح: Math.round(clothingProfit), أوردرات: clothFiltered.length },
  ]

  const pieData = [
    { name: 'تكاليف سيلك', value: Math.round(silkCost) },
    { name: 'تكاليف DTF', value: Math.round(dtfCost) },
    { name: 'تكاليف ملابس', value: Math.round(clothingCost) },
    { name: 'رواتب الموظفين', value: Math.round(laborCost) },
    { name: 'مصاريف يومية', value: Math.round(dailyExpenses) },
  ].filter(d => d.value > 0)

  const hasData = totalOrders > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="التقارير والإحصائيات"
        subtitle="نظرة شاملة على الأداء المالي"
        icon={<BarChart3 size={18} />}
        actions={
          <div className="flex gap-2">
            <div className="flex bg-[#1a2540] p-1 rounded-lg border border-white/10 print-only:hidden">
              <button 
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'financial' ? 'bg-gold text-[#0f3460] font-bold shadow-md' : 'text-white/60 hover:text-white'}`}
                onClick={() => setActiveTab('financial')}
              >
                التقرير المالي
              </button>
              <button 
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'cashflow' ? 'bg-gold text-[#0f3460] font-bold shadow-md' : 'text-white/60 hover:text-white'}`}
                onClick={() => setActiveTab('cashflow')}
              >
                التدفق النقدي
              </button>
            </div>
            {activeTab === 'financial' && (
              <select 
                value={period} 
                onChange={e => setPeriod(e.target.value)}
                className="bg-[#1a2540] text-sm text-white px-3 py-2 rounded-lg border border-white/20 outline-none print-only:hidden"
              >
                <option value="all">كل الأوقات</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="semi">نصف سنوي</option>
                <option value="yearly">سنوي</option>
              </select>
            )}
            {activeTab === 'cashflow' && (
              <input 
                type="month" 
                value={`${cfYear}-${String(cfMonth).padStart(2, '0')}`} 
                onChange={e => {
                  const [y, m] = e.target.value.split('-')
                  setCfYear(parseInt(y))
                  setCfMonth(parseInt(m))
                }}
                className="bg-[#1a2540] text-sm text-white px-3 py-2 rounded-lg border border-white/20 outline-none print-only:hidden"
              />
            )}
            {((activeTab === 'financial' && hasData) || (activeTab === 'cashflow')) && (
              <>
                <button className="btn-ghost" onClick={handleExportExcel}><Download size={14} /> Excel</button>
                <button className="btn-gold shadow-lg shadow-gold/20" onClick={() => handlePrint()}><Printer size={14} /> طباعة التقرير</button>
              </>
            )}
          </div>
        }
      />

      {!hasData ? (
        <Card><EmptyState icon="📊" title="لا توجد بيانات"
          description="أضف أوردرات لتظهر هنا التقارير والإحصائيات الشاملة" /></Card>
      ) : (
        <div ref={printRef} className="space-y-5" dir="rtl">
          {activeTab === 'financial' && (
            <>
              {/* Print Header */}
              <div className="print-only mb-4">
                <div className="text-center border-b-2 border-[#0f3460] pb-4 mb-4">
                  <h1 className="text-3xl font-black text-[#0f3460] mb-2">{settings.companyName || 'ProTex ERP'}</h1>
                  <h2 className="text-xl text-gray-800 font-bold bg-gray-100 py-2 rounded-lg mt-2 border border-gray-300">
                    التقرير المالي 
                    {period === 'weekly' ? ' (أسبوعي)' : period === 'monthly' ? ' (شهري)' : period === 'quarterly' ? ' (ربع سنوي)' : period === 'semi' ? ' (نصف سنوي)' : period === 'yearly' ? ' (سنوي)' : ' (شامل)'}
                    — {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <MetricCard label="إجمالي الأوردرات" value={String(totalOrders)} variant="navy" icon={<BarChart3 size={16} />} />
                <MetricCard label="إجمالي الإيرادات" value={`${fmt(totalRevenue, 0)} ${cur}`} variant="gold" icon={<TrendingUp size={16} />} large />
                <MetricCard label="إجمالي التكاليف والمصاريف" value={`${fmt(totalCost, 0)} ${cur}`} variant="danger" icon={<TrendingDown size={16} />} large />
                <MetricCard label="صافي الربح" value={`${fmt(netProfit, 0)} ${cur}`} variant={netProfit >= 0 ? "success" : "danger"} icon={<Wallet size={16} />} large />
              </div>

              {/* Summary */}
              <Card className="print:shadow-none print:border print:border-gray-300 print:bg-white">
                <ResultRow label="إجمالي إيرادات المبيعات" value={`${fmt(totalRevenue)} ${cur}`} highlight="gold" bold />
                <Divider />
                <ResultRow label="تكاليف الإنتاج (مواد خام وطاقة)" value={`${fmt(totalProductionCost)} ${cur}`} />
                <ResultRow label="مجمل الربح (قبل الرواتب والمصاريف)" value={`${fmt(grossProfit)} ${cur}`} variant="success" bold />
                <Divider />
                <ResultRow label="رواتب الموظفين والعمال (سجلات فعلية)" value={`${fmt(laborCost)} ${cur}`} variant="danger" />
                <ResultRow label="المصاريف اليومية والتشغيلية" value={`${fmt(dailyExpenses)} ${cur}`} variant="danger" />
                
                <Divider gold />
                
                <ResultRow label="إجمالي المنصرف الكلي" value={`${fmt(totalCost)} ${cur}`} highlight="danger" bold />
                <ResultRow label="صافي الربح النهائي" value={`${fmt(netProfit)} ${cur}`} highlight={netProfit >= 0 ? "success" : "danger"} bold />
                <ResultRow label="هامش صافي الربح" value={`${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0'}%`} variant={netProfit >= 0 ? "success" : "danger"} bold />
              </Card>

              {/* Month-over-Month Summary Table */}
              <Card className="no-print overflow-hidden">
                <h3 className="section-title mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-gold" />
                  ملخص الأداء لآخر 6 أشهر
                </h3>
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>الشهر</th>
                        <th>الإيرادات</th>
                        <th>التكاليف</th>
                        <th>الربح الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.map((m, i) => (
                        <tr key={i}>
                          <td className="font-bold text-white/70">{m.monthLabel}</td>
                          <td className="num text-gold font-bold">{fmt(m.rev)}</td>
                          <td className="num text-white/40">{fmt(m.cost)}</td>
                          <td className={`num font-black ${m.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                            {fmt(m.profit)} {cur}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Bar Chart */}
              <Card className="no-print">
                <h3 className="section-title mb-4">مقارنة التكاليف والأرباح</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                    <Tooltip
                      contentStyle={{ background: '#1a2540', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 10, fontFamily: 'Cairo', fontSize: 12 }}
                      labelStyle={{ color: '#e8a020' }}
                      formatter={(v: any, n: any) => [`${fmt(v)} ${cur}`, n === 'تكلفة' ? 'التكلفة' : 'الربح']}
                    />
                    <Bar dataKey="تكلفة" fill="rgba(59,130,246,0.5)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ربح" fill="#e8a020" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.5)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* ERP Financial Audit */}
              <Card className="print:shadow-none">
                <h3 className="section-title mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-gold" />
                  تقرير التدقيق المالي الموحد (ERP Audit)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/40 mb-1">تحصيلات العملاء</p>
                    <p className="num text-xl font-bold text-success">{fmt(treasuryTx.filter(t => t.type === 'income_client' && isWithinPeriod(t.date, period)).reduce((s,t) => s + t.amount, 0))} {cur}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/40 mb-1">مدفوعات الموردين</p>
                    <p className="num text-xl font-bold text-danger">{fmt(treasuryTx.filter(t => t.type === 'expense_supplier' && isWithinPeriod(t.date, period)).reduce((s,t) => s + t.amount, 0))} {cur}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/40 mb-1">صافي حركة الخزينة (للفترة)</p>
                    <p className="num text-xl font-bold text-gold">{fmt(treasuryTx.filter(t => isWithinPeriod(t.date, period)).reduce((s,t) => t.isIncome ? s + t.amount : s - t.amount, 0))} {cur}</p>
                  </div>
                </div>
              </Card>

              {/* Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 no-print">
                {pieData.length > 0 && (
                  <Card>
                    <h3 className="section-title mb-4">توزيع التكاليف التشغيلية</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1a2540', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Cairo', fontSize: 11 }}
                          formatter={(v: any) => [`${fmt(v)} ${cur}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {pieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                            <span className="text-white/40">{item.name}</span>
                          </div>
                          <span className="num text-white/70 font-medium">{fmt(item.value)} {cur}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card>
                  <h3 className="section-title mb-4">الأرباح مقابل التكاليف</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={[
                        { name: 'الأرباح', value: Math.max(0, Math.round(netProfit)) },
                        { name: 'التكاليف', value: Math.max(0, Math.round(totalCost)) },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        <Cell fill="#00d68f" />
                        <Cell fill="#f87171" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a2540', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Cairo', fontSize: 11 }}
                        formatter={(v: any) => [`${fmt(v)} ${cur}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-success" /><span className="text-white/40">الأرباح</span></div>
                      <span className="num text-success font-bold">{fmt(netProfit)} {cur}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-danger" /><span className="text-white/40">التكاليف</span></div>
                      <span className="num text-danger font-bold">{fmt(totalCost)} {cur}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'cashflow' && (() => {
            const cf = generateCashFlowReport(cfMonth, cfYear)
            const cfPieData = [
              { name: 'موردين', value: cf.byCategory.supplierPayments },
              { name: 'رواتب', value: cf.byCategory.salaries },
              { name: 'مصنع', value: cf.byCategory.factoryExpenses },
              { name: 'أخرى', value: cf.byCategory.otherExpenses }
            ].filter(d => d.value > 0)

            return (
              <>
                {/* Print Header */}
                <div className="print-only mb-4">
                  <div className="text-center border-b-2 border-[#0f3460] pb-4 mb-4">
                    <h1 className="text-3xl font-black text-[#0f3460] mb-2">{settings.companyName || 'ProTex ERP'}</h1>
                    <h2 className="text-xl text-gray-800 font-bold bg-gray-100 py-2 rounded-lg mt-2 border border-gray-300">
                      تقرير التدفق النقدي (Cash Flow)
                      — شهر {cfMonth} سنة {cfYear}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                  <MetricCard label="إجمالي الدخل" value={`${fmt(cf.totalIncome, 0)} ${cur}`} variant="success" icon={<TrendingUp size={16} />} large />
                  <MetricCard label="إجمالي المصروفات" value={`${fmt(cf.totalExpenses, 0)} ${cur}`} variant="danger" icon={<TrendingDown size={16} />} large />
                  <MetricCard label="صافي التدفق (Net Flow)" value={`${fmt(cf.netFlow, 0)} ${cur}`} variant={cf.netFlow >= 0 ? "success" : "danger"} icon={<Activity size={16} />} large />
                  <MetricCard label="الرصيد الختامي" value={`${fmt(cf.closingBalance, 0)} ${cur}`} variant="navy" icon={<Wallet size={16} />} large />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Card className="lg:col-span-2">
                    <h3 className="section-title mb-4">التدفق اليومي (دخل / مصروف)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cf.dailyFlow} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tickFormatter={d => d.split('-')[2]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                        <Tooltip
                          contentStyle={{ background: '#1a2540', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 10, fontFamily: 'Cairo', fontSize: 12 }}
                          formatter={(v: any, n: any) => [`${fmt(v)} ${cur}`, n === 'income' ? 'دخل' : n === 'expense' ? 'مصروف' : 'رصيد']}
                          labelFormatter={d => `التاريخ: ${d}`}
                        />
                        <Bar dataKey="income" fill="#00d68f" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="expense" fill="#f87171" radius={[2, 2, 0, 0]} />
                        <Line type="monotone" dataKey="balance" stroke="#e8a020" strokeWidth={2} dot={false} />
                        <Legend formatter={(value) => value === 'income' ? 'الدخل' : value === 'expense' ? 'المصروف' : 'الرصيد'} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.5)' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card>
                    <h3 className="section-title mb-4">توزيع المصروفات</h3>
                    {cfPieData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={cfPieData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                              {cfPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: '#1a2540', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Cairo', fontSize: 11 }}
                              formatter={(v: any) => [`${fmt(v)} ${cur}`, '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 mt-2">
                          {cfPieData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                                <span className="text-white/40">{item.name}</span>
                              </div>
                              <span className="num text-white/70 font-medium">{fmt(item.value)} {cur}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">
                        لا يوجد مصروفات في هذا الشهر
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )
          })()}

          {/* Print Footer */}
          <div className="print-only mt-8 flex justify-between text-xs text-gray-400 border-t border-gray-200 pt-3">
            <span>صادر بتاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
            <span>{settings.companyName}</span>
            <span>المحاسب: ______________</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
