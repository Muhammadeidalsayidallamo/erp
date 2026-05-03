import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hashPin, verifyPin } from '../utils/crypto'

interface AuthState {
  isLockEnabled: boolean
  pinHash: string
  pinLength: number
  isUnlocked: boolean
  
  enableLock: (pin: string) => Promise<void>
  disableLock: () => void
  setUnlocked: (status: boolean) => void
  updatePin: (newPin: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  migratePlaintextPinIfNeeded: () => Promise<void>
}

// Default hash for "2002"
const DEFAULT_HASH = "6c94e35ccc352d4e9ef0b99562cff995a5741ce8de8ad11b568892934daee366";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLockEnabled: true,
      pinHash: DEFAULT_HASH,
      pinLength: 4,
      isUnlocked: false,
      
      enableLock: async (pin) => {
        const hash = await hashPin(pin)
        set({ isLockEnabled: true, pinHash: hash, pinLength: pin.length, isUnlocked: false })
      },
      
      disableLock: () => set({ isLockEnabled: false, pinHash: '', pinLength: 0, isUnlocked: true }),
      
      setUnlocked: (status) => set({ isUnlocked: status }),
      
      updatePin: async (newPin) => {
        const hash = await hashPin(newPin)
        set({ pinHash: hash, pinLength: newPin.length })
      },

      unlock: async (pin) => {
        const { pinHash } = get()
        const isValid = await verifyPin(pin, pinHash)
        if (isValid) {
          set({ isUnlocked: true })
        }
        return isValid
      },

      migratePlaintextPinIfNeeded: async () => {
        const currentHash = get().pinHash;
        if (currentHash && currentHash.length < 64) {
          const hash = await hashPin(currentHash);
          set({ pinHash: hash, pinLength: currentHash.length });
        }
      }
    }),
    {
      name: 'ppf-auth', // Persisted key
      partialize: (state) => ({ 
        isLockEnabled: state.isLockEnabled,
        pinHash: state.pinHash,
        pinLength: state.pinLength,
      }),
      merge: (persistedState: any, currentState) => {
        // Handle migration from old `pin` or `pinCode` to `pinHash` during hydration
        if (persistedState) {
          const legacyPin = persistedState.pin || persistedState.pinCode;
          if (legacyPin && !persistedState.pinHash) {
            return {
              ...currentState,
              ...persistedState,
              pinHash: legacyPin, // Will be hashed by `migratePlaintextPinIfNeeded`
              pinLength: legacyPin.length,
            }
          }
        }
        return { ...currentState, ...persistedState }
      }
    }
  )
)
