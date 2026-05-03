import React, { useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import { Plus, Trash2, Image as ImageIcon, Upload, Printer, FileText, ChevronDown, Save, Calculator, Settings2, Clock, TrendingUp, DollarSign } from 'lucide-react'
import { useProductionStore, type MachineType } from '../store/useProductionStore'
import { PageHeader, Card, MetricCard } from '../components/ui'
import { useSettingsStore } from '../store/useSettingsStore'
import { fmt, n } from '../utils/calculations'
import { OperationsBulletinTemplate } from '../components/ui/OperationsBulletinTemplate'

const MACHINE_TYPES: MachineType[] = ['سنجر', 'أوفر 4', 'أوفر 5', 'أورليه', 'عراوي', 'زراير', 'مكواة', 'مقص', 'يدوي']

export const OperationsBulletin: React.FC = () => {
  const { 
    models, activeModelId, setActiveModel, addModel, updateModel, 
    deleteModel, addStage, updateStage, removeStage 
  } = useProductionStore()
  
  const { settings } = useSettingsStore()
  const workHours = settings.workHoursPerDay || 8
  const totalSecondsPerDay = workHours * 60 * 60

  const activeModel = models.find(m => m.id === activeModelId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const printRef    = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNewModel = () => {
    const id = addModel({
      modelNumber: `MOD-${new Date().getFullYear()}-${String(models.length + 1).padStart(3, '0')}`,
      modelType: 'بنطلون',
    })
    setActiveModel(id)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeModelId) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateModel(activeModelId, { sketchImage: ev.target.result as string })
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Calculations ─────────────────────────────────────────────────────────
  const { totalTimeSec, totalPricePiastres } = useMemo(() => {
    if (!activeModel) return { totalTimeSec: 0, totalPricePiastres: 0 }
    let sec = 0
    let piasters = 0
    activeModel.stages.forEach(s => {
      sec += (s.timeMinutes * 60) + s.timeSeconds
      piasters += s.pricePiastres
    })
    return { totalTimeSec: sec, totalPricePiastres: piasters }
  }, [activeModel])

  const totalTimeStr = `${Math.floor(totalTimeSec / 60)}د ${totalTimeSec % 60}ث`
  const totalPriceEGP = totalPricePiastres / 100
  const stageCount = activeModel?.stages.length || 1
  const avgProduction = totalTimeSec > 0 ? Math.floor(totalSecondsPerDay / (totalTimeSec / stageCount)) : 0

  return (
    <div className="space-y-5">
      {/* Hidden print template */}
      <div style={{ display: 'none' }}>
        {activeModel && (
          <OperationsBulletinTemplate
            ref={printRef}
            model={activeModel}
            workHoursPerDay={workHours}
          />
        )}
      </div>

      <PageHeader
        title="مخطط العمليات الذكي وأجور الإنتاج"
        subtitle="حساب دقيق لأوقات التشغيل والإنتاجية بتسعير القروش"
        icon={<Settings2 size={24} />}
        actions={
          <div className="flex items-center gap-2">
            {activeModel && (
              <button className="btn-ghost text-xs" onClick={() => handlePrint()}>
                <Printer size={14} /> طباعة مخطط العمليات
              </button>
            )}
            <select 
              value={activeModelId || ''} 
              onChange={e => setActiveModel(e.target.value || null)}
              className="bg-[#1a2540] text-white border border-white/10 rounded-lg px-3 py-2 outline-none text-sm min-w-[200px]"
            >
              <option value="">―― اختر الموديل ――</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.modelNumber} - {m.modelType}</option>
              ))}
            </select>
            <button onClick={handleNewModel} className="btn-gold text-xs px-4">
              <Plus size={14} /> موديل جديد
            </button>
          </div>
        }
      />

      {activeModel ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* ── Left Column: Model Info & Sketch ── */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <FileText className="text-gold" size={18} />
                <h3 className="font-bold text-sm text-white">بيانات الموديل</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">رقم الموديل</label>
                  <input type="text" value={activeModel.modelNumber} onChange={e => updateModel(activeModel.id, { modelNumber: e.target.value })}
                    className="w-full bg-[#0a101d] border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-gold outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">نوع الموديل</label>
                  <input type="text" value={activeModel.modelType} onChange={e => updateModel(activeModel.id, { modelType: e.target.value })}
                    className="w-full bg-[#0a101d] border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-gold outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">العميل</label>
                  <input type="text" value={activeModel.clientName} onChange={e => updateModel(activeModel.id, { clientName: e.target.value })}
                    className="w-full bg-[#0a101d] border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-gold outline-none" />
                </div>
              </div>
            </Card>

            <Card className="p-4 flex flex-col items-center justify-center min-h-[300px] border-dashed border-2 border-white/10 hover:border-gold/30 transition-colors relative group overflow-hidden">
              {activeModel.sketchImage ? (
                <>
                  <img src={activeModel.sketchImage} alt="Sketch" className="w-full h-full object-contain opacity-80" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md">
                      <Upload className="text-white" size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon className="text-white/20" size={30} />
                  </div>
                  <p className="text-sm font-bold text-white/60">إضافة سكتش الموديل</p>
                  <p className="text-[10px] text-white/30 mt-1">اضغط لرفع صورة المواصفات الفنية</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </Card>
          </div>

          {/* ── Right Column: Operations Matrix ── */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Matrix KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="إجمالي وقت الموديل" value={totalTimeStr} icon={<Clock size={16} className="text-blue-400"/>} iconBg="bg-blue-500/10" />
              <MetricCard label="متوسط الإنتاج اليومي" value={`${avgProduction} قطعة`} subValue={`${workHours} ساعات عمل`} icon={<TrendingUp size={16} className="text-emerald-400"/>} iconBg="bg-emerald-500/10" />
              <MetricCard label="التكلفة بالقروش" value={`${fmt(totalPricePiastres, 0)} قرش`} icon={<Calculator size={16} className="text-amber-400"/>} iconBg="bg-amber-500/10" />
              <MetricCard label="إجمالي تكلفة الموديل" value={`${fmt(totalPriceEGP, 2)} جنيه`} icon={<DollarSign size={16} className="text-gold"/>} iconBg="bg-gold/10" variant="gold"/>
            </div>

            {/* Stages Table */}
            <Card className="overflow-hidden p-0">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0a1220]">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Settings2 size={16} className="text-gold"/> بيان مراحل ووقت الموديل
                </h3>
                <button onClick={() => addStage(activeModel.id)} className="btn-gold py-1.5 px-3 text-xs">
                  <Plus size={13} /> إضافة مرحلة
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-[#050a15] border-b border-white/10">
                    <tr>
                      <th className="px-3 py-3 font-black text-white/30 w-10 text-center text-xs">م</th>
                      <th className="px-3 py-3 font-bold text-white/50 text-xs w-32">الصنايعي</th>
                      <th className="px-3 py-3 font-bold text-white/50 text-xs">اسم المرحلة</th>
                      <th className="px-3 py-3 font-bold text-white/50 text-xs w-28">نوع الماكينة</th>
                      <th className="px-3 py-3 font-bold text-white/50 text-xs w-24 text-center">الوقت (د:ث)</th>
                      <th className="px-3 py-3 font-bold text-white/50 text-xs w-28 text-center border-l border-r border-white/5 bg-white/[0.01]">إنتاجية اليوم</th>
                      <th className="px-3 py-3 font-bold text-amber-500/60 text-xs w-24 text-center bg-amber-500/5">بالقرش</th>
                      <th className="px-3 py-3 font-bold text-emerald-500/60 text-xs w-24 text-center bg-emerald-500/5">بالجنيه</th>
                      <th className="px-3 py-3 font-bold text-blue-500/60 text-xs w-20 text-center bg-blue-500/5">الكمية</th>
                      <th className="px-3 py-3 font-bold text-indigo-500/60 text-xs w-28 text-center bg-indigo-500/5">حساب الصنايعي</th>
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeModel.stages.map((stage, idx) => {
                      const totalSec = (stage.timeMinutes * 60) + stage.timeSeconds
                      const dailyProd = totalSec > 0 ? Math.floor(totalSecondsPerDay / totalSec) : 0
                      const priceEgp = stage.pricePiastres / 100

                      return (
                        <tr key={stage.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="px-3 py-2 text-center text-white/30 font-black text-xs">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <input type="text" value={stage.workerName || ''} placeholder="اسم الصنايعي..."
                              onChange={e => updateStage(activeModel.id, stage.id, { workerName: e.target.value })}
                              className="w-full bg-[#1a2540] text-blue-300 border border-white/10 rounded px-2 py-1.5 outline-none text-xs focus:border-blue-500" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={stage.name} placeholder="وصف المرحلة..."
                              onChange={e => updateStage(activeModel.id, stage.id, { name: e.target.value })}
                              className="w-full bg-transparent text-white border-b border-transparent focus:border-gold outline-none py-1 transition-colors" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={stage.machineType} 
                              onChange={e => updateStage(activeModel.id, stage.id, { machineType: e.target.value as MachineType })}
                              className="w-full bg-[#1a2540] text-white border border-white/10 rounded px-2 py-1.5 outline-none text-xs">
                              {MACHINE_TYPES.map(mt => <option key={mt} value={mt}>{mt}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 bg-[#1a2540] border border-white/10 rounded px-1">
                              <input type="number" min="0" value={stage.timeMinutes || ''} placeholder="د"
                                onChange={e => updateStage(activeModel.id, stage.id, { timeMinutes: +e.target.value })}
                                className="w-8 bg-transparent text-white text-center outline-none text-xs py-1.5 placeholder-white/20" />
                              <span className="text-white/30 text-[10px]">:</span>
                              <input type="number" min="0" max="59" value={stage.timeSeconds || ''} placeholder="ث"
                                onChange={e => updateStage(activeModel.id, stage.id, { timeSeconds: +e.target.value })}
                                className="w-8 bg-transparent text-white text-center outline-none text-xs py-1.5 placeholder-white/20" />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center border-l border-r border-white/5 bg-white/[0.01]">
                            <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded">
                              {dailyProd || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 bg-amber-500/5">
                            <div className="flex items-center relative">
                              <input type="number" min="0" value={stage.pricePiastres || ''} placeholder="0"
                                onChange={e => updateStage(activeModel.id, stage.id, { pricePiastres: +e.target.value })}
                                className="w-full bg-[#1a2540] border border-amber-500/30 focus:border-amber-500 text-amber-400 rounded px-2 py-1.5 text-center font-bold text-sm outline-none transition-colors" />
                            </div>
                          </td>
                          <td className="px-3 py-2 bg-emerald-500/5">
                            <input type="number" step="0.01" min="0" value={priceEgp || ''} placeholder="0.00"
                                onChange={e => updateStage(activeModel.id, stage.id, { pricePiastres: Math.round(+e.target.value * 100) })}
                                className="w-full bg-[#1a2540] border border-emerald-500/30 focus:border-emerald-500 text-emerald-400 rounded px-2 py-1.5 text-center font-bold text-sm outline-none transition-colors" />
                          </td>
                          <td className="px-3 py-2 bg-blue-500/5">
                             <input type="number" min="0" value={stage.stageQuantity || ''} placeholder="0"
                                onChange={e => updateStage(activeModel.id, stage.id, { stageQuantity: +e.target.value })}
                                className="w-full bg-[#1a2540] border border-blue-500/30 focus:border-blue-500 text-blue-300 rounded px-2 py-1.5 text-center font-bold text-sm outline-none transition-colors" />
                          </td>
                          <td className="px-3 py-2 text-center bg-indigo-500/5 font-black text-indigo-400 text-sm">
                            {fmt(n(stage.stageQuantity) * priceEgp)} <span className="text-[10px] text-white/30 font-normal">ج</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeStage(activeModel.id, stage.id)} className="text-white/20 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {activeModel.stages.length > 0 && (
                    <tfoot className="bg-[#050a15] border-t border-gold/20">
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-left text-gold font-black text-sm">الإجمالي</td>
                        <td className="px-3 py-4 text-center bg-amber-500/5 text-amber-400 font-black text-base">{fmt(totalPricePiastres, 0)} قرش</td>
                        <td className="px-3 py-4 text-center bg-emerald-500/5 text-emerald-400 font-black text-lg">{fmt(totalPriceEGP, 2)} ج</td>
                        <td className="px-3 py-4 bg-blue-500/5"></td>
                        <td className="px-3 py-4 text-center bg-indigo-500/5 text-indigo-400 font-black text-lg">
                          {fmt(activeModel.stages.reduce((s, st) => s + (n(st.stageQuantity) * (st.pricePiastres / 100)), 0))} ج
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              
              {activeModel.stages.length === 0 && (
                <div className="py-12 text-center text-white/30">
                  <Settings2 size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold">لم يتم إضافة أي مراحل بعد</p>
                  <p className="text-xs mt-1 opacity-50">اضغط على إضافة مرحلة للبدء في التسعير وحساب الإنتاجية</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="card p-14 text-center min-h-[50vh] flex flex-col items-center justify-center">
          <Settings2 size={48} className="text-gold opacity-50 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">مخطط العمليات الذكي</h2>
          <p className="text-white/40 max-w-md mx-auto mb-6">
            قم بإنشاء موديل جديد للبدء في تسعير المراحل التشغيلية وتحديد الإنتاجية اليومية لكل ماكينة بدقة متناهية.
          </p>
          <button onClick={handleNewModel} className="btn-gold px-6 py-2.5 text-sm">
            <Plus size={16} /> إنشاء أول موديل
          </button>
        </div>
      )}
    </div>
  )
}

export default OperationsBulletin
