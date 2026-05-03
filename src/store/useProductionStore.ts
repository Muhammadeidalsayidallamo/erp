import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MachineType = 'سنجر' | 'أوفر 4' | 'أوفر 5' | 'أورليه' | 'عراوي' | 'زراير' | 'مكواة' | 'يدوي' | string

export interface ProductionStage {
  id: string
  index: number
  name: string
  machineType: MachineType
  timeMinutes: number
  timeSeconds: number
  pricePiastres: number // السعر بالقروش
  workerName?: string
  stageQuantity?: number
}

export interface ProductionModel {
  id: string
  modelNumber: string
  modelType: string
  clientName: string
  targetCostPiastres: number // إجمالي التكلفة المستهدفة بالقروش
  sketchImage: string | null // Base64 or URL
  stages: ProductionStage[]
  createdAt: string
  updatedAt: string
}

interface ProductionState {
  models: ProductionModel[]
  activeModelId: string | null
  
  // Actions
  setActiveModel: (id: string | null) => void
  addModel: (model: Partial<ProductionModel>) => string
  updateModel: (id: string, data: Partial<ProductionModel>) => void
  deleteModel: (id: string) => void
  
  addStage: (modelId: string) => void
  updateStage: (modelId: string, stageId: string, data: Partial<ProductionStage>) => void
  removeStage: (modelId: string, stageId: string) => void
  reorderStages: (modelId: string, stages: ProductionStage[]) => void
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export const useProductionStore = create<ProductionState>()(
  persist(
    (set, get) => ({
      models: [],
      activeModelId: null,

      setActiveModel: (id) => set({ activeModelId: id }),

      addModel: (data) => {
        const newModel: ProductionModel = {
          id: generateId(),
          modelNumber: data.modelNumber || 'جديد',
          modelType: data.modelType || 'بنطلون',
          clientName: data.clientName || 'غير محدد',
          targetCostPiastres: data.targetCostPiastres || 0,
          sketchImage: data.sketchImage || null,
          stages: data.stages || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        set((state) => ({ 
          models: [...state.models, newModel],
          activeModelId: newModel.id 
        }))
        return newModel.id
      },

      updateModel: (id, data) => set((state) => ({
        models: state.models.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m)
      })),

      deleteModel: (id) => set((state) => ({
        models: state.models.filter(m => m.id !== id),
        activeModelId: state.activeModelId === id ? null : state.activeModelId
      })),

      addStage: (modelId) => set((state) => {
        return {
          models: state.models.map(m => {
            if (m.id !== modelId) return m
            const newIndex = m.stages.length + 1
            const newStage: ProductionStage = {
              id: generateId(),
              index: newIndex,
              name: '',
              machineType: 'سنجر',
              timeMinutes: 0,
              timeSeconds: 0,
              pricePiastres: 0,
              workerName: '',
              stageQuantity: 0
            }
            return { ...m, stages: [...m.stages, newStage], updatedAt: new Date().toISOString() }
          })
        }
      }),

      updateStage: (modelId, stageId, data) => set((state) => {
        return {
          models: state.models.map(m => {
            if (m.id !== modelId) return m
            return {
              ...m,
              stages: m.stages.map(s => s.id === stageId ? { ...s, ...data } : s),
              updatedAt: new Date().toISOString()
            }
          })
        }
      }),

      removeStage: (modelId, stageId) => set((state) => {
        return {
          models: state.models.map(m => {
            if (m.id !== modelId) return m
            // Re-index remaining stages
            const newStages = m.stages.filter(s => s.id !== stageId)
              .map((s, idx) => ({ ...s, index: idx + 1 }))
            return {
              ...m,
              stages: newStages,
              updatedAt: new Date().toISOString()
            }
          })
        }
      }),

      reorderStages: (modelId, stages) => set((state) => ({
        models: state.models.map(m => m.id === modelId ? { ...m, stages, updatedAt: new Date().toISOString() } : m)
      }))

    }),
    {
      name: 'protex-production-models'
    }
  )
)
