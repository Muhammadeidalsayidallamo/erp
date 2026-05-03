import React from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#060b18] text-white" dir="rtl">
    <Header />
    <Sidebar />
    <main className="md:mr-[220px] pt-14 md:pt-0 pb-24 md:pb-0 min-h-screen">
      <motion.div
        key={window.location.pathname}
        className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </main>
    <BottomNav />
  </div>
)

export default Layout
