import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, XCircle, ChevronRight } from 'lucide-react'

// ═══════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: string | React.ReactNode
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, prefix, suffix, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="label">{label}</label>}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          className={`input w-full ${prefix ? 'pr-9' : ''} ${suffix ? 'pl-16' : ''} ${error ? 'border-danger/50 bg-danger/5' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none text-xs font-medium whitespace-nowrap">
            {typeof suffix === 'string' ? suffix : suffix}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-[11px] text-white/30 leading-tight">{hint}</p>}
      {error && <p className="text-[11px] text-danger leading-tight">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ═══════════════════════════════════════
//  SELECT
// ═══════════════════════════════════════
interface SelectOption { value: string; label: string }
interface SelectProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  options: SelectOption[]
  hint?: string
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
  ({ label, options, hint, ...props }, ref) => {
    // Generate a unique ID for the datalist based on the label or a random string
    const listId = `dl-${label?.replace(/\s+/g, '') || Math.random().toString(36).substring(7)}`
    
    return (
      <div className="flex flex-col gap-1.5">
        <Input 
          ref={ref}
          label={label}
          hint={hint}
          list={listId}
          {...props}
        />
        <datalist id={listId}>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </datalist>
      </div>
    )
  }
)
Select.displayName = 'Select'

// ═══════════════════════════════════════
//  CARD
// ═══════════════════════════════════════
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'navy' | 'success'
  padding?: boolean
}
export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', padding = true }) => {
  const cls = variant === 'gold' ? 'card-gold' : variant === 'navy' ? 'card-navy' : variant === 'success' ? 'card-success' : 'card'
  return (
    <div className={`${cls} ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════
//  METRIC CARD (KPI)
// ═══════════════════════════════════════
interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  icon?: React.ReactNode
  iconBg?: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'gold' | 'navy' | 'success' | 'danger'
  large?: boolean
  onClick?: () => void
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, subValue, icon, iconBg, trend, variant = 'default', large, onClick
}) => {
  const variants = {
    default: 'card',
    gold: 'card-gold',
    navy: 'card-navy',
    success: 'card-success',
    danger: 'card',
  }
  const textColors = {
    default: 'text-white',
    gold: 'gradient-gold',
    navy: 'gradient-blue',
    success: 'gradient-success',
    danger: 'text-danger',
  }
  const defaultIcons = {
    default: 'bg-white/5',
    gold: 'bg-gold/10',
    navy: 'bg-blue-500/10',
    success: 'bg-success/10',
    danger: 'bg-danger/10',
  }

  return (
    <motion.div
      whileHover={onClick ? { y: -3, scale: 1.01 } : { y: -1 }}
      className={`metric-card ${variants[variant]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg || defaultIcons[variant]}`}>
            {icon}
          </div>
        )}
        {trend && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            trend === 'up' ? 'bg-success/10 text-success' :
            trend === 'down' ? 'bg-danger/10 text-danger' :
            'bg-white/5 text-white/40'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
          </div>
        )}
      </div>
      <p className={`num font-bold mb-1 ${large ? 'text-2xl' : 'text-xl'} ${textColors[variant]}`}>{value}</p>
      <p className="text-xs text-white/40 font-medium">{label}</p>
      {subValue && <p className="text-[11px] text-white/25 mt-1">{subValue}</p>}
    </motion.div>
  )
}
export const StatCard = MetricCard

