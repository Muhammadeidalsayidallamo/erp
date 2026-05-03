import React from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt } from '../../utils/calculations'
import type { InventoryItem } from '../../store/useInventoryStore'

export interface InventoryReportTemplateProps {
  items: InventoryItem[]
  reportNumber?: string
  filterLabel?: string
}

export const InventoryReportTemplate = React.forwardRef<HTMLDivElement, InventoryReportTemplateProps>(
  ({ items, reportNumber, filterLabel }, ref) => {
    const { settings } = useSettingsStore()
    const cur = settings.currencySymbol || 'ج.م'

    const now = new Date()
    const printDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    const printTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    const rn = reportNumber || `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

    const totalValue = items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0)
    const lowCount = items.filter(i => i.quantity <= i.minimumStock).length

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          fontFamily: "'Cairo', 'Arial', sans-serif",
          background: '#fff',
          color: '#000',
          padding: '24px 32px',
          fontSize: '12px',
          lineHeight: '1.6',
          maxWidth: '210mm',
          margin: '0 auto',
        }}
      >
        {/* ══ Header ══ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '3px solid #000',
          paddingBottom: '14px',
          marginBottom: '14px',
        }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {settings.companyName || 'ProTex ERP'}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>نظام إدارة موارد المصنع</div>
            {settings.companyAddress && (
              <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{settings.companyAddress}</div>
            )}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 900,
              border: '2px solid #000',
              padding: '6px 14px',
              borderRadius: '6px',
              marginBottom: '6px',
            }}>
              كشف المخزون
            </div>
            <div style={{ fontSize: '10px', color: '#444' }}>رقم التقرير: <strong>{rn}</strong></div>
            <div style={{ fontSize: '10px', color: '#444' }}>تاريخ الطباعة: <strong>{printDate}</strong></div>
            {filterLabel && filterLabel !== 'كل الأقسام' && (
              <div style={{ fontSize: '10px', color: '#444' }}>القسم: <strong>{filterLabel}</strong></div>
            )}
          </div>
        </div>

        {/* ══ Summary Row ══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'إجمالي الأصناف', value: String(items.length) },
            { label: 'إجمالي قيمة المخزون', value: `${fmt(totalValue, 0)} ${cur}` },
            { label: 'أصناف ناقصة (تنبيه)', value: String(lowCount) },
            { label: 'تاريخ التقرير', value: printDate },
          ].map((box, i) => (
            <div key={i} style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px 10px',
              background: i === 2 && lowCount > 0 ? '#f5f5f5' : '#fafafa',
            }}>
              <div style={{ fontSize: '9px', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>{box.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '2px' }}>{box.value}</div>
            </div>
          ))}
        </div>

        {/* ══ Table Title ══ */}
        <div style={{
          fontSize: '13px',
          fontWeight: 900,
          borderRight: '4px solid #000',
          paddingRight: '10px',
          marginBottom: '8px',
        }}>
          تفاصيل بنود المخزون
        </div>

        {/* ══ Main Table ══ */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
          marginBottom: '20px',
        }}>
          <thead>
            <tr style={{ background: '#222', color: '#fff' }}>
              {['م', 'اسم الصنف', 'القسم', 'الكمية المتاحة', 'الوحدة', 'متوسط التكلفة', 'الإجمالي', 'الحد الأدنى', 'الحالة'].map((h, i) => (
                <th key={i} style={{
                  padding: '7px 8px',
                  border: '1px solid #000',
                  fontWeight: 900,
                  textAlign: i === 0 ? 'center' : i >= 3 ? 'center' : 'right',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isLow = item.quantity <= item.minimumStock
              const rowBg = isLow ? '#fff3f3' : idx % 2 === 0 ? '#fff' : '#f7f7f7'
              const totalItemValue = item.quantity * item.costPerUnit
              return (
                <tr key={item.id} style={{ background: rowBg }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', color: '#555' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontWeight: 700 }}>{item.name}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', color: '#444', fontSize: '10px' }}>{item.category.split(' ')[0]}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', fontWeight: isLow ? 900 : 700, fontFamily: 'monospace' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', color: '#555' }}>{item.originalUnit}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', fontFamily: 'monospace' }}>
                    {fmt(item.costPerUnit, 2)}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 900, fontFamily: 'monospace' }}>
                    {fmt(totalItemValue, 0)} {cur}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', color: '#555' }}>{item.minimumStock}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center' }}>
                    <span style={{
                      border: `1px solid ${isLow ? '#c00' : '#090'}`,
                      color: isLow ? '#c00' : '#090',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontWeight: 900,
                      fontSize: '10px',
                    }}>
                      {isLow ? '⚠ نواقص' : '✓ آمن'}
                    </span>
                  </td>
                </tr>
              )
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#999', border: '1px solid #ccc' }}>
                  لا توجد بيانات مخزون للطباعة
                </td>
              </tr>
            )}

            {/* ══ Totals Row ══ */}
            {items.length > 0 && (
              <tr style={{ background: '#222', color: '#fff' }}>
                <td colSpan={6} style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 900, textAlign: 'right' }}>
                  الإجمالي الكلي للمخزون ({items.length} صنف)
                </td>
                <td colSpan={3} style={{ padding: '8px 10px', border: '1px solid #000', fontWeight: 900, textAlign: 'center', fontFamily: 'monospace', fontSize: '13px' }}>
                  {fmt(totalValue, 0)} {cur}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ══ Notes & Alerts ══ */}
        {lowCount > 0 && (
          <div style={{
            border: '1.5px solid #c00',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '16px',
            background: '#fff8f8',
          }}>
            <strong style={{ color: '#c00' }}>⚠️ تنبيه هام:</strong>
            <span style={{ color: '#333', marginRight: '8px' }}>
              يوجد {lowCount} صنف وصل لحد التنبيه (نواقص) — يرجى مراجعة وإصدار أوامر شراء عاجلة.
            </span>
          </div>
        )}

        {/* ══ Signatures ══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          borderTop: '2px solid #000',
          paddingTop: '20px',
          marginTop: '20px',
          textAlign: 'center',
        }}>
          {['أمين المخزن', 'المراجعة المحاسبية', 'اعتماد الإدارة'].map((label, i) => (
            <div key={i}>
              <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#555', marginBottom: '36px', letterSpacing: '1px' }}>{label}</div>
              <div style={{ borderBottom: '1.5px solid #999', marginBottom: '4px' }} />
              <div style={{ fontSize: '9px', color: '#aaa' }}>التوقيع / الاسم / التاريخ</div>
            </div>
          ))}
        </div>

        {/* ══ Footer ══ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '18px',
          paddingTop: '8px',
          borderTop: '1px solid #ddd',
          fontSize: '9px',
          color: '#888',
        }}>
          <span>صادر بتاريخ: {printDate} — {printTime}</span>
          <span style={{ fontWeight: 700 }}>نظام ProTex ERP — مستند رسمي معتمد</span>
          <span>رقم التقرير: {rn}</span>
        </div>
      </div>
    )
  }
)

InventoryReportTemplate.displayName = 'InventoryReportTemplate'
