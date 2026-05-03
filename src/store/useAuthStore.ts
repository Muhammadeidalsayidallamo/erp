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
const DEFAULT_HASH = "81cc7ab3b48231c6a7d519e48c5cf05cdb2a8d3de6517a102a017e81403061da";

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
        // If we have a legacy `pinCode` (plaintext) stored in localStorage,
        // we must hash it. Zustand's persist handles state, but let's check
        // if pinHash is actually holding a plaintext pin (length < 64).
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
        // For backwards compatibility when reading old state, if `pinCode` exists, we can grab it, 
        // but Zustand will just load whatever we return here for saving.
      }),
      merge: (persistedState: any, currentState) => {
        // Handle migration from old `pinCode` to `pinHash` during hydration
        if (persistedState && persistedState.pinCode && !persistedState.pinHash) {
          return {
            ...currentState,
            ...persistedState,
            pinHash: persistedState.pinCode, // Will be hashed by `migratePlaintextPinIfNeeded`
            pinLength: persistedState.pinCode.length,
          }
        }
        return { ...currentState, ...persistedState }
      }
    }
  )
)
