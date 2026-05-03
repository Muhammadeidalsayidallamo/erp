import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import { Spinner } from './components/ui'

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const PrintSilkscreen = React.lazy(() => import('./pages/PrintSilkscreen'))
const PrintDTF = React.lazy(() => import('./pages/PrintDTF'))
const Clothing = React.lazy(() => import('./pages/Clothing'))
const Employees = React.lazy(() => import('./pages/Employees'))
const WorkforceAttendance = React.lazy(() => import('./pages/WorkforceAttendance'))
const Payroll = React.lazy(() => import('./pages/Payroll'))
const Reports = React.lazy(() => import('./pages/Reports'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Clients = React.lazy(() => import('./pages/Clients'))
const Suppliers = React.lazy(() => import('./pages/Suppliers'))
const Inventory = React.lazy(() => import('./pages/Inventory'))
const Treasury = React.lazy(() => import('./pages/Treasury'))
const ProductionBoard = React.lazy(() => import('./pages/ProductionBoard'))
const ExpensesSheet = React.lazy(() => import('./pages/ExpensesSheet'))
const PieceworkAccounting = React.lazy(() => import('./pages/PieceworkAccounting'))
const PieceworkersLedger = React.lazy(() => import('./pages/PieceworkersLedger'))
const OperationsBulletin = React.lazy(() => import('./pages/OperationsBulletin'))
const DailyExpenses = React.lazy(() => import('./pages/DailyExpenses'))
const PayrollHistory = React.lazy(() => import('./pages/PayrollHistory'))
const Developer = React.lazy(() => import('./pages/Developer'))
const NotFound = React.lazy(() => import('./pages/NotFound'))
import LockScreen from './components/auth/LockScreen'
import { useAuthStore } from './store/useAuthStore'

const LoadingFallback = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <Spinner />
  </div>
)

const GlobalShortcuts = () => {
  const navigate = useNavigate()
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return

      if (e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/'); break
          case '2': e.preventDefault(); navigate('/production'); break
          case '3': e.preventDefault(); navigate('/treasury'); break
          case '4': e.preventDefault(); navigate('/inventory'); break
          case '5': e.preventDefault(); navigate('/clients'); break
          case '6': e.preventDefault(); navigate('/reports'); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return null
}

const App: React.FC = () => {
  const { isLockEnabled, isUnlocked } = useAuthStore()

  if (isLockEnabled && !isUnlocked) {
    return <LockScreen />
  }

  return (
    <BrowserRouter>
      <GlobalShortcuts />
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/silkscreen" element={<PrintSilkscreen />} />
            <Route path="/dtf" element={<PrintDTF />} />
            <Route path="/clothing" element={<Clothing />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/treasury" element={<Treasury />} />
            <Route path="/production" element={<ProductionBoard />} />
            <Route path="/piecework" element={<PieceworkAccounting />} />
            <Route path="/pieceworkers-ledger" element={<PieceworkersLedger />} />
            <Route path="/operations-bulletin" element={<OperationsBulletin />} />
            <Route path="/daily-expenses" element={<DailyExpenses />} />
            <Route path="/expenses" element={<ExpensesSheet />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<WorkforceAttendance />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll-history" element={<PayrollHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
