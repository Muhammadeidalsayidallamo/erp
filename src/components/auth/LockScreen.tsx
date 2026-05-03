import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Delete } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'

const LockScreen: React.FC = () => {
  const { pinLength, unlock, migratePlaintextPinIfNeeded } = useAuthStore()
  const { settings } = useSettingsStore()
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    migratePlaintextPinIfNeeded()
  }, [migratePlaintextPinIfNeeded])

  useEffect(() => {
    const handleUnlock = async () => {
      if (input.length === pinLength) {
        setIsLoading(true)
        const success = await unlock(input)
        if (!success) {
          setError(true)
          setTimeout(() => {
            setInput('')
            setError(false)
            setIsLoading(false)
          }, 800) // Clear after error shake
        } else {
          setIsLoading(false)
        }
      }
    }
    handleUnlock()
  }, [input, pinLength, unlock])

  const handleKeyPress = (key: string | 'del') => {
    if (error || isLoading) return // Lock input while showing error or loading
    
    if (key === 'del') {
      setInput(prev => prev.slice(0, -1))
    } else {
      if (input.length < pinLength) {
        setInput(prev => prev + key)
      }
    }
  }

  // Support physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (error) return
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key)
      } else if (e.key === 'Backspace') {
        handleKeyPress('del')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [error, input])

  return (
    <div className="fixed inset-0 z-[100] bg-bg-base flex flex-col items-center justify-center p-4">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-navy/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Logo & Lock Icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center shadow-glow-gold mb-4">
            <Lock size={28} className="text-bg-base" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            {settings.companyName || 'ProTex ERP'}
          </h1>
          <p className="text-sm text-white/40">أدخل رمز المرور للولوج</p>
        </motion.div>

        {/* PIN Indicators */}
        <motion.div 
          className="flex gap-4 mb-12"
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {Array.from({ length: pinLength }).map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < input.length 
                  ? 'bg-gold border-gold shadow-[0_0_15px_rgba(232,160,32,0.5)]' 
                  : error 
                    ? 'border-danger' 
                    : 'border-white/20'
              } ${isLoading ? 'animate-pulse' : ''}`} 
            />
          ))}
        </motion.div>

        {/* Keypad */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
          dir="ltr"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none"
              onClick={() => handleKeyPress(String(num))}
            >
              {num}
            </button>
          ))}
          <div /> {/* Empty space for bottom-left */}
          <button
            className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none"
            onClick={() => handleKeyPress('0')}
          >
            0
          </button>
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 active:scale-95 transition-all focus:outline-none"
            onClick={() => handleKeyPress('del')}
          >
            <Delete size={24} />
          </button>
        </motion.div>

        {/* Error Message */}
        <div className="h-8 mt-6">
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-danger text-sm font-medium"
              >
                الرمز السري غير صحيح
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default LockScreen
