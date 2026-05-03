import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Printer,
  Zap,
  Shirt,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'

const navItems = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/silkscreen', label: 'سيلك سكرين', icon: Printer },
  { to: '/dtf', label: 'طباعة DTF', icon: Zap },
  { to: '/clothing', label: 'ورش الملابس', icon: Shirt },
  { to: '/employees', label: 'الموظفون', icon: Users },
  { to: '/payroll', label: 'الرواتب', icon: CreditCard },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { settings } = useSettingsStore()
  const location = useLocation()

  const currentPage = navItems.find(i =>
    i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)
  )

  return (
    <div className="min-h-screen bg-dark flex" dir="rtl">
      {/* ── Desktop Sidebar ── */}
      <aside className={clsx(
        'hidden md:flex flex-col w-64 fixed top-0 right-0 bottom-0 z-40 sidebar transition-all duration-300',
        'border-l border-white/5'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <span className="text-gold font-bold text-lg">P</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {settings.companyName || 'PRO PRINT'}
              </p>
              <p className="text-xs text-muted">Finance System</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-muted text-center">PRO PRINT Finance v1.0</p>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 ios-header px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 rounded-xl bg-dark-300 flex items-center justify-center text-white"
        >
          <Menu size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-white">{currentPage?.label || 'الرئيسية'}</p>
          {settings.companyName && (
            <p className="text-xs text-gold">{settings.companyName}</p>
          )}
        </div>
        <div className="w-9" />
      </header>

      {/* ── Mobile Drawer ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute top-0 right-0 bottom-0 w-72 sidebar flex flex-col animate-slide-up">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <span className="text-gold font-bold">P</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{settings.companyName || 'PRO PRINT'}</p>
                  <p className="text-xs text-muted">Finance System</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-xl bg-dark-400 flex items-center justify-center text-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    clsx('nav-item', isActive && 'active')
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 md:mr-64 min-h-screen">
        <div className="pt-16 md:pt-0 pb-24 md:pb-0 px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* ── Bottom Navigation (Mobile) ── */}
      <nav className="bottom-nav no-print">
        {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx('bottom-nav-item', isActive && 'active')
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout
