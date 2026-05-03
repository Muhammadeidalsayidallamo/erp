import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt, n } from '../../utils/calculations'
import type { ClothingOrder } from '../../store/useOrdersStore'

const QRCode = (QRCodeModule as any).default || QRCodeModule

// ─── Product type map ─────────────────────────────────────────────────────────
const productTypeLabel: Record<string, string> = {
  tshirt: 'تيشيرت', pants: 'بنطلون', jacket: 'جاكيت',
  dress: 'فستان', shirt: 'قميص', other: 'أخرى',
}

const statusLabel: Record<string, string> = {
  pending: 'جديد', processing: 'تحت التنفيذ',
  delivered: 'مكتمل', canceled: 'ملغي',
}

const statusColor: Record<string, string> = {
  pending: '#6b7280',
  processing: '#d97706',
  delivered: '#16a34a',
  canceled: '#dc2626',
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ClothingOrderPrintProps {
  order: ClothingOrder
  clientName?: string
  currency: string
}

export interface ClothingListPrintProps {
  orders: ClothingOrder[]
  clients: Array<{ id: string; name: string }>
  currency: string
  filterLabel?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SINGLE ORDER INVOICE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
export const ClothingOrderTemplate = React.forwardRef<HTMLDivElement, ClothingOrderPrintProps>(
  ({ order, clientName, currency }, ref) => {
    const { settings } = useSettingsStore()

    const totalCost        = n(order.totalOrderCost)
    const paid             = n(order.paidAmount)
    const remaining        = totalCost - paid
    const wholesaleTotal   = n(order.wholesalePrice) * n(order.totalPieces)
    const suggestedRevenue = wholesaleTotal || totalCost
    const netProfit        = n(order.netProfit)

    const costRows = [
      { label: '🧵 تكلفة الخامة والقماش',              val: n(order.fabricCostPerPiece)     * n(order.totalPieces) },
      { label: '🪡 تكلفة الخيوط والإكسسوار',            val: n(order.accessoriesCostPerPiece) * n(order.totalPieces) },
      { label: '👷 تكلفة العمالة (قص · خياطة · تشطيب)', val: n(order.laborCostPerPiece)       * n(order.totalPieces) },
      { label: '⚙️ تكلفة الماكينات',                    val: n(order.machineCostPerPiece)     * n(order.totalPieces) },
      { label: '⚡ تكلفة الطاقة والكهرباء',              val: n(order.energyCostPerPiece)      * n(order.totalPieces) },
      { label: '🏢 التكاليف الثابتة والإدارية',           val: n(order.fixedCostPerPiece)       * n(order.totalPieces) },
    ].filter(r => r.val > 0)

    const priceRows = [
      { label: 'تكلفة القطعة',          val: `${fmt(order.totalCostPerPiece || 0)} ${currency}` },
      { label: 'سعر البيع بالجملة',      val: `${fmt(order.wholesalePrice    || 0)} ${currency}` },
      { label: 'سعر البيع بالتجزئة',     val: `${fmt(order.retailPrice       || 0)} ${currency}` },
      { label: 'نقطة التعادل (Break Even)', val: `${order.breakEvenUnits || 0} قطعة` },
    ]

    const status = order.status || 'pending'

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          fontFamily: "'Cairo', 'Arial', sans-serif",
          background: '#ffffff',
          color: '#1e293b',
          padding: '36px 48px',
          minHeight: '297mm',
          width: '210mm',
          boxSizing: 'border-box',
        }}
        className="print-only"
      >
        {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #0f172a', paddingBottom: '24px', marginBottom: '28px' }}>
          {/* Company */}
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {settings.companyName || 'ProTex ERP'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
              ورشة ومصنع الملابس
            </div>
            {settings.companyAddress && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{settings.companyAddress}</div>
            )}
            {settings.companyPhone && (
              <div style={{ fontSize: '11px', color: '#94a3b8' }} dir="ltr">{settings.companyPhone}</div>
            )}
          </div>

          {/* Order Badge + QR */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', textAlign: 'left' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>فاتورة أوردر ملابس</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{order.orderNumber}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{order.date}</div>
              <div style={{
                display: 'inline-block', marginTop: '8px', padding: '3px 10px', borderRadius: '20px',
                fontSize: '11px', fontWeight: 700, color: '#fff',
                background: statusColor[status] || '#6b7280'
              }}>
                {statusLabel[status] || status}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
              <QRCode
                value={`ORDER:${order.orderNumber}|TOTAL:${totalCost}|REM:${remaining}|DATE:${order.date}`}
                size={72}
                level="M"
              />
            </div>
          </div>
        </div>

        {/* ── CLIENT + PRODUCT INFO ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          {/* Client */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>العميل / المصنع</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{clientName || order.factoryName || 'عميل نقدي'}</div>
          </div>
          {/* Product */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>تفاصيل المنتج</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
              {productTypeLabel[order.productType] || order.productType}
            </div>
            {order.fabricType && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>خامة: {order.fabricType}</div>
            )}
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {order.isCMT ? 'تصنيع للغير (مصنعية)' : 'تصنيع شامل'}
            </div>
          </div>
          {/* Quantities */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>الإنتاج</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{order.totalPieces} <span style={{ fontSize: '12px', fontWeight: 600 }}>قطعة</span></div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>مدة التنفيذ: {order.orderDays || 1} يوم</div>
          </div>
        </div>

        {/* ── COST BREAKDOWN TABLE ────────────────────────────────────────────── */}
        {costRows.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #0f172a' }}>
              تفاصيل تكاليف الأوردر
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, borderRadius: '4px 0 0 4px' }}>البند / المكون</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, borderRadius: '0 4px 4px 0', width: '180px' }}>التكلفة الإجمالية ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>{row.label}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', textAlign: 'left' }}>{fmt(row.val)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: '#0f172a', color: '#fff' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: '13px' }}>إجمالي تكلفة الأوردر</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 900, fontSize: '15px', textAlign: 'left' }}>{fmt(totalCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── PRICING INDICATORS ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {priceRows.map((r, i) => (
            <div key={i} style={{ background: i === 1 ? '#fffbeb' : '#f8fafc', border: `1px solid ${i === 1 ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '1px' }}>{r.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: i === 1 ? '#d97706' : '#0f172a', fontFamily: 'monospace' }}>{r.val}</div>
            </div>
          ))}
        </div>

        {/* ── FINANCIAL SUMMARY ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
          <div style={{ width: '320px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>إجمالي الأوردر:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px' }}>{fmt(totalCost)} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>المدفوع (عربون):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>{fmt(paid)} {currency}</span>
            </div>
            {netProfit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>الربح الصافي:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>{fmt(netProfit)} {currency}</span>
              </div>
            )}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '10px 0' }} />
            <div style={{
              background: '#0f172a', color: '#fff', borderRadius: '10px',
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '4px solid #d97706'
            }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>المتبقي للسداد:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '20px', color: '#fbbf24' }}>
                {fmt(remaining)} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            <p>توقيع المدير المسؤول: __________________________</p>
            <p style={{ marginTop: '6px' }}>توقيع العميل: __________________________</p>
          </div>
          <div style={{ textAlign: 'center', width: '90px', height: '90px', border: '2px dashed #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '10px' }}>
            ختم الورشة
          </div>
          <div style={{ textAlign: 'left', fontSize: '10px', color: '#94a3b8' }}>
            <p>صدر بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p style={{ marginTop: '4px' }}>ProTex ERP · ورشة الملابس</p>
          </div>
        </div>
      </div>
    )
  }
)
ClothingOrderTemplate.displayName = 'ClothingOrderTemplate'


// ═══════════════════════════════════════════════════════════════════════════════
//  LIST REPORT TEMPLATE  (كشف تفصيلي بالأوردرات)
// ═══════════════════════════════════════════════════════════════════════════════
export const ClothingListTemplate = React.forwardRef<HTMLDivElement, ClothingListPrintProps>(
  ({ orders, clients, currency, filterLabel }, ref) => {
    const { settings } = useSettingsStore()

    const getClient = (id: string) => clients.find(c => c.id === id)

    const totalOrderCost = orders.reduce((s, o) => s + n(o.totalOrderCost), 0)
    const totalPaid      = orders.reduce((s, o) => s + n(o.paidAmount), 0)
    const totalRemaining = orders.reduce((s, o) => s + (n(o.totalOrderCost) - n(o.paidAmount)), 0)

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          fontFamily: "'Cairo', 'Arial', sans-serif",
          background: '#ffffff',
          color: '#1e293b',
          padding: '36px 48px',
          boxSizing: 'border-box',
        }}
        className="print-only"
      >
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
              {settings.companyName || 'ProTex ERP'}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>
              كشف تفصيلي · ورش ومصانع الملابس
            </div>
            {filterLabel && (
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>فلتر: {filterLabel}</div>
            )}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>تاريخ التقرير</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{new Date().toLocaleDateString('ar-EG')}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{orders.length} أوردر</div>
          </div>
        </div>

        {/* ── SUMMARY CARDS ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'إجمالي قيمة الأوردرات', val: fmt(totalOrderCost), color: '#0f172a' },
            { label: 'إجمالي المدفوع',          val: fmt(totalPaid),      color: '#16a34a' },
            { label: 'إجمالي المتبقي',           val: fmt(totalRemaining), color: '#dc2626' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>{c.val}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{currency}</div>
            </div>
          ))}
        </div>

        {/* ── TABLE ──────────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>رقم الأوردر</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>العميل / المصنع</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>المنتج</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>التاريخ</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>القطع</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>الحالة</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>الإجمالي</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>المدفوع</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => {
              const client = getClient(o.clientId || '')
              const rem    = n(o.totalOrderCost) - n(o.paidAmount)
              const status = o.status || 'pending'
              return (
                <tr key={o.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 800, color: '#0f172a' }}>{o.orderNumber}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700 }}>{client?.name || o.factoryName || '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{productTypeLabel[o.productType] || o.productType}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{o.date}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700 }}>{o.totalPieces}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
                      fontSize: '10px', fontWeight: 700, color: '#fff',
                      background: statusColor[status] || '#6b7280'
                    }}>
                      {statusLabel[status] || status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, textAlign: 'left' }}>{fmt(o.totalOrderCost)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', textAlign: 'left' }}>{fmt(o.paidAmount || 0)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 800, color: rem > 0 ? '#dc2626' : '#16a34a', textAlign: 'left' }}>
                    {fmt(rem)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#0f172a', color: '#fff', fontWeight: 900 }}>
              <td colSpan={7} style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800 }}>
                الإجماليات الكلية ({orders.length} أوردر)
              </td>
              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '13px', textAlign: 'left' }}>{fmt(totalOrderCost)}</td>
              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '13px', color: '#4ade80', textAlign: 'left' }}>{fmt(totalPaid)}</td>
              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '14px', color: '#fbbf24', textAlign: 'left' }}>{fmt(totalRemaining)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ── SIGNATURES ─────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            <p>توقيع المدير المسؤول: __________________________</p>
            <p style={{ marginTop: '8px' }}>توقيع المحاسب: __________________________</p>
          </div>
          <div style={{ textAlign: 'left', fontSize: '10px', color: '#94a3b8' }}>
            <p>صدر بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p style={{ marginTop: '4px' }}>ProTex ERP · تقرير ورشة الملابس</p>
          </div>
        </div>
      </div>
    )
  }
)
ClothingListTemplate.displayName = 'ClothingListTemplate'
