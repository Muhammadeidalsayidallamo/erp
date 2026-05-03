import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Database, Trash2, Building2, Calculator, Wallet, Lock, Download, Upload } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useAuthStore } from '../store/useAuthStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { useEmployeesStore } from '../store/useEmployeesStore'
import { useDailyExpensesStore } from '../store/useDailyExpensesStore'
import { Input, Select, Grid, FormSection, PageHeader, Toast, Modal, Card, Divider } from '../components/ui'
import { exportAllData, importAllData, clearAllData } from '../utils/backup'

const currencies = [
  { value: 'EGP', label: 'جنيه مصري (EGP)', symbol: 'ج.م' },
  { value: 'SAR', label: 'ريال سعودي (SAR)', symbol: 'ر.س' },
  { value: 'AED', label: 'درهم إماراتي (AED)', symbol: 'د.إ' },
  { value: 'USD', label: 'دولار أمريكي (USD)', symbol: '$' },
  { value: 'EUR', label: 'يورو (EUR)', symbol: '€' },
]

const Settings: React.FC = () => {
  const { settings, update, reset: resetSettings } = useSettingsStore()
  const { isLockEnabled, enableLock, disableLock } = useAuthStore()
  const { expenses: dailyExpenses } = useDailyExpensesStore()

  const [local, setLocal] = useState({ ...settings })
  const [localPin, setLocalPin] = useState('')
  const [enablePin, setEnablePin] = useState(isLockEnabled)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Backup data
  const handleBackup = () => {
    exportAllData()
    setToast({ msg: 'تم تنزيل النسخة الاحتياطية بنجاح ✓', type: 'success' })
  }

  // Restore data
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await importAllData(file)
    if (result.success) {
      alert('تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.')
      window.location.reload()
    } else {
      if (result.errors.length > 0) {
        setToast({ msg: result.errors[0], type: 'error' })
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Clear data stores manually
  const handleClearData = () => {
    clearAllData()
    window.location.reload()
  }

  const set = (f: keyof typeof local, v: string | number) => setLocal(p => ({ ...p, [f]: v }))

  const handleCurrencyChange = (val: string) => {
    const sym = currencies.find(c => c.value === val)?.symbol || val
    setLocal(p => ({ ...p, currency: val, currencySymbol: sym }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = ev => set('companyLogo', ev.target?.result as string)
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const handleSave = async () => {
    update(local)

    // Handle PIN updates
    if (enablePin && localPin.length > 0) {
      await enableLock(localPin)
    } else {
      disableLock()
    }

    setToast({ msg: 'تم حفظ الإعدادات بنجاح ✓', type: 'success' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإعدادات الشاملة"
        subtitle="تكوين النظام وبيانات شركتك"
        icon={<SettingsIcon size={18} />}
        actions={
          <button className="btn-gold" onClick={handleSave}>
            <Save size={14} /> حفظ التغييرات
          </button>
        }
      />

      <div className="space-y-4">
        {/* Company Settings */}
        <FormSection title="بيانات الشركة الأساسية" icon={<Building2 size={14} />} collapsible={false}>
          <div className="flex flex-col md:flex-row gap-6 mb-6 items-center md:items-start border-b border-white/5 pb-6">
            <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group shrink-0">
              {local.companyLogo ? (
                <img src={local.companyLogo} className="w-full h-full object-contain" alt="Logo" />
              ) : (
                <div className="text-center text-white/30">
                  <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                  <span className="text-[10px]">شعار الشركة</span>
                </div>
              )}
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
              {local.companyLogo && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-white">تغيير الشعار</span>
                </div>
              )}
            </div>
            <div className="flex-1 w-full">
              <Grid cols={2}>
                <Input label="اسم الشركة / المطبعة" value={local.companyName} onChange={e => set('companyName', e.target.value)} placeholder="اسم شركتك" />
                <Input label="الرقم الضريبي / السجل التجاري" value={local.taxNumber || ''} onChange={e => set('taxNumber', e.target.value)} placeholder="مثال: 123-456-789" />
                <Input label="رقم الهاتف" value={local.companyPhone} onChange={e => set('companyPhone', e.target.value)} placeholder="01X XXXX XXXX" dir="ltr" />
                <Input label="العنوان" value={local.companyAddress} onChange={e => set('companyAddress', e.target.value)} placeholder="مثال: القاهرة، مدينة المقطم" />
                <Input label="البريد الإلكتروني" type="email" value={local.companyEmail} onChange={e => set('companyEmail', e.target.value)} placeholder="info@company.com" dir="ltr" className="col-span-2" />
              </Grid>
            </div>
          </div>
        </FormSection>

        {/* Financial Settings */}
        <FormSection title="الإعدادات المالية والمحاسبية" icon={<Calculator size={14} />}>
          <Grid cols={2}>
            <Select label="العملة الأساسية" options={currencies.map(c => ({ value: c.value, label: c.label }))} value={local.currency} onChange={e => handleCurrencyChange(e.target.value)} hint="العملة المستخدمة في جميع أقسام التطبيق" />
            <Input label="رمز العملة المخصص (اختياري)" value={local.currencySymbol} onChange={e => set('currencySymbol', e.target.value)} placeholder="مثال: ج.م، رياﻝ" />
            <Input label="نسبة التأمينات الاجتماعية (الافتراضية)" type="number" value={local.insuranceRate} onChange={e => set('insuranceRate', +e.target.value)} suffix="%" placeholder="11" hint="تخصم من رواتب الموظفين (القانون 11%)" />
            <Input label="ضريبة القيمة المضافة (الافتراضية)" type="number" value={local.vatRate} onChange={e => set('vatRate', +e.target.value)} suffix="%" placeholder="14" hint="تضاف على الفواتير" />
          </Grid>
        </FormSection>

        {/* Pricing Settings */}
        <FormSection title="إعدادات التسعير والهوامش" icon={<Calculator size={14} />}>
          <Grid cols={2}>
            <Input 
              label="هامش سعر الجملة (الافتراضي) %" 
              type="number" 
              value={local.wholesaleMargin} 
              onChange={e => set('wholesaleMargin', +e.target.value)} 
              suffix="%" 
              placeholder="0" 
              hint="نسبة الربح المضافة على إجمالي التكلفة" 
            />
            <Input 
              label="هامش سعر التجزئة (الافتراضي) %" 
              type="number" 
              value={local.retailMargin} 
              onChange={e => set('retailMargin', +e.target.value)} 
              suffix="%" 
              placeholder="35" 
              hint="نسبة الربح المضافة على سعر الجملة لتسعير القطاعي" 
            />
          </Grid>
        </FormSection>

        {/* HR Settings */}
        <FormSection title="شئون الموظفين والرواتب" icon={<Wallet size={14} />}>
          <Grid cols={2}>
            <Input label="عدد ساعات العمل اليومية" type="number" value={local.workHoursPerDay} onChange={e => set('workHoursPerDay', +e.target.value)} suffix="ساعات" placeholder="8" hint="الأساس لحساب أجر الساعة والإضافي" />
          </Grid>
        </FormSection>

        {/* Security / PIN Lock */}
        <FormSection title="شاشة قفل الأمان (PIN Lock)" icon={<Lock size={14} />}>
          <Grid cols={2}>
            <div>
              <p className="label mb-2">تفعيل قفل التطبيق بالأرقام؟</p>
              <div className="flex gap-4">
                <button
                  className={`btn-ghost ${enablePin ? 'bg-gold/20 text-gold border-gold/50' : ''}`}
                  onClick={() => setEnablePin(true)}
                >
                  نعم، تفعيل
                </button>
                <button
                  className={`btn-ghost ${!enablePin ? 'bg-white/10 text-white' : ''}`}
                  onClick={() => setEnablePin(false)}
                >
                  تعطيل
                </button>
              </div>
            </div>
            {enablePin && (
              <Input
                label="الرمز السري (أرقام فقط)"
                type="number"
                value={localPin}
                onChange={e => setLocalPin(e.target.value)}
                placeholder="مثال: 2002"
                hint="رمز الدخول الذي سيُطلب عند فتح البرنامج"
              />
            )}
          </Grid>
        </FormSection>

        {/* Data Management */}
        <FormSection title="إدارة البيانات والخطر" icon={<Database size={14} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="card p-4 border-success/10 bg-success/5">
              <h3 className="text-success font-bold text-sm mb-2 flex items-center gap-2">
                <Download size={16} /> أخذ نسخة احتياطية (Backup)
              </h3>
              <p className="text-white/40 text-xs mb-4">
                حمل جميع أوردراتك وبيانات العملاء والموظفين في ملف آمن لاسترجاعها لاحقاً.
              </p>
              <button className="btn-success w-full mb-3" onClick={() => {
                handleBackup()
                // Force a re-render to update the date immediately after backup
                setLocal(p => ({ ...p }))
              }}>
                <Download size={14} /> تصدير نسخة احتياطية
              </button>
              {localStorage.getItem('protex-last-backup-date') && (
                <div className="text-center text-[10px] text-white/50">
                  آخر تصدير: {new Date(localStorage.getItem('protex-last-backup-date')!).toLocaleString('ar-EG')}
                </div>
              )}
            </div>
            <div className="card p-4 border-blue-500/10 bg-blue-500/5">
              <h3 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2">
                <Upload size={16} /> استرجاع نسخة (Restore)
              </h3>
              <p className="text-white/40 text-xs mb-4">
                ارفع ملف البيانات السابق وسيتم استرجاع كل حساباتك وإعداداتك فوراً.
              </p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
              <button className="btn-navy w-full text-blue-400" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> استيراد نسخة احتياطية
              </button>
            </div>
          </div>

          <div className="card p-4 border-danger/10 bg-danger/5">
            <h3 className="text-danger font-bold text-sm mb-2 flex items-center gap-2">
              <Trash2 size={16} /> مسح جميع البيانات
            </h3>
            <p className="text-white/40 text-xs mb-4">
              سيتم حذف جميع بيانات الأوردرات (سيلك سكرين، DTF، ملابس) وبيانات الموظفين نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <button className="btn-danger" onClick={() => setShowClearConfirm(true)}>
              <Trash2 size={14} /> مسح كل البيانات
            </button>
          </div>
        </FormSection>
      </div>

      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="تحذير: مسح النظام"
        footer={<><button className="btn-ghost" onClick={() => setShowClearConfirm(false)}>إلغاء</button><button className="btn-danger" onClick={() => {
          if (window.confirm("تحذير نهائي: هل أنت متأكد بنسبة 100% أنك تريد مسح كل بيانات النظام؟ لا يمكن التراجع بعد هذه الخطوة!")) {
            handleClearData()
          }
        }}>نعم، احذف كل البيانات</button></>}>
        <p className="text-sm text-white/80 leading-relaxed">
          هل أنت متأكد من مسح كافة سجلات الأوردرات وشئون الموظفين من المتصفح؟
          <br /><br />
          <span className="text-danger font-bold">هذا الإجراء لا رجعة فيه التاتاً.</span> ستفقد جميع حساباتك السابقة.
        </p>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Settings
