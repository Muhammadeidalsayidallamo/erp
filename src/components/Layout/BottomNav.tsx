import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Printer, Shirt, Users, Wallet, Package } from 'lucide-react'

const items = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
  { to: '/silkscreen', label: 'سيلك', icon: Printer },
  { to: '/clothing', label: 'ملابس', icon: Shirt },
  { to: '/inventory', label: 'الخامات', icon: Package },
  { to: '/clients', label: 'الديون', icon: Users },
  { to: '/treasury', label: 'الخزينة', icon: Wallet },
]

const BottomNav: React.FC = () => (
  <nav className="bottom-nav no-print">
    {items.map(({ to, label, icon: Icon, exact }) => (
      <NavLink
        key={to}
        to={to}
        end={exact}
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
)

export default BottomNav
