import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  vatRate: number
  insuranceRate: number
  workHoursPerDay: number
  currency: string
  currencySymbol: string
  primaryColor: string
  companyLogo: string
  taxNumber: string
  retailMargin: number
  wholesaleMargin: number
}

const defaults: AppSettings = {
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  vatRate: 0,
  insuranceRate: 11,
  workHoursPerDay: 8,
  currency: 'EGP',
  currencySymbol: 'ج.م',
  primaryColor: '#e8a020',
  companyLogo: '',
  taxNumber: '',
  retailMargin: 35,
  wholesaleMargin: 0,
}

interface SettingsState {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaults,
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      reset: () => set({ settings: defaults }),
    }),
    { name: 'ppf-settings' }
  )
)
