import React from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, Code as Code2, 
  Cpu, Rocket, Heart, Mail, ExternalLink, MessageSquare as MessageCircle, User
} from 'lucide-react'
import { Card } from '../components/ui'

const Developer: React.FC = () => {
  const socialLinks = [
    { 
      name: 'Facebook', 
      url: 'https://www.facebook.com/muhammad.abn.allam', 
      icon: <Globe size={20} />, 
      color: 'bg-[#1877F2]',
      hover: 'hover:shadow-[#1877F2]/40'
    },
    { 
      name: 'X (Twitter)', 
      url: 'https://x.com/alsayid_eid', 
      icon: <Globe size={20} />, 
      color: 'bg-[#000000]',
      hover: 'hover:shadow-white/20'
    },
    { 
      name: 'Instagram', 
      url: 'https://www.instagram.com/mohamed.alam8945/', 
      icon: <Globe size={20} />, 
      color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
      hover: 'hover:shadow-[#ee2a7b]/40'
    },
    { 
      name: 'Threads', 
      url: 'https://www.threads.com/@mohamed.alam8945', 
      icon: <MessageCircle size={20} />, 
      color: 'bg-black',
      hover: 'hover:shadow-white/20'
    },
    { 
      name: 'LinkedIn', 
      url: 'https://www.linkedin.com/in/muhammad-eid-alsayed-allam-ahmed-hammad-35577625b', 
      icon: <User size={20} />, 
      color: 'bg-[#0A66C2]',
      hover: 'hover:shadow-[#0A66C2]/40'
    },
  ]

  const skills = [
    { name: 'Full Stack Development', icon: <Code2 size={16} /> },
    { name: 'ERP Systems Architecture', icon: <Cpu size={16} /> },
    { name: 'Financial Systems', icon: <Globe size={16} /> },
    { name: 'Business Logic Expert', icon: <Rocket size={16} /> },
  ]

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-4xl mx-auto px-4 pt-10">
        
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-gold via-white to-gold shadow-2xl">
              <div className="w-full h-full rounded-full bg-navy-dark overflow-hidden flex items-center justify-center border-4 border-navy-dark">
                <img src="/dev-avatar.jpg" alt="Muhammad Allam" className="w-full h-full object-cover" />
              </div>
            </div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute bottom-2 right-2 w-8 h-8 bg-success rounded-full border-4 border-navy flex items-center justify-center"
              title="Available for projects"
            />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
            محمد علام
          </h1>
          <p className="text-gold font-bold text-lg md:text-xl mb-4">
            Full Stack Developer & Software Architect
          </p>
          <p className="text-white/80 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
            أخوكم محمد علام، مبرمج بسيط بيجتهد عشان يعمل سيستم يريح أصحاب المصانع من وجع الدماغ ودوشة الحسابات. 
            الهدف دايماً إن الشغل يمشي بسلاسة، وربنا يجعلنا سبب في تيسير الأمور.. دعواتكم بالتوفيق.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* About Me / Expertise */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={18} className="text-gold" />
                <h3 className="section-title">مجالات الخبرة</h3>
              </div>
              <div className="space-y-4">
                <p className="text-white/70 text-sm leading-relaxed">
                  بفضل الله اتعلمت إزاي أطوع التكنولوجيا عشان تخدم الشغل بجد. بستخدم أدوات زي React و TypeScript عشان أعمل برامج سريعة وتستحمل الضغط.
                  فرحتي الحقيقية لما بلاقي البرنامج اللي سهرت عليه بيسهل الشغل للناس.
                </p>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group hover:border-gold/30 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                        {skill.icon}
                      </div>
                      <span className="text-sm font-bold text-white/80">{skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="mt-6">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={18} className="text-gold" />
                  <h3 className="section-title">تواصل معي</h3>
                </div>
                <p className="text-white/50 text-xs mb-4">لديك فكرة مشروع؟ أو ترغب في تطوير نظامك الخاص؟ لا تتردد في مراسلتي.</p>
                <a 
                  href="mailto:mohamed.alam8945@gmail.com" 
                  className="btn-gold w-full flex items-center justify-center gap-2"
                >
                  <Mail size={16} /> إرسال بريد إلكتروني
                </a>
              </Card>
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink size={18} className="text-gold" />
                <h3 className="section-title">مواقع التواصل الاجتماعي</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {socialLinks.map((link, i) => (
                  <a 
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:scale-[1.02] hover:bg-white/[0.05] group ${link.hover} shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center text-white shadow-lg`}>
                        {link.icon}
                      </div>
                      <span className="font-bold text-white/90">{link.name}</span>
                    </div>
                    <ExternalLink size={14} className="text-white/20 group-hover:text-gold transition-colors" />
                  </a>
                ))}
              </div>
            </Card>

            {/* Quote Card */}
            <div className="bg-gradient-to-br from-navy-light to-navy border border-white/10 rounded-[32px] p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Heart size={80} className="text-gold" />
              </div>
              <p className="text-xl font-bold text-white mb-2 relative z-10 italic">
                "البرمجة ليست مجرد كود، إنها فن حل المشكلات."
              </p>
              <p className="text-gold text-sm font-bold relative z-10">- محمد علام</p>
            </div>
          </motion.div>

        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center text-white/30 text-[11px] font-bold tracking-widest uppercase"
        >
          Designed & Developed with <Heart size={10} className="inline text-danger mx-1" /> by Muhammad Allam © 2024
        </motion.div>

      </div>
    </div>
  )
}

export default Developer
