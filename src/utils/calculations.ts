/** Safely convert any value to number */
export const n = (v: unknown): number => {
  const x = Number(v)
  return isNaN(x) || !isFinite(x) ? 0 : x
}

/** Format number with comma separators */
export const fmt = (v: number, d = 2): string => {
  if (!isFinite(v)) return '0.00'
  return v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Percentage */
export const pct = (val: number, total: number): number =>
  total > 0 ? (val / total) * 100 : 0

/** Generate unique ID */
export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
export const generateId = uid

/** Today as YYYY-MM-DD */
export const today = (): string => new Date().toISOString().split('T')[0]
export const todayISO = today

/** Format date in Arabic */
export const fmtDate = (d: string): string => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

export const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

// ── Silkscreen ──────────────────────────────────────────────────────────────
import type { SilkscreenOrder } from '../store/useOrdersStore'

export function calcSilkscreen(o: SilkscreenOrder): Partial<SilkscreenOrder> {
  // عدد أيام الأوردر (تستخدم كمعامل للضرب في التكاليف اليومية)
  const days = n(o.orderDays)
  // عدد القطع الكلي
  const pieces = n(o.totalPieces)

  // حساب تكلفة الشاشات الأساسية: (سعر الشاشة × عدد الألوان) ÷ العمر الافتراضي
  const screenBase = (n(o.screenPrice) * n(o.numColors)) / Math.max(n(o.screenLifeOrders), 1)
  // حساب تكلفة الكيماويات: (الإيمولجن × الألوان) + مزيل + تنر
  const screenChem = n(o.numColors) * n(o.emulsionCostPerScreen) + n(o.emulsionRemoverCost) + n(o.thinnerCost)
  // إجمالي تكلفة الشاشات
  const screenCost = screenBase + screenChem

  // حساب تكلفة الحبر: استهلاك الـ 100 قطعة للقطعة الواحدة بالكيلو جرام × سعر الكيلو
  const inkCost = (n(o.inkConsumptionPer100) * pieces / 100) / 1000 * n(o.inkPricePerKg)

  // حساب تكلفة الكهرباء: تعتمد على ساعات التشغيل × عدد الأيام
  const electricityCost = n(o.ovenKw) * n(o.operatingHours) * n(o.electricityPricePerKw) * days

  // حساب تكلفة الغاز أو الوقود: تكلفة يومية × عدد الأيام
  const gasCost = n(o.gasOrFuelCost) * days

  // حساب تكلفة العمالة (الطباعة، التحضير، التثبيت، الجودة، التغليف) × الأيام + الأوفر تايم
  const laborCost =
    (n(o.printWorkers) * n(o.printWorkerDaily) +
    n(o.screenPrepWorkers) * n(o.screenPrepDaily) +
    n(o.fixingWorkers) * n(o.fixingDaily) +
    n(o.qcWorkers) * n(o.qcDaily) +
    n(o.packagingWorkers) * n(o.packagingDaily)) * days +
    n(o.overtimeHours) * n(o.overtimeRate)

  // المصاريف الإضافية الثابتة للأوردر
  const otherCost = n(o.rent) + n(o.maintenance) + n(o.shipping) + n(o.packaging)

  // إعادة هيكلة المجموع الفرعي (subtotal) ليشمل تكلفة الغاز المفصولة
  const sub = screenCost + inkCost + electricityCost + gasCost + laborCost + otherCost
  
  // حساب مبلغ الضريبة بناءً على المجموع الفرعي
  const taxAmount = sub * n(o.taxRate) / 100
  // إجمالي التكلفة الكلية على المصنع
  const totalOrderCost = sub + taxAmount
  
  // تكلفة القطعة الواحدة على المصنع
  const printCostPerPiece = pieces > 0 ? totalOrderCost / pieces : 0
  
  // نسبة هامش الربح
  const margin = n(o.profitMargin) / 100
  // السعر المقترح للقطعة (يشمل التكلفة والربح)
  const suggestedPrice = printCostPerPiece * (1 + margin)
  // إجمالي السعر المطلوب من العميل للأوردر
  const suggestedTotalPrice = suggestedPrice * pieces
  
  // صافي الربح الفعلي للمصنع
  const netProfit = (suggestedPrice - printCostPerPiece) * pieces
  // نسبة الربح كنسبة مئوية من التكلفة الكلية
  const profitPercent = totalOrderCost > 0 ? (netProfit / totalOrderCost) * 100 : 0

  return { screenCost, inkCost, electricityCost, laborCost, otherCost, totalOrderCost, printCostPerPiece, suggestedPrice, suggestedTotalPrice, netProfit, profitPercent }
}

// ── DTF ────────────────────────────────────────────────────────────────────
import type { DTFOrder } from '../store/useOrdersStore'

export function calcDTF(o: DTFOrder): Partial<DTFOrder> {
  const pieces = n(o.totalPieces)
  const designsPerRoll = Math.max(n(o.designsPerRoll), 1)
  const filmCostPerPiece = n(o.filmRollPrice) / designsPerRoll

  const piecesPerA4 = Math.max(n(o.piecesPerA4Equivalent), 1)
  const cmykPerPiece = n(o.cmykMlPerA4) / piecesPerA4
  const whitePerPiece = n(o.whiteMlPerA4) / piecesPerA4
  const inkCostPerPiece = (cmykPerPiece / 100 * n(o.cmykInkPricePer100ml)) + (whitePerPiece / 100 * n(o.whiteInkPricePer100ml))
  const headWearPerPiece = n(o.printHeadPrice) / Math.max(n(o.printHeadLifeMl), 1) * (cmykPerPiece + whitePerPiece)
  const machineCostPerPiece = pieces > 0 ? (n(o.maintenanceCost) + n(o.wasteTankCost)) / pieces + headWearPerPiece : 0

  const powderCostPerPiece = n(o.powderGramsPer100) / 100 / 1000 * n(o.powderPricePerKg)

  const totalKw = n(o.printerKw) + n(o.ovenKw)
  const totalEnergyCost = totalKw * n(o.operatingHours) * n(o.electricityPricePerKw)
  const energyCostPerPiece = pieces > 0 ? totalEnergyCost / pieces : 0

  const totalMinutes = pieces * (n(o.printTimePerPieceMins) + n(o.pressingTimeMins))
  const workerHours = totalMinutes / 60
  const workerDays = Math.ceil(workerHours / Math.max(n(o.numWorkers), 1) / 8)
  const totalLaborCost = n(o.numWorkers) * n(o.workerDaily) * workerDays
  const laborCostPerPiece = pieces > 0 ? totalLaborCost / pieces : 0

  const otherPerPiece = pieces > 0 ? (n(o.shipping) + n(o.packaging)) / pieces : 0

  // حساب المجموع الفرعي لتكلفة القطعة (بدون ضريبة)
  const subtotalCostPerPiece = filmCostPerPiece + inkCostPerPiece + machineCostPerPiece + powderCostPerPiece + energyCostPerPiece + laborCostPerPiece + otherPerPiece
  const subtotalOrderCost = subtotalCostPerPiece * pieces

  // حساب الضريبة
  const taxRate = n(o.taxRate)
  const taxAmount = subtotalOrderCost * taxRate / 100

  // التكلفة الكلية (تشمل الضريبة)
  const totalOrderCost = subtotalOrderCost + taxAmount
  const totalCostPerPiece = pieces > 0 ? totalOrderCost / pieces : 0

  // حساب هوامش الربح والأسعار
  const marginMul = 1 + n(o.profitMargin) / 100
  const priceWithoutTax = subtotalCostPerPiece * marginMul
  const priceWithTax = totalCostPerPiece * marginMul
  
  // السعر المقترح النهائي هو السعر شامل الضريبة
  const suggestedPricePerPiece = priceWithTax
  const suggestedTotalPrice = suggestedPricePerPiece * pieces

  // صافي الربح
  const netProfit = (suggestedPricePerPiece - totalCostPerPiece) * pieces
  const profitPercent = totalOrderCost > 0 ? (netProfit / totalOrderCost) * 100 : 0

  return { 
    filmCostPerPiece, inkCostPerPiece, powderCostPerPiece, energyCostPerPiece, laborCostPerPiece, 
    machineCostPerPiece, totalCostPerPiece, totalOrderCost, suggestedPricePerPiece, suggestedTotalPrice, 
    netProfit, profitPercent,
    taxAmount, taxRate, priceWithTax, priceWithoutTax
  }
}

// ── Clothing ───────────────────────────────────────────────────────────────
import type { ClothingOrder } from '../store/useOrdersStore'

export function calcClothing(o: ClothingOrder): Partial<ClothingOrder> {
  const pieces = n(o.totalPieces)
  const days = n(o.orderDays)
  const wasteMul = 1 + n(o.wastePercent) / 100

  const fabricCostPerPiece = n(o.fabricPerPieceMeters) * wasteMul * n(o.fabricPricePerMeter)
  const accessoriesCostPerPiece = n(o.threadPricePerBobbin) * n(o.threadConsumptionPerPiece) + n(o.buttonZipperCost) + n(o.liningCost)

  const totalLabor = (
    n(o.cutters) * n(o.cutterDaily) + n(o.sewers) * n(o.sewerDaily) +
    n(o.finishers) * n(o.finisherDaily) + n(o.qcWorkers) * n(o.qcWorkerDaily) +
    n(o.packagingWorkers) * n(o.packagingWorkerDaily) + n(o.admins) * n(o.adminDaily)
  ) * days
  const laborCostPerPiece = pieces > 0 ? totalLabor / pieces : 0

  const machineCost = n(o.numSewingMachines) * n(o.machineRatePerDay) * days
  const machineCostPerPiece = pieces > 0 ? machineCost / pieces : 0

  const energyCost = n(o.totalWorkshopKw) * n(o.operatingHours) * n(o.electricityPricePerKw) * days + n(o.waterCost)
  const energyCostPerPiece = pieces > 0 ? energyCost / pieces : 0

  // Pro-rate monthly fixed costs by actual order days (avoids over-charging short orders)
  const daysRatio = days > 0 ? Math.min(1, days / 30) : 0
  const fixedMonth = (n(o.monthlyRent) + n(o.monthlyMaintenance)) * daysRatio
  const fixedCostPerPiece = pieces > 0 ? fixedMonth / pieces : 0

  const miscPerPiece = pieces > 0 ? (n(o.cardboardPackaging) + n(o.shippingCost)) / pieces : 0

  const totalCostPerPiece = fabricCostPerPiece + accessoriesCostPerPiece + laborCostPerPiece + machineCostPerPiece + energyCostPerPiece + fixedCostPerPiece + miscPerPiece
  const totalOrderCost = totalCostPerPiece * pieces
  
  // Get margins from settings. Since calcClothing is pure, 
  // we will fetch it directly from the store if it's imported.
  let retailMargin = 35;
  let wholesaleMargin = 0;
  try {
    const { useSettingsStore } = require('../store/useSettingsStore');
    const settings = useSettingsStore.getState().settings;
    retailMargin = settings.retailMargin ?? 35;
    wholesaleMargin = settings.wholesaleMargin ?? 0;
  } catch (e) {
    // Fallback if imported outside React/browser context
  }

  // Use user-defined margin if provided in the order, otherwise fallback to settings
  // If o.profitMargin is explicitly 0, we should still use it, but if it's undefined or NaN, use settings.
  const actualWholesaleMargin = o.profitMargin !== undefined && !isNaN(n(o.profitMargin)) ? n(o.profitMargin) : wholesaleMargin;
  const profitMul = 1 + actualWholesaleMargin / 100
  const wholesalePrice = totalCostPerPiece * profitMul
  
  const retailPrice = wholesalePrice * (1 + retailMargin / 100)
  const netProfit = (wholesalePrice - totalCostPerPiece) * pieces

  const varCost = fabricCostPerPiece + accessoriesCostPerPiece
  const fixedTotal = totalLabor + machineCost + energyCost + fixedMonth + n(o.cardboardPackaging) + n(o.shippingCost)
  const contribution = wholesalePrice - varCost
  const breakEvenUnits = contribution > 0 && fixedTotal > 0
    ? Math.ceil(fixedTotal / contribution) : 0

  return { fabricCostPerPiece, accessoriesCostPerPiece, laborCostPerPiece, machineCostPerPiece, energyCostPerPiece, fixedCostPerPiece, totalCostPerPiece, totalOrderCost, wholesalePrice, retailPrice, breakEvenUnits, netProfit }
}

// ── Employee Salary ─────────────────────────────────────────────────────────
import type { Employee } from '../store/useEmployeesStore'

export function calcSalary(e: Employee, workHoursPerDay = 8): Partial<Employee> {
  const daily = n(e.baseSalary)
  const attended = n(e.actualAttendanceDays)
  const basePay = daily * attended
  const hourlyRate = daily / workHoursPerDay

  let overtimeRate = hourlyRate
  if (e.overtimeType === '1.5x') overtimeRate = hourlyRate * 1.5
  else if (e.overtimeType === '2x') overtimeRate = hourlyRate * 2
  else if (e.overtimeType === 'fixed') overtimeRate = n(e.overtimeFixedRate)
  const overtimePay = n(e.overtimeHours) * overtimeRate

  const totalAllowances =
    n(e.transportAllowance) + n(e.mealAllowance) + n(e.housingAllowance) +
    n(e.performanceBonus) + n(e.annualBonus) + n(e.incentive) +
    (basePay * n(e.commissionPercent) / 100)

  const grossSalary = basePay + overtimePay + totalAllowances
  const insuranceAmount = grossSalary * n(e.insuranceRate) / 100
  const taxableIncome = grossSalary - insuranceAmount
  const taxAmount = taxableIncome * n(e.incomeTaxRate) / 100

  const workMinutesPerDay = workHoursPerDay * 60
  const lateDeduction = (n(e.lateMinutes) / workMinutesPerDay) * daily
  const absentDeduction = n(e.absentUnexcusedDays) * daily // الخصم الإضافي (يوم إضافي) ليصبح الإجمالي يومين (يوم الغياب + يوم جزاء)

  const totalDeductions =
    insuranceAmount + taxAmount + lateDeduction + absentDeduction +
    n(e.currentAdvance) + n(e.previousInstallments) +
    n(e.factoryPurchases) + n(e.disciplinaryFines) + n(e.otherDeductions)

  const netSalary = Math.max(0, grossSalary - totalDeductions)
  return { grossSalary, netSalary, totalAllowances, totalDeductions, insuranceAmount, taxAmount, overtimePay }
}

// ── Live Attendance Salary (always fresh, never stale) ──────────────────────
export interface AttendanceSummary {
  attended: number
  absent: number
  excused: number
  lateMinutes: number
  overtimeHours: number
  totalAdvance: number
}

export interface LiveSalaryResult extends AttendanceSummary {
  basePay: number
  overtimePay: number
  totalAllowances: number
  grossSalary: number
  insuranceAmount: number
  taxAmount: number
  lateDeduction: number
  absentDeduction: number
  totalDeductions: number
  netSalary: number
}

/**
 * Compute salary 100% fresh from raw attendance records.
 * workingDays = days in month − Fridays.
 * Logic: basePay = daily × attended
 *        absentDeduction = daily × absent (extra fine; the day itself already not in basePay)
 *        Total absent effect = 2× daily per absent day (labour-law standard)
 */
export function computeAttendanceSalary(
  emp: Employee,
  records: Record<string, { status?: string; lateMins?: number; overtimeHours?: number; advanceAmount?: number }>,
  workingDays: number,
  workHoursPerDay = 8
): LiveSalaryResult {
  let absent = 0, excused = 0, lateMinutes = 0, overtimeHours = 0, totalAdvance = 0

  Object.values(records).forEach(r => {
    if (r.status === 'absent')  absent++
    if (r.status === 'excused') excused++
    lateMinutes   += n(r.lateMins)
    overtimeHours += n(r.overtimeHours)
    totalAdvance  += n(r.advanceAmount)
  })

  const attended = Math.max(0, workingDays - absent - excused)
  const daily    = n(emp.baseSalary)
  const basePay  = daily * attended

  const hourlyRate = workHoursPerDay > 0 ? daily / workHoursPerDay : 0
  let otRate = hourlyRate
  if (emp.overtimeType === '1.5x') otRate = hourlyRate * 1.5
  else if (emp.overtimeType === '2x') otRate = hourlyRate * 2
  else if (emp.overtimeType === 'fixed') otRate = n(emp.overtimeFixedRate)
  const overtimePay = overtimeHours * otRate

  const totalAllowances =
    n(emp.transportAllowance) + n(emp.mealAllowance) + n(emp.housingAllowance) +
    n(emp.performanceBonus)   + n(emp.annualBonus)   + n(emp.incentive) +
    basePay * n(emp.commissionPercent) / 100

  const grossSalary     = basePay + overtimePay + totalAllowances
  const insuranceAmount = grossSalary * n(emp.insuranceRate) / 100
  const taxAmount       = (grossSalary - insuranceAmount) * n(emp.incomeTaxRate) / 100

  const workMins       = workHoursPerDay * 60
  const lateDeduction  = workMins > 0 ? (lateMinutes / workMins) * daily : 0
  const absentDeduction = absent * daily  // 1× extra fine (day not paid + 1× fine = 2× total)

  const totalDeductions =
    insuranceAmount + taxAmount + lateDeduction + absentDeduction +
    totalAdvance + n(emp.previousInstallments) +
    n(emp.factoryPurchases) + n(emp.disciplinaryFines) + n(emp.otherDeductions)

  const netSalary = Math.max(0, grossSalary - totalDeductions)

  return {
    attended, absent, excused, lateMinutes, overtimeHours, totalAdvance,
    basePay, overtimePay, totalAllowances, grossSalary,
    insuranceAmount, taxAmount, lateDeduction, absentDeduction,
    totalDeductions, netSalary,
  }
}
