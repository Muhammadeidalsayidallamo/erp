import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt, n } from '../../utils/calculations'
import type { ProductionModel } from '../../store/useProductionStore'

const QRCode = (QRCodeModule as any).default || QRCodeModule

export interface OperationsBulletinPrintProps {
  model: ProductionModel
  workHoursPerDay: number
}

export const OperationsBulletinTemplate = React.forwardRef<HTMLDivElement, OperationsBulletinPrintProps>(
  ({ model, workHoursPerDay }, ref) => {
    const { settings } = useSettingsStore()

    const totalSecondsPerDay = workHoursPerDay * 3600
    const totalTimeSec   = model.stages.reduce((s, st) => s + st.timeMinutes * 60 + st.timeSeconds, 0)
    const totalPiastres  = model.stages.reduce((s, st) => s + st.pricePiastres, 0)
    const totalPriceEGP  = totalPiastres / 100
    const totalWorkerPay = model.stages.reduce((s, st) => s + n(st.stageQuantity) * (st.pricePiastres / 100), 0)
    const avgDailyProd   = totalTimeSec > 0 ? Math.floor(totalSecondsPerDay / totalTimeSec) : 0
    const timeStr        = `${Math.floor(totalTimeSec / 60)} د ${totalTimeSec % 60} ث`

    // Machine type usage
    const machineCount: Record<string, number> = {}
    model.stages.forEach(s => { machineCount[s.machineType] = (machineCount[s.machineType] || 0) + 1 })

    return (
      <div
        ref={ref}
        dir="rtl"
        className="print-only"
        style={{ fontFamily: "'Cairo','Arial',sans-serif", background: '#fff', color: '#1e293b', padding: '32px 44px', boxSizing: 'border-box' }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #0f172a', paddingBottom: '20px', marginBottom: '22px' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{settings.companyName || 'ProTex ERP'}</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
              مخطط العمليات الذكي · بيان المراحل والأجور
            </div>
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', textAlign: 'left' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>رقم الموديل</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{model.modelNumber}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{model.modelType}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
              <QRCode value={`MODEL:${model.modelNumber}|TYPE:${model.modelType}|PRICE:${totalPriceEGP}|TIME:${timeStr}`} size={64} level="M" />
            </div>
          </div>
        </div>

        {/* MODEL INFO + KPI ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '22px' }}>
          {[
            { label: 'نوع الموديل', val: model.modelType, color: '#0f172a' },
            { label: 'العميل', val: model.clientName || '—', color: '#0f172a' },
            { label: 'وقت الموديل الكلي', val: timeStr, color: '#1d4ed8' },
            { label: 'الإنتاج اليومي المتوقع', val: `${avgDailyProd} قطعة`, color: '#16a34a' },
            { label: 'إجمالي الأجر / قطعة', val: `${fmt(totalPriceEGP)} ج`, color: '#d97706' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '1px' }}>{c.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* STAGES TABLE */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #0f172a' }}>
            بيان مراحل التشغيل التفصيلي
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, width: '32px' }}>م</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>اسم المرحلة</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>الصنايعي</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>الماكينة</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#1e3a5f' }}>الوقت (د:ث)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#1e3a5f' }}>إنتاج/يوم</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#7c3105', color: '#fcd34d' }}>بالقرش</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#064e3b', color: '#6ee7b7' }}>بالجنيه</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#1e3a5f', color: '#93c5fd' }}>الكمية</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, background: '#312e81', color: '#c7d2fe' }}>حساب الصنايعي</th>
              </tr>
            </thead>
            <tbody>
              {model.stages.map((stage, idx) => {
                const totalSec  = stage.timeMinutes * 60 + stage.timeSeconds
                const dailyProd = totalSec > 0 ? Math.floor(totalSecondsPerDay / totalSec) : 0
                const priceEGP  = stage.pricePiastres / 100
                const workerPay = n(stage.stageQuantity) * priceEGP
                return (
                  <tr key={stage.id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>{stage.name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#1d4ed8', fontWeight: 600 }}>{stage.workerName || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 700 }}>
                        {stage.machineType}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                      {stage.timeMinutes}:{String(stage.timeSeconds).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, background: '#eff6ff', color: '#16a34a' }}>
                      {dailyProd || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, background: '#fffbeb', color: '#d97706' }}>
                      {stage.pricePiastres || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, background: '#f0fdf4', color: '#16a34a' }}>
                      {fmt(priceEGP)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                      {n(stage.stageQuantity) || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, background: '#eef2ff', color: '#4f46e5', fontSize: '12px' }}>
                      {workerPay > 0 ? `${fmt(workerPay)} ج` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f172a', color: '#fff', fontWeight: 900 }}>
                <td colSpan={4} style={{ padding: '12px 12px', fontWeight: 800, fontSize: '12px' }}>الإجمالي ({model.stages.length} مرحلة)</td>
                <td style={{ padding: '12px 10px', textAlign: 'center', background: '#1e3a5f', fontFamily: 'monospace' }}>{timeStr}</td>
                <td style={{ padding: '12px 10px', textAlign: 'center', background: '#1e3a5f', color: '#4ade80', fontFamily: 'monospace' }}>{avgDailyProd} ق/يوم</td>
                <td style={{ padding: '12px 10px', textAlign: 'center', background: '#7c3105', color: '#fcd34d', fontFamily: 'monospace', fontSize: '13px' }}>{fmt(totalPiastres, 0)} ق</td>
                <td style={{ padding: '12px 10px', textAlign: 'center', background: '#064e3b', color: '#6ee7b7', fontFamily: 'monospace', fontSize: '14px' }}>{fmt(totalPriceEGP)} ج</td>
                <td style={{ padding: '12px 10px', background: '#1e3a5f' }}></td>
                <td style={{ padding: '12px 10px', textAlign: 'center', background: '#312e81', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '14px' }}>{fmt(totalWorkerPay)} ج</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* MACHINE SUMMARY */}
        {Object.keys(machineCount).length > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>ملخص الماكينات المستخدمة</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(machineCount).map(([machine, count]) => (
                <div key={machine} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px' }}>{machine}</span>
                  <span style={{ background: '#0f172a', color: '#fff', borderRadius: '20px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTIVITY NOTE */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>ملاحظات الإنتاجية</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', fontSize: '11px' }}>
            <div><span style={{ color: '#64748b' }}>وقت تشغيل الموديل: </span><strong style={{ color: '#0f172a' }}>{timeStr}</strong></div>
            <div><span style={{ color: '#64748b' }}>ساعات العمل اليومية: </span><strong style={{ color: '#0f172a' }}>{workHoursPerDay} ساعة</strong></div>
            <div><span style={{ color: '#64748b' }}>الطاقة الإنتاجية اليومية: </span><strong style={{ color: '#16a34a' }}>{avgDailyProd} قطعة / يوم</strong></div>
            <div><span style={{ color: '#64748b' }}>التكلفة بالقروش: </span><strong style={{ color: '#d97706' }}>{fmt(totalPiastres, 0)} قرش</strong></div>
            <div><span style={{ color: '#64748b' }}>التكلفة بالجنيه: </span><strong style={{ color: '#16a34a' }}>{fmt(totalPriceEGP)} ج.م</strong></div>
            <div><span style={{ color: '#64748b' }}>إجمالي حساب الصنايعية: </span><strong style={{ color: '#4f46e5' }}>{fmt(totalWorkerPay)} ج.م</strong></div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            <p>توقيع مدير الإنتاج: __________________________</p>
            <p style={{ marginTop: '6px' }}>توقيع المحاسب: __________________________</p>
          </div>
          <div style={{ textAlign: 'left', fontSize: '10px', color: '#94a3b8' }}>
            <p>صدر بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p style={{ marginTop: '3px' }}>ProTex ERP · مخطط العمليات</p>
          </div>
        </div>
      </div>
    )
  }
)
OperationsBulletinTemplate.displayName = 'OperationsBulletinTemplate'