// ═══════════════════════════════════════
//  SECTION HEADER
// ═══════════════════════════════════════
interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  onToggle?: (open: boolean) => void
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title, subtitle, icon, action, collapsible, defaultOpen = true, onToggle
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const toggle = () => {
    setOpen(p => {
      onToggle?.(!p)
      return !p
    })
  }
  return (
    <div
      className={`section-header ${collapsible ? 'cursor-pointer select-none' : ''}`}
      onClick={collapsible ? toggle : undefined}
    >
      <div className="flex items-center gap-3 flex-1">
        {icon && <div className="section-header-icon">{icon}</div>}
        <div>
          <p className="section-title">{title}</p>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      {collapsible && (
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/30"
        >
          <ChevronRight size={16} />
        </motion.div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
//  FORM SECTION
// ═══════════════════════════════════════
interface FormSectionProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

export const FormSection: React.FC<FormSectionProps> = ({
  title, subtitle, icon, children, collapsible = true, defaultOpen = true
}) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card padding={false} className="overflow-hidden">
      <div className="p-5 pb-0">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          collapsible={collapsible}
          defaultOpen={defaultOpen}
          onToggle={setOpen}
        />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-5 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ═══════════════════════════════════════
//  RESULT ROW
// ═══════════════════════════════════════
interface ResultRowProps {
  label: string
  value: string
  highlight?: 'gold' | 'navy' | 'success' | 'danger' | boolean
  bold?: boolean
  variant?: 'default' | 'gold' | 'navy' | 'success' | 'danger'
}

export const ResultRow: React.FC<ResultRowProps> = ({ label, value, highlight, bold, variant = 'default' }) => {
  const color = typeof highlight === 'string' ? highlight : (highlight === true ? variant : null)
  const hlClass = color === 'gold' ? 'highlight' : color === 'navy' ? 'highlight-navy' : color === 'success' ? 'highlight-success' : color === 'danger' ? 'highlight-danger' : ''
  const valColor = variant === 'gold' ? 'text-gold' : variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : variant === 'navy' ? 'text-blue-400' : 'text-white/80'
  return (
    <div className={`result-row ${hlClass}`}>
      <span className="result-label">{label}</span>
      <span className={`result-value num ${valColor} ${bold || highlight ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════
//  PAGE HEADER
// ═══════════════════════════════════════
interface PageHeaderProps {
  title: string
  subtitle?: string | React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  back?: () => void
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions }) => (
  <motion.div
    className="page-header flex-wrap gap-4"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          typeof subtitle === 'string' 
            ? <p className="page-subtitle">{subtitle}</p>
            : <div className="page-subtitle">{subtitle}</div>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </motion.div>
)

// ═══════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════
interface EmptyStateProps {
  icon?: React.ReactNode | string
  title: string
  description?: string
  action?: React.ReactNode
}
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
    {icon && (
      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/8 flex items-center justify-center text-white/20">
    {typeof icon === 'string'
      ? <span className="text-3xl">{icon}</span>
      : React.cloneElement(icon as React.ReactElement, { size: 28 } as any)}
      </div>
    )}
    <div>
      <p className="text-white/60 font-semibold text-sm mb-1">{title}</p>
      {description && <p className="text-white/25 text-xs max-w-xs mx-auto">{description}</p>}
    </div>
    {action}
  </div>
)

// ═══════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
}
export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const icons = {
    success: <CheckCircle2 size={18} className="text-success flex-shrink-0" />,
    error: <XCircle size={18} className="text-danger flex-shrink-0" />,
    info: <Info size={18} className="text-blue-400 flex-shrink-0" />,
    warning: <AlertCircle size={18} className="text-warning flex-shrink-0" />,
  }

  return (
    <AnimatePresence>
      <motion.div
        className="toast"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
      >
        {icons[type]}
        <span className="text-white/80 text-sm flex-1">{message}</span>
        <button onClick={onClose} className="btn-icon-ghost w-7 h-7">
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className={`modal-box ${maxW} w-full`}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {title && (
              <div className="modal-header">
                <h3 className="font-bold text-white text-base">{title}</h3>
                <button onClick={onClose} className="btn-icon-ghost w-8 h-8">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════
//  BADGE
// ═══════════════════════════════════════
interface BadgeProps {
  children: React.ReactNode
  variant?: 'gold' | 'navy' | 'success' | 'danger' | 'muted'
  className?: string
}
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'muted', className = '' }) => (
  <span className={`badge-${variant} ${className}`}>{children}</span>
)

// ═══════════════════════════════════════
//  SPINNER
// ═══════════════════════════════════════
export const Spinner: React.FC = () => (
  <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-gold animate-spin" />
)

// ═══════════════════════════════════════
//  GRID
// ═══════════════════════════════════════
interface GridProps { cols?: 2 | 3; children: React.ReactNode; className?: string }
export const Grid: React.FC<GridProps> = ({ cols = 2, children, className = '' }) => (
  <div className={`form-grid-${cols} ${className}`}>{children}</div>
)

// ═══════════════════════════════════════
//  PROGRESS BAR
// ═══════════════════════════════════════
interface ProgressProps { value: number; max?: number; variant?: 'gold' | 'success'; label?: string }
export const Progress: React.FC<ProgressProps> = ({ value, max = 100, variant = 'gold', label }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      {label && <p className="text-[11px] text-white/35 mb-1">{label}</p>}
      <div className="progress-bar">
        <motion.div
          className={`progress-fill ${variant === 'success' ? 'progress-fill-success' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  DIVIDER
// ═══════════════════════════════════════
export const Divider: React.FC<{ gold?: boolean }> = ({ gold }) => (
  <div className={gold ? 'divider-gold' : 'divider'} />
)

// ═══════════════════════════════════════
//  RESULTS PANEL
// ═══════════════════════════════════════
interface ResultsPanelProps {
  title?: string
  children: React.ReactNode
  visible?: boolean
}
export const ResultsPanel: React.FC<ResultsPanelProps> = ({ title, children, visible = true }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="card-gold p-5 overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        {title && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <h3 className="font-bold text-gold text-sm">{title}</h3>
          </div>
        )}
        {children}
      </motion.div>
    )}
  </AnimatePresence>
)

export { InvoiceTemplate } from './InvoiceTemplate'
export { PayslipTemplate } from './PayslipTemplate'
export { ExpenseReportTemplate } from './ExpenseReportTemplate'
export { AttendanceReportTemplate } from './AttendanceReportTemplate'
export { InventoryReportTemplate } from './InventoryReportTemplate'
export { WorkforceGrid } from './WorkforceGrid'
export { WorkforceReportTemplate } from './WorkforceReportTemplate'
