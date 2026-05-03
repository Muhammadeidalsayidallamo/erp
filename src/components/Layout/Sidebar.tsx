import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Printer, Zap, Shirt, Users, CreditCard,
  BarChart3, Settings, ChevronLeft, Package, Wallet, KanbanSquare, FileSpreadsheet, Calculator, CalendarDays, CalendarCheck, History, Code, Grid3x3
} from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useOrdersStore } from '../../store/useOrdersStore'
import { useEmployeesStore } from '../../store/useEmployeesStore'

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { to: '/silkscreen', label: 'سيلك سكرين', icon: Printer },
  { to: '/dtf', label: 'طباعة DTF', icon: Zap },
  { to: '/clothing', label: 'ورش الملابس', icon: Shirt },
  { to: '/pieceworkers-ledger', label: 'كشوف عمالة الورش (القطعة)', icon: Users },
  { to: '/production', label: 'لوحة التشغيل (Kanban)', icon: KanbanSquare },
  { to: '/piecework', label: 'محاسبة الإنتاج والقطع', icon: Calculator },
  { to: '/operations-bulletin', label: 'مخطط العمليات (تسعير الموديل)', icon: Calculator },
  { to: '/inventory', label: 'مخازن الخامات', icon: Package },
  { to: '/clients', label: 'العملاء والديون', icon: Users },
  { to: '/suppliers', label: 'الموردين والمشتريات', icon: Users },
  { to: '/treasury', label: 'الخزينة والماليات', icon: Wallet },
  { to: '/daily-expenses', label: 'المصاريف اليومية المشتركة', icon: CalendarDays },
  { to: '/expenses', label: 'كشف المصروفات المنفرد', icon: FileSpreadsheet },
  { to: '/employees', label: 'الموظفون', icon: Users },
  { to: '/attendance', label: 'سجل الحضور الشامل', icon: Grid3x3 },
  { to: '/payroll', label: 'كشف الرواتب', icon: CreditCard },
  { to: '/payroll-history', label: 'سجل الرواتب الشهري', icon: History },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
  { to: '/developer', label: 'عن المطور', icon: Code },
]

const Sidebar: React.FC = () => {
  const { settings } = useSettingsStore()
  const { silkscreenOrders, dtfOrders, clothingOrders } = useOrdersStore()
  const { employees } = useEmployeesStore()

  const totalOrders = silkscreenOrders.length + dtfOrders.length + clothingOrders.length

  return (
    <aside className="sidebar hidden md:flex flex-col w-[220px] min-h-screen fixed top-0 right-0 z-40 py-6 px-3">
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
            <img src={settings.companyLogo || "/logo.png"} alt="ProTex ERP Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="font-bold text-white text-[15px] leading-tight tracking-wide">{settings.companyName || 'ProTex ERP'}</p>
            <p className="text-[10px] text-white/40">إدارة الإنتاج والطباعة</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 text-sm">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="w-1.5 h-1.5 rounded-full bg-gold"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Stats Row */}
      <div className="mt-6 px-2 pt-4 border-t border-white/5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/4 rounded-xl p-3 text-center">
            <p className="num text-lg font-bold text-gold">{totalOrders}</p>
            <p className="text-[10px] text-white/30 mt-0.5">أوردر</p>
          </div>
          <div className="bg-white/4 rounded-xl p-3 text-center">
            <p className="num text-lg font-bold text-blue-400">{employees.length}</p>
            <p className="text-[10px] text-white/30 mt-0.5">موظف</p>
          </div>
        </div>

        {/* Company name */}
        <div className="bg-white/4 rounded-xl p-3">
          <p className="text-[10px] text-white/25 mb-0.5">الشركة</p>
          <p className="text-xs text-white/60 font-semibold truncate">
            {settings.companyName || 'غير محدد'}
          </p>
        </div>
      </div>

      {/* Version */}
      <p className="text-center text-[10px] text-white/20 mt-4 font-bold tracking-wider">ProTex ERP v2.0</p>
    </aside>
  )
}

export default Sidebar
