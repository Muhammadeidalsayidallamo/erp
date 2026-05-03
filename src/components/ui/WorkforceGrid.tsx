import React, { memo, useCallback } from 'react'
import { useWorkforceStore, type CycleDay, type GridDayRecord, type AttendanceStatus, type WorkerCalcResult } from '../../store/useWorkforceStore'
import { fmt } from '../../utils/calculations'
import type { Employee } from '../../store/useEmployeesStore'
import { FileText, DollarSign, Clock, TrendingUp } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
//  STATUS BUTTON GROUP — 4 visible buttons: — / حضر / غائب / إذن
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTS: { value: AttendanceStatus; label: string; active: string; inactive: string }[] = [
  { value: '', label: '—', active: 'bg-white/10 border-white/30 text-white/70', inactive: 'border-white/8 text-white/20 hover:border-white/20 hover:text-white/40' },
  { value: 'present', label: 'حضر', active: 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]', inactive: 'border-white/8 text-white/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400' },
  { value: 'absent', label: 'غائب', active: 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.3)]', inactive: 'border-white/8 text-white/20 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-400' },
  { value: 'excused', label: 'إذن', active: 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]', inactive: 'border-white/8 text-white/20 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-400' },
]

interface StatusGroupProps { status: AttendanceStatus; onChange: (s: AttendanceStatus) => void }
const StatusGroup = memo(({ status, onChange }: StatusGroupProps) => (
  <div className="flex gap-0.5 w-full">
    {STATUS_OPTS.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        title={o.value === '' ? 'بدون تحديد' : o.value === 'present' ? 'حاضر' : o.value === 'absent' ? 'غائب' : 'إذن رسمي'}
        className={`flex-1 text-center text-[10px] font-black py-1 rounded border transition-all leading-tight
          ${status === o.value ? o.active : o.inactive}`}>
        {o.label}
      </button>
    ))}
  </div>
))
StatusGroup.displayName = 'StatusGroup'

