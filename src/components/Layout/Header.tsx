import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Printer, Zap, Shirt, Users, CreditCard,
  BarChart3, Settings, Menu, X, Package, Wallet, KanbanSquare, Bell, AlertTriangle, FileSpreadsheet
} from 'lucide-react'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useSettingsStore } from '../../store/useSettingsStore'

const navItems = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
  { to: '/silkscreen', label: 'سيلك سكرين', icon: Printer },
  { to: '/dtf', label: 'طباعة DTF', icon: Zap },
  { to: '/clothing', label: 'ورش الملابس', icon: Shirt },
  { to: '/production', label: 'لوحة الإنتاج', icon: KanbanSquare },
  { to: '/inventory', label: 'مخازن الخامات', icon: Package },
  { to: '/clients', label: 'العملاء والديون', icon: Users },
  { to: '/suppliers', label: 'الموردين والمشتريات', icon: Users },
  { to: '/treasury', label: 'الخزينة والماليات', icon: Wallet },
  { to: '/expenses', label: 'كشف المصروفات', icon: FileSpreadsheet },
  { to: '/employees', label: 'الموظفون', icon: Users },
  { to: '/payroll', label: 'الرواتب', icon: CreditCard },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

const pageTitles: Record<string, string> = {
  '/': 'لوحة التحكم',
  '/silkscreen': 'سيلك سكرين',
  '/dtf': 'طباعة DTF',
  '/clothing': 'ورش الملابس',
  '/production': 'لوحة التشغيل والإنتاج',
  '/inventory': 'المخازن',
  '/clients': 'العملاء والديون',
  '/suppliers': 'الموردين والمشتريات',
  '/treasury': 'الخزينة والماليات',
  '/expenses': 'حاسبة المصروفات الحرة',
  '/employees': 'الموظفون',
  '/payroll': 'الرواتب',
  '/reports': 'التقارير',
  '/settings': 'الإعدادات',
}

const Header: React.FC = () => {
  const location = useLocation()
  const { settings } = useSettingsStore()
  const { items } = useInventoryStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const title = pageTitles[location.pathname] || 'ProTex ERP'
  const lowStockItems = items.filter(i => i.quantity <= i.minimumStock)

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4">
        <button
          className="btn-icon-ghost"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={18} />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center">
            <Printer size={14} className="text-gold" />
          </div>
          <span className="font-bold text-white text-sm">{title}</span>
        </div>

        <div className="flex gap-2">
          <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={16} className="text-white" />
            {lowStockItems.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full animate-pulse" />
            )}
          </button>
          
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <span className="text-xs font-bold text-gold">
              {(settings.companyName || 'P').charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Notifications Dropdown (Mobile Overlap) */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-16 right-4 left-4 z-50 bg-[#1a2540] border border-white/10 rounded-2xl shadow-xl p-4 md:w-80 md:left-auto md:right-8"
          >
            <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
              <Bell size={14} className="text-gold" /> الإشعارات والتنبيهات
            </h4>
            
            {lowStockItems.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {lowStockItems.map(item => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 flex gap-3 items-center">
                    <AlertTriangle size={16} className="text-danger flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/90 font-bold leading-tight mb-0.5">{item.name}</p>
                      <p className="text-[10px] text-danger">وصل للحد الأدنى ({item.quantity} متاح)</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50 text-center py-4">الوضع آمن، لا توجد تنبيهات حالياً.</p>
            )}
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-70 w-72 sidebar flex flex-col py-6 px-3 md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                    <img src={settings.companyLogo || "/logo.png"} alt="ProTex ERP Logo" className="w-full h-full object-contain p-1" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{settings.companyName || 'ProTex ERP'}</p>
                    <p className="text-[10px] text-white/30">إدارة الإنتاج والطباعة</p>
                  </div>
                </div>
                <button className="btn-icon-ghost" onClick={() => setMenuOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
