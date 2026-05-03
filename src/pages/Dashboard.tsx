import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Printer, Zap, Shirt, Users, Plus, ArrowLeft, TrendingUp, Activity,
  AlertCircle, CreditCard, History, Package, Wallet, AlertTriangle
} from 'lucide-react'
import { useOrdersStore } from '../store/useOrdersStore'
import { useEmployeesStore } from '../store/useEmployeesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTreasuryStore } from '../store/useTreasuryStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useClientsStore } from '../store/useClientsStore'
import { usePayrollStore } from '../store/usePayrollStore'
import { useDailyExpensesStore } from '../store/useDailyExpensesStore'
import { fmt, MONTH_NAMES } from '../utils/calculations'
import { MetricCard, EmptyState, Card, Badge, Select } from '../components/ui'

const isWithinPeriod = (dateStr: string, period: string) => {
  if (period === 'all') return true;
  if (!dateStr) return false;
  
  const d = new Date(dateStr);
  const now = new Date();
  
  // Reset time for comparison
  const dReset = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowReset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(nowReset.getTime() - dReset.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  
  if (period === 'today') return diffDays <= 1;
  if (period === 'week') return diffDays <= 7;
  if (period === 'month') return diffDays <= 30;
  return true;
}

const isPayrollWithinPeriod = (year: number, month: number, period: string) => {
  if (period === 'all') return true;
  const d = new Date(year, month, 1);
  return isWithinPeriod(d.toISOString(), period);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] as any },
})

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { silkscreenOrders, dtfOrders, clothingOrders } = useOrdersStore()
  const { employees } = useEmployeesStore()
  const { balance, transactions: treasuryTx } = useTreasuryStore()
  const { items } = useInventoryStore()
  const { clients } = useClientsStore()
  const { records: payrollRecords } = usePayrollStore()
  const [viewPeriod, setViewPeriod] = React.useState<string>('month')
  const cur = settings.currencySymbol || 'ج.م'

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // — FILTERED DATA —
  const silkFiltered = silkscreenOrders.filter(o => isWithinPeriod(o.date, viewPeriod))
  const dtfFiltered = dtfOrders.filter(o => isWithinPeriod(o.date, viewPeriod))
  const clothFiltered = clothingOrders.filter(o => isWithinPeriod(o.date, viewPeriod))
  const { expenses: dailyExpensesList } = useDailyExpensesStore()
  const expensesFiltered = dailyExpensesList.filter(e => isWithinPeriod(e.date, viewPeriod))
  const payrollFiltered = payrollRecords.filter(r => isPayrollWithinPeriod(r.year, r.month, viewPeriod))

  // ── Inventory ────────────────────────────────────────────────────────────────
  const lowStockCount = items.filter(i => i.quantity <= i.minimumStock).length
  const totalStockValue = items.reduce((s, i) => s + (i.quantity * i.costPerUnit), 0)

  // ── Clients receivables ──────────────────────────────────────────────────────
  const totalReceivables = clients.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0)
  const overdueClients = clients.filter(c => c.balance < 0).length

  // ── Daily expenses filtered ────────────────────────────────────────────────
  const dailyExpenses = expensesFiltered.reduce((s, e) => s + e.amount, 0)

  // ── Orders aggregates (Revenue-based, accurate) ──────────────────────────────
  const silkRevenue = silkFiltered.reduce((s, o) => s + ((o.suggestedPrice || 0) * (o.totalPieces || 0)), 0)
  const dtfRevenue = dtfFiltered.reduce((s, o) => s + ((o.suggestedPricePerPiece || 0) * (o.totalPieces || 0)), 0)
  const clothRevenue = clothFiltered.reduce((s, o) => s + ((o.wholesalePrice || 0) * (o.totalPieces || 0)), 0)

  const silkCost = silkFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)
  const dtfCost = dtfFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)
  const clothingCost = clothFiltered.reduce((s, o) => s + (o.totalOrderCost || 0), 0)

  const silkProfit = silkRevenue - silkCost
  const dtfProfit = dtfRevenue - dtfCost
  const clothingProfit = clothRevenue - clothingCost
  const totalRevenue = silkRevenue + dtfRevenue + clothRevenue
  const totalProductionCost = silkCost + dtfCost + clothingCost

  const allOrdersFiltered = [...silkFiltered, ...dtfFiltered, ...clothFiltered]
  const totalOrders = allOrdersFiltered.length
  const inProgressOrders = allOrdersFiltered.filter(o => o.status === 'processing' || o.status === 'finishing').length

  // ── Payroll for filtered period ──────────────────────────────────────────────
  const laborCost = payrollFiltered.reduce((s, r) => s + r.netSalary, 0)
  
  const isCurrentMonthPayrollSaved = payrollRecords.some(r => r.year === currentYear && r.month === currentMonth)
  
  // ── Net P&L (correct formula: Revenue - Production Cost - Operating Expenses) ─
  const totalOperatingExpenses = laborCost + dailyExpenses
  const netProfit = totalRevenue - totalProductionCost - totalOperatingExpenses
  const totalProfitBeforeExpenses = totalRevenue - totalProductionCost // gross profit

  // ── Treasury income for period ──────────────────────────────────────────────
  const periodIncome = treasuryTx
    .filter(t => t.isIncome && isWithinPeriod(t.date, viewPeriod))
    .reduce((s, t) => s + t.amount, 0)
  const periodExpense = treasuryTx
    .filter(t => !t.isIncome && isWithinPeriod(t.date, viewPeriod))
    .reduce((s, t) => s + t.amount, 0)

  // ── Chart: last 6 months payroll ─────────────────────────────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1)
    const y = d.getFullYear(); const m = d.getMonth()
    const recs = payrollRecords.filter(r => r.year === y && r.month === m)
    return {
      name: MONTH_NAMES[m].slice(0, 3),
      رواتب: Math.round(recs.reduce((s, r) => s + r.netSalary, 0)),
      موظفون: recs.length,
    }
  })

  // ── Bar chart orders ─────────────────────────────────────────────────────────
  const chartData = [
    { name: 'سيلك', تكلفة: Math.round(silkCost), ربح: Math.round(silkProfit) },
    { name: 'DTF', تكلفة: Math.round(dtfCost), ربح: Math.round(dtfProfit) },
    { name: 'ملابس', تكلفة: Math.round(clothingCost), ربح: Math.round(clothingProfit) },
  ]

  // ── Recent orders ────────────────────────────────────────────────────────────
  const recent = [
    ...silkscreenOrders.map(o => ({ id: o.id, type: 'silk', title: o.printingUnit || '—', date: o.date, profit: o.netProfit, cost: o.totalOrderCost, status: o.status || 'pending' })),
    ...dtfOrders.map(o => ({ id: o.id, type: 'dtf', title: o.printingUnit || '—', date: o.date, profit: o.netProfit, cost: o.totalOrderCost, status: o.status || 'pending' })),
    ...clothingOrders.map(o => ({ id: o.id, type: 'clothing', title: o.factoryName || '—', date: o.date, profit: o.netProfit, cost: o.totalOrderCost, status: o.status || 'pending' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)

  const hasData = totalOrders > 0
  const isNew = !settings.companyName
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Dashboard_Summary' })

  return (
    <div ref={printRef} className="space-y-6 print:p-6 print:bg-white" dir="rtl">
      {/* Print Header */}
      <div className="hidden print:block mb-6 border-b-2 border-[#0f3460] pb-4 text-center">
        <h1 className="text-3xl font-black text-[#0f3460] mb-2">{settings.companyName || 'ProTex ERP'}</h1>
        <h2 className="text-xl text-gray-800 font-bold bg-gray-100 py-2 rounded-lg mt-2 border border-gray-300">
          ملخص قيادة النظام (Dashboard) — {now.toLocaleDateString('ar-EG')}
        </h2>
      </div>

      {isNew && (
        <motion.div {...fadeUp(0)} className="hero-card p-5 cursor-pointer print:hidden" onClick={() => navigate('/settings')} whileHover={{ scale: 1.01 }}>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gold/20 flex items-center justify-center flex-shrink-0"><AlertCircle size={20} className="text-gold" /></div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm mb-0.5">مرحباً في النظام الجديد! 👋</p>
              <p className="text-xs text-white/45">ابدأ بإعداد اسم مصنعك وبياناتك من هنا</p>
            </div>
            <ArrowLeft size={18} className="text-gold/60 flex-shrink-0" />
          </div>
        </motion.div>
      )}

      {lowStockCount > 0 && (
        <motion.div {...fadeUp(0.02)} className="bg-danger/10 border border-danger/20 rounded-2xl p-4 cursor-pointer print:hidden mb-4 hover:bg-danger/20 transition-colors" onClick={() => navigate('/inventory')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-danger/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-danger" />
              </div>
              <div>
                <p className="font-bold text-danger text-sm mb-0.5">تنبيه نواقص مخزون ⚠️</p>
                <p className="text-xs text-white/60">يوجد {lowStockCount} صنف في المخزن وصل للحد الأدنى، يرجى مراجعة الخامات.</p>
              </div>
            </div>
            <ArrowLeft size={16} className="text-danger/60" />
          </div>
        </motion.div>
      )}

      <motion.div {...fadeUp(0.05)} className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white">لوحة القيادة الموحدة</h1>
          <p className="text-xs text-white/35 mt-1">
            بيانات {viewPeriod === 'month' ? `شهر ${MONTH_NAMES[currentMonth]}` : viewPeriod === 'today' ? 'اليوم' : viewPeriod === 'week' ? 'هذا الأسبوع' : 'كل الأوقات'} {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={viewPeriod} 
            onChange={e => setViewPeriod(e.target.value)}
            options={[
              { value: 'today', label: 'اليوم' },
              { value: 'week', label: 'هذا الأسبوع' },
              { value: 'month', label: 'هذا الشهر' },
              { value: 'all', label: 'كل الأوقات' }
            ]}
            className="w-32"
          />
          <button className="btn-gold shadow-lg shadow-gold/20 py-1.5 px-3 text-xs" onClick={() => handlePrint()}><Printer size={14} /> طباعة</button>
        </div>
      </motion.div>

      {/* ── KPI Row 1: Financial ─────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.08)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="السيولة في الخزينة"
          value={`${fmt(balance)} ${cur}`}
          icon={<Wallet size={17} />}
          variant={balance >= 0 ? 'navy' : 'danger'}
          large
          onClick={() => navigate('/treasury')}
          subValue={`دخل الفترة: ${fmt(periodIncome, 0)}`}
        />
        <MetricCard
          label="صافي الربح"
          value={`${fmt(netProfit)} ${cur}`}
          icon={<Activity size={17} />}
          variant={netProfit >= 0 ? 'success' : 'danger'}
          large
          onClick={() => navigate('/reports')}
          subValue={`إيرادات الفترة: ${fmt(totalRevenue, 0)}`}
        />
        <MetricCard
          label="مستحقات العملاء"
          value={`${fmt(totalReceivables, 0)} ${cur}`}
          icon={<AlertTriangle size={17} />}
          variant={totalReceivables > 0 ? 'danger' : 'success'}
          subValue={`${overdueClients} عميل متأخر`}
          onClick={() => navigate('/clients')}
        />
        <MetricCard
          label="قيمة خامات المخزن"
          value={`${fmt(totalStockValue, 0)} ${cur}`}
          icon={<Package size={17} />}
          variant={lowStockCount > 0 ? 'gold' : 'navy'}
          subValue={lowStockCount > 0 ? `⚠️ ${lowStockCount} صنف ناقص` : `${items.length} صنف`}
          onClick={() => navigate('/inventory')}
        />
      </motion.div>

      {/* ── KPI Row 2: Operations ────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.11)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="موظفون مسجلون" value={String(employees.length)} icon={<Users size={17} />} variant="navy" onClick={() => navigate('/employees')} subValue={`${inProgressOrders} أوردر جاري`} />
        <MetricCard
          label={`رواتب ${MONTH_NAMES[currentMonth]}`}
          value={`${fmt(laborCost, 0)} ${cur}`}
          icon={<CreditCard size={17} />}
          variant="default"
          onClick={() => navigate('/payroll')}
          subValue={isCurrentMonthPayrollSaved ? '✓ مسجل في السجل' : 'لم يُسجَّل بعد'}
        />
        <MetricCard label="مصروفات هذا الشهر" value={`${fmt(totalOperatingExpenses, 0)} ${cur}`} icon={<AlertCircle size={17} />} variant="danger" subValue="خزينة + رواتب" onClick={() => navigate('/treasury')} />
        <MetricCard label="إجمالي الأوردرات" value={String(totalOrders)} icon={<TrendingUp size={17} />} variant="gold" onClick={() => navigate('/production')} subValue={`${inProgressOrders} قيد التنفيذ`} />
      </motion.div>

      {/* ── Alerts ───────────────────────────────────────────────────────────── */}
      {(lowStockCount > 0 || overdueClients > 0 || !isCurrentMonthPayrollSaved) && (
        <motion.div {...fadeUp(0.13)} className="space-y-2">
          {!isCurrentMonthPayrollSaved && employees.length > 0 && (
            <div className="flex items-center gap-3 bg-gold/8 border border-gold/20 rounded-xl px-4 py-3 cursor-pointer" onClick={() => navigate('/payroll')}>
              <CreditCard size={16} className="text-gold flex-shrink-0" />
              <p className="text-xs text-white/70 flex-1">رواتب {MONTH_NAMES[currentMonth]} لم تُحفظ في السجل التاريخي بعد</p>
              <span className="text-xs text-gold font-bold">حفظ الآن ←</span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 bg-danger/8 border border-danger/20 rounded-xl px-4 py-3 cursor-pointer" onClick={() => navigate('/inventory')}>
              <Package size={16} className="text-danger flex-shrink-0" />
              <p className="text-xs text-white/70 flex-1">{lowStockCount} صنف وصل لحد التنبيه — يحتاج تجديد مخزون</p>
              <span className="text-xs text-danger font-bold">المخزن ←</span>
            </div>
          )}
          {overdueClients > 0 && (
            <div className="flex items-center gap-3 bg-orange-500/8 border border-orange-500/20 rounded-xl px-4 py-3 cursor-pointer" onClick={() => navigate('/clients')}>
              <AlertTriangle size={16} className="text-orange-400 flex-shrink-0" />
              <p className="text-xs text-white/70 flex-1">{overdueClients} عميل لديه مستحقات متأخرة بإجمالي {fmt(totalReceivables, 0)} {cur}</p>
              <span className="text-xs text-orange-400 font-bold">العملاء ←</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.15)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders profit chart */}
        {hasData && (
          <Card className="print:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">أرباح وتكاليف الأقسام</p>
              <button className="btn-ghost text-xs px-3 py-1.5 print:hidden" onClick={() => navigate('/reports')}>تقرير كامل</button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ background: '#1a2540', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 10, fontSize: 12, fontFamily: 'Cairo' }} labelStyle={{ color: '#e8a020' }} formatter={(v: any, n: any) => [`${fmt(Number(v))} ${cur}`, n === 'ربح' ? 'ربح' : 'تكلفة']} />
                <Bar dataKey="تكلفة" fill="rgba(15,52,96,0.7)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ربح" fill="#e8a020" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Payroll trend last 6 months */}
        {payrollRecords.length > 0 && (
          <Card className="print:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">مؤشر الرواتب (6 أشهر)</p>
              <button className="btn-ghost text-xs px-3 py-1.5 print:hidden" onClick={() => navigate('/payroll-history')}>السجل الكامل</button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last6Months} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ background: '#1a2540', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 10, fontSize: 12, fontFamily: 'Cairo' }} labelStyle={{ color: '#00d68f' }} formatter={(v: any) => [`${fmt(Number(v))} ${cur}`, 'صافي الرواتب']} />
                <Bar dataKey="رواتب" fill="#00d68f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </motion.div>

      {/* ── Module quick access ───────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.18)} className="grid grid-cols-3 gap-3">
        {[
          { label: 'سيلك سكرين', icon: Printer, to: '/silkscreen', count: silkscreenOrders.length, profit: silkProfit, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
          { label: 'طباعة DTF', icon: Zap, to: '/dtf', count: dtfOrders.length, profit: dtfProfit, color: 'text-gold', bg: 'bg-gold/8', border: 'border-gold/15' },
          { label: 'ورش الملابس', icon: Shirt, to: '/clothing', count: clothingOrders.length, profit: clothingProfit, color: 'text-success', bg: 'bg-success/8', border: 'border-success/15' },
        ].map(({ label, icon: Icon, to, count, profit, color, bg, border }) => (
          <motion.div key={to} className={`card p-4 cursor-pointer border ${border} hover:scale-[1.02] transition-transform`} onClick={() => navigate(to)} whileTap={{ scale: 0.98 }}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon size={15} className={color} /></div>
            <p className={`num text-xl font-black ${color}`}>{count}</p>
            <p className="text-[10px] text-white/35 mt-0.5">{label}</p>
            {profit > 0 && <p className="text-[10px] text-success mt-2 font-medium num">+{fmt(profit, 0)}</p>}
          </motion.div>
        ))}
      </motion.div>

      {/* ── Recent orders ─────────────────────────────────────────────────────── */}
      {recent.length > 0 && (
        <motion.div {...fadeUp(0.22)}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">أحدث العمليات التشغيلية</p>
              <button className="btn-ghost text-xs px-3 py-1.5 print:hidden" onClick={() => navigate('/production')}>لوحة التشغيل</button>
            </div>
            <div className="space-y-1">
              {recent.map(o => {
                const tc = ({ silk: { label: 'سيلك', color: 'badge-navy', letter: 'S' }, dtf: { label: 'DTF', color: 'badge-gold', letter: 'D' }, clothing: { label: 'ملابس', color: 'badge-success', letter: 'C' } } as any)[o.type] || { label: '?', color: 'badge-muted', letter: '?' }
                const st = o.status === 'delivered' ? 'مٌسلّم' : o.status === 'ready' ? 'جاهز' : o.status === 'finishing' ? 'تقفيل' : o.status === 'processing' ? 'تشغيل' : 'انتظار'
                return (
                  <div key={o.id} className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-white/3 border-b border-white/5 last:border-0 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-white/30 flex-shrink-0">{tc.letter}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 font-bold truncate">{o.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={tc.color} style={{ fontSize: 10, padding: '2px 7px' }}>{tc.label}</span>
                        <Badge variant="muted">{st}</Badge>
                        <span className="text-[10px] text-white/25 hidden md:block">{o.date}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="num text-sm font-bold text-gold">{fmt(o.profit || 0, 0)} {cur}</p>
                      <p className="text-[10px] text-white/40">ت: {fmt(o.cost || 0, 0)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {!hasData && (
        <motion.div {...fadeUp(0.2)}>
          <Card>
            <EmptyState icon={<Activity />} title="لا توجد بيانات بعد" description="ابدأ بإضافة أوردرات من أقسام الطباعة أو ورش الملابس"
              action={<div className="flex flex-wrap gap-3 justify-center mt-2">
                <button className="btn-gold" onClick={() => navigate('/silkscreen')}><Plus size={14} /> سيلك</button>
                <button className="btn-navy" onClick={() => navigate('/dtf')}><Zap size={14} /> DTF</button>
                <button className="btn-success" onClick={() => navigate('/clothing')}><Shirt size={14} /> ملابس</button>
              </div>}
            />
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.28)} className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <button className="btn-gold w-full flex-col h-auto py-3 gap-1" onClick={() => navigate('/silkscreen')}><Printer size={18} /><span className="text-xs">سيلك جديد</span></button>
        <button className="btn-navy w-full flex-col h-auto py-3 gap-1" onClick={() => navigate('/dtf')}><Zap size={18} /><span className="text-xs">DTF جديد</span></button>
        <button className="btn-success w-full flex-col h-auto py-3 gap-1" onClick={() => navigate('/employees')}><Users size={18} /><span className="text-xs">موظف جديد</span></button>
        <button className="btn-ghost border border-success/30 text-success hover:bg-success/10 w-full flex-col h-auto py-3 gap-1" onClick={() => navigate('/payroll-history')}><History size={18} /><span className="text-xs">سجل الرواتب</span></button>
      </motion.div>
    </div>
  )
}

export default Dashboard
