import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, AlertTriangle } from 'lucide-react'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* 404 Number */}
        <div className="relative">
          <p className="text-[120px] md:text-[160px] font-black leading-none select-none"
            style={{ background: 'linear-gradient(135deg, rgba(232,160,32,0.15), rgba(232,160,32,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <AlertTriangle size={36} className="text-gold" />
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
            الصفحة غير موجودة
          </h1>
          <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed">
            الرابط الذي تحاول الوصول إليه غير موجود في النظام أو ربما تم حذفه.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          className="btn-gold px-8 py-3 text-base shadow-xl shadow-gold/20 mx-auto"
        >
          <Home size={18} />
          العودة للوحة التحكم
        </motion.button>
      </motion.div>
    </div>
  )
}

export default NotFound
