import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Silkscreen ──────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'processing' | 'finishing' | 'ready' | 'delivered' | 'canceled'
export interface SilkscreenOrder {
  id: string; date: string; orderNumber: string; printingUnit: string
  clientId?: string; paidAmount?: number; remainingAmount?: number; status?: OrderStatus
  // Item details (Provided by client)
  itemDescription: string; printLocations: string
  totalPieces: number; designImage?: string
  // Screens
  screenPrice: number; numColors: number; screenLifeOrders: number
  emulsionCostPerScreen: number; emulsionRemoverCost: number; thinnerCost: number
  // Ink
  inkType: string; inkPricePerKg: number; inkConsumptionPer100: number
  // Energy
  ovenKw: number; electricityPricePerKw: number; operatingHours: number; gasOrFuelCost: number
  // Labor
  printWorkers: number; printWorkerDaily: number
  screenPrepWorkers: number; screenPrepDaily: number
  fixingWorkers: number; fixingDaily: number
  qcWorkers: number; qcDaily: number
  packagingWorkers: number; packagingDaily: number
  orderDays: number; overtimeHours: number; overtimeRate: number
  // Expenses
  rent: number; maintenance: number; shipping: number; packaging: number
  profitMargin: number; taxRate: number
  // Results
  screenCost: number; inkCost: number
  electricityCost: number; laborCost: number; otherCost: number
  totalOrderCost: number; printCostPerPiece: number
  suggestedPrice: number; suggestedTotalPrice: number; netProfit: number; profitPercent: number
}

// ── DTF ────────────────────────────────────────────────────────────────────
export interface DTFOrder {
  id: string; date: string; orderNumber: string; printingUnit: string
  clientId?: string; paidAmount?: number; remainingAmount?: number; status?: OrderStatus
  itemDescription?: string; printLocations?: string; designImage?: string
  // Film
  filmRollPrice: number; designWidth: number; designHeight: number
  designsPerRoll: number; rollConsumptionPer100: number
  // Powder
  powderPricePerKg: number; powderGramsPer100: number
  // Ink
  cmykInkPricePer100ml: number; whiteInkPricePer100ml: number
  cmykMlPerA4: number; whiteMlPerA4: number; piecesPerA4Equivalent: number
  // Machine
  printHeadLifeMl: number; printHeadPrice: number; maintenanceCost: number; wasteTankCost: number
  // Energy
  printerKw: number; ovenKw: number; electricityPricePerKw: number; operatingHours: number
  // Labor
  numWorkers: number; workerDaily: number
  printTimePerPieceMins: number; pressingTimeMins: number
  orderDays: number
  // Expenses
  shipping: number; packaging: number; profitMargin: number; taxRate: number; totalPieces: number
  // Results
  filmCostPerPiece: number; inkCostPerPiece: number
  powderCostPerPiece: number; energyCostPerPiece: number
  laborCostPerPiece: number; machineCostPerPiece: number
  totalCostPerPiece: number; totalOrderCost: number
  suggestedPricePerPiece: number; suggestedTotalPrice: number; netProfit: number; profitPercent: number
  taxAmount?: number; priceWithTax?: number; priceWithoutTax?: number
}

// ── Clothing ───────────────────────────────────────────────────────────────
export type MaterialDeduction = { inventoryItemId: string, quantity: number, unit: string }

export interface ClothingOrder {
  id: string; date: string; orderNumber: string; factoryName: string; productType: string
  clientId?: string; paidAmount?: number; remainingAmount?: number; status?: OrderStatus
  isCMT?: boolean; modelId?: string; // CMT: Cut, Make, Trim (تصنيع للغير)
  productionStyle?: 'stages' | 'whole'; // 'stages' = إنتاج مراحل, 'whole' = إنتاج حتة كاملة
  wholePieceLaborCost?: number; // أجر الصنايعي للحتة كاملة (قروش أو جنيه)
  // Fabric
  fabricType: string; fabricWeightGsm: number; fabricPricePerMeter: number
  fabricPerPieceMeters: number; wastePercent: number
  // Accessories
  threadPricePerBobbin: number; threadConsumptionPerPiece: number
  buttonZipperCost: number; liningCost: number
  // Machines
  numSewingMachines: number; machineRatePerDay: number
  sewingTimePerPieceMins: number; dailyProductionCapacity: number
  // Energy
  totalWorkshopKw: number; electricityPricePerKw: number; operatingHours: number
  // Labor
  cutters: number; cutterDaily: number; sewers: number; sewerDaily: number
  finishers: number; finisherDaily: number; qcWorkers: number; qcWorkerDaily: number
  packagingWorkers: number; packagingWorkerDaily: number; admins: number; adminDaily: number
  orderDays: number
  // Fixed
  monthlyRent: number; monthlyMaintenance: number; waterCost: number
  // Expenses
  cardboardPackaging: number; shippingCost: number; profitMargin: number; totalPieces: number
  // Results
  fabricCostPerPiece: number; accessoriesCostPerPiece: number
  laborCostPerPiece: number; energyCostPerPiece: number
  machineCostPerPiece: number; fixedCostPerPiece: number
  totalCostPerPiece: number; totalOrderCost: number
  wholesalePrice: number; retailPrice: number; breakEvenUnits: number; netProfit: number
  materialDeductions?: MaterialDeduction[]
}