// ─────────────────────────────────────────────────────────────────────────────
//  VALUE + UNIT INPUT ROW
// ─────────────────────────────────────────────────────────────────────────────
interface ValueUnitProps {
  value: number; unit: 'min' | 'hr'; placeholder: string; color: string; icon: React.ReactNode;
  onChange: (v: number) => void; onToggleUnit: () => void
}
const ValueUnit = memo(({ value, unit, placeholder, color, icon, onChange, onToggleUnit }: ValueUnitProps) => (
  <div className="flex items-center gap-0.5 flex-1 relative group">
    <div className={`absolute right-1 text-current opacity-30 pointer-events-none ${color}`}>{icon}</div>
    <input
      type="number" min="0" max="999" step={unit === 'hr' ? 0.5 : 1}
      placeholder={placeholder}
      value={value || ''}
      onChange={e => onChange(e.target.value ? +e.target.value : 0)}
      className={`w-full min-w-0 text-center text-[10px] font-bold outline-none py-1 pr-4 pl-1 rounded-r
        bg-[#00000020] border border-l-0 ${color} placeholder-current/20 focus:bg-[#00000040] transition-colors`}
    />
    <button onClick={onToggleUnit}
      className={`text-[8px] font-black px-1.5 py-1 rounded-l border border-r-0 transition-all leading-none
        ${unit === 'hr' ? `${color} opacity-100 bg-[#00000040]` : 'border-white/15 text-white/30 bg-[#00000020] hover:bg-[#00000040]'}`}>
      {unit === 'hr' ? 'س' : 'دق'}
    </button>
  </div>
))
ValueUnit.displayName = 'ValueUnit'

// ─────────────────────────────────────────────────────────────────────────────
//  ADVANCE & NOTES INPUT ROW
// ─────────────────────────────────────────────────────────────────────────────
interface SimpleInputProps {
  value: string | number; placeholder: string; color: string; icon: React.ReactNode; type?: 'text' | 'number';
  onChange: (v: any) => void
}
const SimpleInput = memo(({ value, placeholder, color, icon, type = 'text', onChange }: SimpleInputProps) => (
  <div className="flex items-center flex-1 relative group">
    <div className={`absolute right-1.5 text-current opacity-30 pointer-events-none ${color}`}>{icon}</div>
    <input
      type={type} min={type === 'number' ? '0' : undefined}
      placeholder={placeholder}
      value={value || ''}
      onChange={e => onChange(type === 'number' ? (e.target.value ? +e.target.value : 0) : e.target.value)}
      className={`w-full min-w-0 text-center text-[10px] font-bold outline-none py-1 pr-5 pl-1 rounded
        bg-[#00000020] border ${color} placeholder-current/20 focus:bg-[#00000040] transition-colors`}
    />
  </div>
))
SimpleInput.displayName = 'SimpleInput'


// ─────────────────────────────────────────────────────────────────────────────
//  REGULAR DAY CELL GROUP (colSpan=1)
// ─────────────────────────────────────────────────────────────────────────────
interface RegCellsProps { ym: string; empId: string; dateStr: string; rec: Partial<GridDayRecord> }

const RegCells = memo(({ ym, empId, dateStr, rec }: RegCellsProps) => {
  const set = useWorkforceStore(s => s.setDayRecord)
  const status = (rec?.status ?? '') as AttendanceStatus

  const setStatus   = useCallback((s: AttendanceStatus) => set(ym, empId, dateStr, { status: s }), [ym, empId, dateStr, set])
  const setLateVal  = useCallback((v: number) => set(ym, empId, dateStr, { lateValue: v }), [ym, empId, dateStr, set])
  const toggleLateU = useCallback(() => set(ym, empId, dateStr, { lateUnit: rec?.lateUnit === 'hr' ? 'min' : 'hr' }), [ym, empId, dateStr, rec?.lateUnit, set])
  const setOTVal    = useCallback((v: number) => set(ym, empId, dateStr, { overtimeValue: v }), [ym, empId, dateStr, set])
  const toggleOTU   = useCallback(() => set(ym, empId, dateStr, { overtimeUnit: rec?.overtimeUnit === 'hr' ? 'min' : 'hr' }), [ym, empId, dateStr, rec?.overtimeUnit, set])
  const setAdvance  = useCallback((v: number) => set(ym, empId, dateStr, { advanceValue: v }), [ym, empId, dateStr, set])
  const setNotes    = useCallback((v: string) => set(ym, empId, dateStr, { notes: v }), [ym, empId, dateStr, set])

  return (
    <td className={`border-l border-white/[0.06] p-1.5 align-top transition-colors
      ${status === 'present' ? 'bg-emerald-950/10' : status === 'absent' ? 'bg-rose-950/8' : status === 'excused' ? 'bg-blue-950/8' : ''}`}>
      <div className="flex flex-col gap-1.5">
        <StatusGroup status={status} onChange={setStatus} />
        <div className="flex gap-1 w-full">
          <ValueUnit value={rec?.lateValue ?? 0} unit={rec?.lateUnit ?? 'min'} placeholder="تأخير" color="border-amber-500/30 text-amber-400 focus:border-amber-400/60" icon={<Clock size={10}/>} onChange={setLateVal} onToggleUnit={toggleLateU} />
          <ValueUnit value={rec?.overtimeValue ?? 0} unit={rec?.overtimeUnit ?? 'min'} placeholder="إضافي" color="border-violet-500/30 text-violet-400 focus:border-violet-400/60" icon={<TrendingUp size={10}/>} onChange={setOTVal} onToggleUnit={toggleOTU} />
        </div>
        <div className="flex gap-1 w-full">
          <SimpleInput value={rec?.advanceValue ?? 0} placeholder="سلفة" type="number" color="border-rose-500/30 text-rose-400 focus:border-rose-400/60" icon={<DollarSign size={10}/>} onChange={setAdvance} />
          <SimpleInput value={rec?.notes ?? ''} placeholder="ملاحظات..." type="text" color="border-white/10 text-white/70 focus:border-white/30" icon={<FileText size={10}/>} onChange={setNotes} />
        </div>
      </div>
    </td>
  )
})
RegCells.displayName = 'RegCells'

// ─────────────────────────────────────────────────────────────────────────────
//  FRIDAY CELL (colSpan=1)
// ─────────────────────────────────────────────────────────────────────────────
interface FriCellProps { ym: string; empId: string; dateStr: string; rec: Partial<GridDayRecord> }

const FriCell = memo(({ ym, empId, dateStr, rec }: FriCellProps) => {
  const set = useWorkforceStore(s => s.setDayRecord)
  const working = rec?.fridayWork ?? false

  const toggle    = useCallback(() => set(ym, empId, dateStr, { fridayWork: !working }), [ym, empId, dateStr, working, set])
  const setLateV  = useCallback((v: number) => set(ym, empId, dateStr, { lateValue: v }), [ym, empId, dateStr, set])
  const toggleLU  = useCallback(() => set(ym, empId, dateStr, { lateUnit: rec?.lateUnit === 'hr' ? 'min' : 'hr' }), [ym, empId, dateStr, rec?.lateUnit, set])
  const setOTV    = useCallback((v: number) => set(ym, empId, dateStr, { overtimeValue: v }), [ym, empId, dateStr, set])
  const toggleOTU = useCallback(() => set(ym, empId, dateStr, { overtimeUnit: rec?.overtimeUnit === 'hr' ? 'min' : 'hr' }), [ym, empId, dateStr, rec?.overtimeUnit, set])
  const setAdvance  = useCallback((v: number) => set(ym, empId, dateStr, { advanceValue: v }), [ym, empId, dateStr, set])
  const setNotes    = useCallback((v: string) => set(ym, empId, dateStr, { notes: v }), [ym, empId, dateStr, set])

  return (
    <td className={`border-l border-white/[0.06] p-1.5 align-top transition-colors ${working ? 'bg-amber-950/25' : 'bg-rose-950/15'}`}>
      <div className="flex flex-col gap-1.5">
        <button onClick={toggle}
          className={`w-full text-[10px] font-black py-1 rounded border transition-all
            ${working
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
              : 'border-dashed border-rose-500/25 text-rose-400/50 hover:bg-amber-500/10 hover:border-amber-400/40 hover:text-amber-400'}`}>
          {working ? '⚡ عمل جمعة (يُحسب بيومين)' : '+ عمل في الجمعة'}
        </button>
        {working && (
          <div className="flex gap-1 w-full">
            <ValueUnit value={rec?.lateValue ?? 0} unit={rec?.lateUnit ?? 'min'} placeholder="تأخير" color="border-amber-500/30 text-amber-400 focus:border-amber-400/60" icon={<Clock size={10}/>} onChange={setLateV} onToggleUnit={toggleLU} />
            <ValueUnit value={rec?.overtimeValue ?? 0} unit={rec?.overtimeUnit ?? 'min'} placeholder="إضافي" color="border-violet-500/30 text-violet-400 focus:border-violet-400/60" icon={<TrendingUp size={10}/>} onChange={setOTV} onToggleUnit={toggleOTU} />
          </div>
        )}
        <div className="flex gap-1 w-full">
          <SimpleInput value={rec?.advanceValue ?? 0} placeholder="سلفة" type="number" color="border-rose-500/30 text-rose-400 focus:border-rose-400/60" icon={<DollarSign size={10}/>} onChange={setAdvance} />
          <SimpleInput value={rec?.notes ?? ''} placeholder="ملاحظات..." type="text" color="border-white/10 text-white/70 focus:border-white/30" icon={<FileText size={10}/>} onChange={setNotes} />
        </div>
      </div>
    </td>
  )
})
FriCell.displayName = 'FriCell'

// ─────────────────────────────────────────────────────────────────────────────
//  DAY ROW
// ─────────────────────────────────────────────────────────────────────────────
type EmpSheet = Record<string, Partial<GridDayRecord>>
interface DayRowProps {
  day: CycleDay; employees: Employee[]; ym: string
  currentSheet: any
  rowIndex: number
}

const DayRow = memo(({ day, employees, ym, currentSheet, rowIndex }: DayRowProps) => {
  const isFri = day.isFri
  return (
    <tr className={`border-b border-white/[0.05] group transition-colors
      ${isFri ? 'bg-rose-950/20' : rowIndex % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>

      {/* Day # */}
      <td className={`sticky right-0 z-10 border-l border-white/10 text-center font-black text-sm w-9 min-w-[36px]
        ${isFri ? 'bg-rose-950/40 text-rose-400' : 'bg-[#090f1e] group-hover:bg-[#0c1525] text-white/70'}`}>
        {day.dayNum}
      </td>
      {/* Day name */}
      <td className={`sticky z-10 border-l border-white/10 px-2 text-xs font-bold w-[76px] min-w-[76px] align-middle
        ${isFri ? 'bg-rose-950/40 text-rose-400' : 'bg-[#090f1e] group-hover:bg-[#0c1525] text-white/50'}`}
        style={{ right: '36px' }}>
        <span>{day.dayName}</span>
        {isFri && <span className="text-[7px] opacity-50 block">جمعة</span>}
      </td>

      {/* Employee cells */}
      {employees.map(emp => {
        const rec = currentSheet?.employeeSheets?.[emp.id]?.[day.dateStr] ?? {}
        return isFri
          ? <FriCell key={emp.id} ym={ym} empId={emp.id} dateStr={day.dateStr} rec={rec} />
          : <RegCells key={emp.id} ym={ym} empId={emp.id} dateStr={day.dateStr} rec={rec} />
      })}
    </tr>
  )
})
DayRow.displayName = 'DayRow'

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN GRID
// ─────────────────────────────────────────────────────────────────────────────
interface WorkforceGridProps {
  yearMonth: string; employees: Employee[]; days: CycleDay[]
  calcResults: WorkerCalcResult[]; fridayIsPaid: boolean
  currencySymbol: string; showSalary?: boolean
}

// 220px to comfortably fit 2 inputs side by side + full width status buttons
const EMP_COL_W = 210

export const WorkforceGrid: React.FC<WorkforceGridProps> = ({
  yearMonth, employees, days, calcResults, fridayIsPaid, currencySymbol, showSalary = true,
}) => {
  const currentSheet = useWorkforceStore(s => s.sheets[yearMonth])
  const calcMap: Record<string, WorkerCalcResult> = {}
  calcResults.forEach(r => { calcMap[r.employeeId] = r })

  if (!employees.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-3">👷</div>
      <p className="text-white/40 font-semibold">لا يوجد موظفون</p>
      <p className="text-white/20 text-xs mt-1">أضف موظفين من شاشة شؤون الموظفين</p>
    </div>
  )

  return (
    <div className="overflow-auto rounded-xl border border-white/8 bg-[#080f1d]" style={{ maxHeight: '76vh' }}>
      <table className="border-collapse text-right" style={{ minWidth: `${36 + 76 + employees.length * EMP_COL_W + 1}px` }}>

        {/* ── THEAD ── */}
        <thead className="sticky top-0 z-30 shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
          {/* Employee name row */}
          <tr className="bg-[#060c1a] border-b border-white/10">
            <th className="sticky right-0 z-40 bg-[#060c1a] border-l border-white/10 w-9 min-w-[36px]" />
            <th className="sticky z-40 bg-[#060c1a] border-l border-white/10 w-[76px] min-w-[76px] px-2 py-2 text-right text-[9px] text-white/30 font-bold" style={{ right: '36px' }}>
              اليوم
            </th>
            {employees.map((emp, i) => (
              <th key={emp.id}
                className={`border-l border-white/10 px-2 py-2.5 text-center ${i % 2 === 0 ? 'bg-[#0a1628]' : 'bg-[#071020]'}`}
                style={{ width: `${EMP_COL_W}px`, minWidth: `${EMP_COL_W}px` }}>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/20 flex items-center justify-center font-black text-gold text-[15px] mb-0.5">
                    {emp.fullName.charAt(0)}
                  </div>
                  <p className="text-white text-xs font-bold">{emp.fullName}</p>
                  {showSalary && <p className="text-gold/60 text-[9px] font-semibold">{fmt(emp.baseSalary, 0)} {currencySymbol}/يوم</p>}
                  {!showSalary && <p className="text-white/20 text-[8px]">{emp.position || 'موظف'}</p>}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── TBODY ── */}
        <tbody>
          {days.map((day, idx) => (
            <DayRow key={day.dateStr} day={day} employees={employees} ym={yearMonth}
              currentSheet={currentSheet} rowIndex={idx} />
          ))}
        </tbody>

        {/* ── TFOOT ── */}
        <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
          {/* Attendance totals */}
          <tr className="bg-[#060c1a] border-t border-gold/20">
            <td colSpan={2} className="sticky right-0 z-30 bg-[#060c1a] border-l border-white/10 px-2 py-2">
              <span className="text-gold font-black text-[10px]">الإجمالي</span>
            </td>
            {employees.map((emp, i) => {
              const c = calcMap[emp.id]
              return (
                <td key={emp.id}
                  className={`border-l border-white/[0.05] px-2 py-1.5 align-top ${i % 2 === 0 ? 'bg-[#0a1628]' : 'bg-[#071020]'}`}>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] mb-1.5 pb-1.5 border-b border-white/5">
                    <div className="flex justify-between"><span className="text-white/30">حضور:</span><span className="text-emerald-400 font-black">{c?.presentDays ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-white/30">تأخير:</span><span className="text-amber-400 font-bold">{c?.totalLateMinutes ?? 0}د</span></div>
                    <div className="flex justify-between"><span className="text-white/30">غياب:</span><span className="text-rose-400 font-bold">{c?.absentDays ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-white/30">إضافي:</span><span className="text-violet-400 font-bold">{fmt(c?.totalOvertimeHours ?? 0, 1)}س</span></div>
                    <div className="flex justify-between"><span className="text-white/30">إذن:</span><span className="text-blue-400 font-bold">{c?.excusedDays ?? 0}</span></div>
                    {(c?.fridayWorkedDays ?? 0) > 0 && (
                      <div className="flex justify-between"><span className="text-white/30">جمعة×2:</span><span className="text-amber-400 font-bold">{c!.fridayWorkedDays}</span></div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-white/40">إجمالي السلف:</span>
                    <span className="text-rose-400">{fmt(c?.totalAdvances ?? 0, 0)} {currencySymbol}</span>
                  </div>
                </td>
              )
            })}
          </tr>
          {/* Net salary */}
          {showSalary && (
            <tr className="bg-[#050a15] border-t border-white/[0.06]">
              <td colSpan={2} className="sticky right-0 z-30 bg-[#050a15] border-l border-white/10 px-2 py-2">
                <span className="text-white/40 font-bold text-[9px]">الصافي المستحق</span>
              </td>
              {employees.map((emp, i) => {
                const c = calcMap[emp.id]
                return (
                  <td key={emp.id}
                    className={`border-l border-white/[0.05] text-center py-2 ${i % 2 === 0 ? 'bg-[#0a1628]' : 'bg-[#071020]'}`}>
                    <span className="text-gold font-black text-sm">{fmt(c?.netSalary ?? 0, 0)}</span>
                    <span className="text-white/20 text-[9px] mr-1">{currencySymbol}</span>
                  </td>
                )
              })}
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}

export default WorkforceGrid