export type Order = SilkscreenOrder | DTFOrder | ClothingOrder

interface OrdersState {
  silkscreenOrders: SilkscreenOrder[]
  dtfOrders: DTFOrder[]
  clothingOrders: ClothingOrder[]
  saveSilkscreen: (o: SilkscreenOrder) => void
  deleteSilkscreen: (id: string) => void
  saveDTF: (o: DTFOrder) => void
  deleteDTF: (id: string) => void
  saveClothing: (o: ClothingOrder) => void
  deleteClothing: (id: string) => void
  updateOrderStatus: (type: 'silkscreen' | 'dtf' | 'clothing', id: string, status: OrderStatus) => void
  clearAll: () => void
  clearSilkscreen: () => void
  clearDTF: () => void
  clearClothing: () => void
}

const upsert = <T extends { id: string }>(arr: T[], item: T): T[] => {
  const idx = arr.findIndex(x => x.id === item.id)
  if (idx >= 0) { const n = [...arr]; n[idx] = item; return n }
  return [item, ...arr]
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      silkscreenOrders: [], dtfOrders: [], clothingOrders: [],
      saveSilkscreen: (o) => {
        set(s => ({ silkscreenOrders: upsert(s.silkscreenOrders, o) }))
        if (o.clientId) {
          import('./useClientsStore').then(({ useClientsStore }) => {
            const store = useClientsStore.getState()
            const totalRevenue = o.suggestedPrice * o.totalPieces
            
            // ✅ Single Source of Truth: يتم تسجيل العميل (الدين ثم الدفعة) هنا فقط
            // 1. Update or Add Debt (تسجيل الدين أولاً)
            const debtTx = store.transactions.find(t => t.orderId === o.id && t.type === 'debt')
            if (debtTx) {
              // ✅ Use proper action instead of direct mutation
              store.updateTransaction(debtTx.id, { amount: totalRevenue })
            } else {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: totalRevenue,
                type: 'debt',
                notes: `أوردر سيلك سكرين رقم ${o.orderNumber}`
              })
            }

            // 2. Payment — add on first save, update on re-save if amount changed (تسجيل الدفعة إن وجدت)
            const payTx = store.transactions.find(t => t.orderId === o.id && t.type === 'payment')
            if (payTx) {
              if (o.paidAmount && payTx.amount !== o.paidAmount) {
                store.updateTransaction(payTx.id, { amount: o.paidAmount })
              }
            } else if (o.paidAmount && o.paidAmount > 0) {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: o.paidAmount,
                type: 'payment',
                notes: `دفعة مقدمة أوردر سيلك رقم ${o.orderNumber}`
              })
            }
          })
        }
      },
      deleteSilkscreen: (id) => {
        set(s => ({ silkscreenOrders: s.silkscreenOrders.filter(x => x.id !== id) }))
        import('./useClientsStore').then(({ useClientsStore }) => {
          useClientsStore.getState().deleteTransactionsByOrder(id)
        })
      },
      
      saveDTF: (o) => {
        set(s => ({ dtfOrders: upsert(s.dtfOrders, o) }))
        if (o.clientId) {
          import('./useClientsStore').then(({ useClientsStore }) => {
            const store = useClientsStore.getState()
            const totalRevenue = o.suggestedPricePerPiece * o.totalPieces

            const debtTx = store.transactions.find(t => t.orderId === o.id && t.type === 'debt')
            if (debtTx) {
              // ✅ Use proper action instead of direct mutation
              store.updateTransaction(debtTx.id, { amount: totalRevenue })
            } else {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: totalRevenue,
                type: 'debt',
                notes: `أوردر DTF رقم ${o.orderNumber}`
              })
            }

            const payTx = store.transactions.find(t => t.orderId === o.id && t.type === 'payment')
            if (payTx) {
              if (o.paidAmount && payTx.amount !== o.paidAmount) {
                store.updateTransaction(payTx.id, { amount: o.paidAmount })
              }
            } else if (o.paidAmount && o.paidAmount > 0) {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: o.paidAmount,
                type: 'payment',
                notes: `دفعة مقدمة أوردر DTF رقم ${o.orderNumber}`
              })
            }
          })
        }
      },
      deleteDTF: (id) => {
        set(s => ({ dtfOrders: s.dtfOrders.filter(x => x.id !== id) }))
        import('./useClientsStore').then(({ useClientsStore }) => {
          useClientsStore.getState().deleteTransactionsByOrder(id)
        })
      },
      
      saveClothing: (o) => {
        const existingOrder = get().clothingOrders.find(x => x.id === o.id)
        
        import('./useInventoryStore').then(({ useInventoryStore }) => {
          const invStore = useInventoryStore.getState()
          
          // 1. Rollback previous deductions if this is an update
          if (existingOrder?.materialDeductions) {
            existingOrder.materialDeductions.forEach(d => {
              const item = invStore.items.find(i => i.id === d.inventoryItemId)
              if (item) {
                invStore.addStock(d.inventoryItemId, d.quantity, item.costPerUnit, `إلغاء خصم لتعديل أوردر ملابس رقم ${o.orderNumber}`)
              }
            })
          }

          // 2. Apply new deductions and check for sufficient stock
          if (o.materialDeductions && o.materialDeductions.length > 0) {
            const warnings: string[] = []
            
            o.materialDeductions.forEach(d => {
              const item = invStore.items.find(i => i.id === d.inventoryItemId)
              if (item) {
                if (item.quantity < d.quantity) {
                  warnings.push(`الكمية المتاحة من ${item.name} (${item.quantity.toFixed(3)} ${item.originalUnit}) غير كافية لخصم ${d.quantity} ${d.unit}`)
                }
                invStore.deductStock(d.inventoryItemId, d.quantity, `أوردر ملابس رقم ${o.orderNumber}`)
              }
            })
            
            if (warnings.length > 0) {
              window.alert("⚠️ تحذير المخزون:\n" + warnings.join("\n"))
            }
          }
        })

        set(s => ({ clothingOrders: upsert(s.clothingOrders, o) }))
        if (o.clientId) {
          import('./useClientsStore').then(({ useClientsStore }) => {
            const store = useClientsStore.getState()
            const totalRevenue = o.wholesalePrice * o.totalPieces

            const debtTx = store.transactions.find(t => t.orderId === o.id && t.type === 'debt')
            if (debtTx) {
              store.updateTransaction(debtTx.id, { amount: totalRevenue })
            } else {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: totalRevenue,
                type: 'debt',
                notes: `أوردر ملابس رقم ${o.orderNumber}`
              })
            }

            const payTx = store.transactions.find(t => t.orderId === o.id && t.type === 'payment')
            if (payTx) {
              if (o.paidAmount && payTx.amount !== o.paidAmount) {
                store.updateTransaction(payTx.id, { amount: o.paidAmount })
              }
            } else if (o.paidAmount && o.paidAmount > 0) {
              store.addTransaction({
                clientId: o.clientId!,
                orderId: o.id,
                amount: o.paidAmount,
                type: 'payment',
                notes: `دفعة مقدمة أوردر ملابس رقم ${o.orderNumber}`
              })
            }
          })
        }
      },
      deleteClothing: (id) => {
        const order = get().clothingOrders.find(x => x.id === id)
        if (order?.materialDeductions) {
          import('./useInventoryStore').then(({ useInventoryStore }) => {
            const invStore = useInventoryStore.getState()
            order.materialDeductions!.forEach(d => {
              const item = invStore.items.find(i => i.id === d.inventoryItemId)
              if (item) {
                invStore.addStock(d.inventoryItemId, d.quantity, item.costPerUnit, `استرجاع خامات لحذف أوردر ملابس رقم ${order.orderNumber}`)
              }
            })
          })
        }

        set(s => ({ clothingOrders: s.clothingOrders.filter(x => x.id !== id) }))
        import('./useClientsStore').then(({ useClientsStore }) => {
          useClientsStore.getState().deleteTransactionsByOrder(id)
        })
      },
      updateOrderStatus: (type, id, status) => set(s => {
        if (type === 'silkscreen') return { silkscreenOrders: s.silkscreenOrders.map(o => o.id === id ? { ...o, status } : o) }
        if (type === 'dtf') return { dtfOrders: s.dtfOrders.map(o => o.id === id ? { ...o, status } : o) }
        if (type === 'clothing') return { clothingOrders: s.clothingOrders.map(o => o.id === id ? { ...o, status } : o) }
        return s
      }),
      clearAll: () => set({ silkscreenOrders: [], dtfOrders: [], clothingOrders: [] }),
      clearSilkscreen: () => set({ silkscreenOrders: [] }),
      clearDTF: () => set({ dtfOrders: [] }),
      clearClothing: () => set({ clothingOrders: [] }),
    }),
    { name: 'ppf-orders' }
  )
)
