import React from 'react'
import QRCodeModule from 'react-qr-code'
import { useSettingsStore } from '../../store/useSettingsStore'
import { fmt, n } from '../../utils/calculations'
import type { Pieceworker, ProductionTicket, PieceworkerAdvance, PieceworkerPayment } from '../../store/usePieceworkersStore'

const QRCode = (QRCodeModule as any).default || QRCodeModule

export interface PieceworkerStatementProps {
  worker: Pieceworker
  tickets: ProductionTicket[]
  advances: PieceworkerAdvance[]
  payments: PieceworkerPayment[]
}

export const PieceworkerStatementTemplate = React.forwardRef<HTMLDivElement, PieceworkerStatementProps>(
  ({ worker, tickets, advances, payments }, ref) => {
    const { settings } = useSettingsStore()

    const totalEarned   = tickets.reduce((s, t) => s + t.totalAmount, 0)
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0)
    const totalPaid     = payments.reduce((s, p) => s + p.amount, 0)
    const balance       = totalEarned - totalAdvances - totalPaid

    // Merge & sort all transactions by date desc
    type Row = { id: string; date: string; kind: 'ticket' | 'advance' | 'payment'; label: string; sub?: string; credit: number; debit: number }
    const rows: Row[] = [
      ...tickets.map(t => ({
        id: t.id, date: t.date, kind: 'ticket' as const,
        label: `إنتاج: ${t.modelName}`,
        sub: t.type === 'stage' ? `مرحلة: ${t.stageName}` : `${t.quantity} قطعة × ${fmt(t.pricePerPiece)} ج`,
        credit: t.totalAmount, debit: 0
      })),
      ...advances.map(a => ({
        id: a.id, date: a.date, kind: 'advance' as const,
        label: `سلفة نقدية`,
        sub: a.notes || undefined,
        credit: 0, debit: a.amount
      })),
      ...payments.map(p => ({
        id: p.id, date: p.date, kind: 'payment' as const,
        label: `صرف / تصفية`,
        sub: p.notes || undefined,
        credit: 0, debit: p.amount
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const kindColor = { ticket: '#16a34a', advance: '#dc2626', payment: '#d97706' }
    const kindLabel = { ticket: 'إنتاج', advance: 'سلفة', payment: 'تصفية' }

    return (
      <div
        ref={ref}
        dir="rtl"
        className="print-only"
        style={{ fontFamily: "'Cairo','Arial',sans-serif", background: '#fff', color: '#1e293b', padding: '36px 48px', boxSizing: 'border-box' }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{settings.companyName || 'ProTex ERP'}</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
              كشف حساب صنايعي — ورشة الملابس
            </div>
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', textAlign: 'left' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>تاريخ الكشف</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{new Date().toLocaleDateString('ar-EG')}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
              <QRCode value={`WORKER:${worker.name}|BAL:${balance}|DATE:${new Date().toISOString().slice(0,10)}`} size={64} level="M" />
            </div>
          </div>
        </div>

        {/* WORKER INFO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'اسم الصنايعي', val: worker.name, big: true },
            { label: 'الوظيفة / التخصص', val: worker.role },
            { label: 'رقم الموبايل', val: worker.phone || '—' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>{c.label}</div>
              <div style={{ fontSize: c.big ? '18px' : '14px', fontWeight: 800, color: '#0f172a' }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'إجمالي الإنتاج', val: fmt(totalEarned), color: '#16a34a', bg: '#f0fdf4' },
            { label: 'إجمالي السلف', val: fmt(totalAdvances), color: '#dc2626', bg: '#fef2f2' },
            { label: 'إجمالي المصروف', val: fmt(totalPaid), color: '#d97706', bg: '#fffbeb' },
            { label: 'الرصيد المستحق', val: fmt(balance), color: balance > 0 ? '#1d4ed8' : '#6b7280', bg: balance > 0 ? '#eff6ff' : '#f8fafc' },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>{c.val}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>ج.م</div>
            </div>
          ))}
        </div>

        {/* TRANSACTIONS TABLE */}
        <div style={{ marginBottom: '24px', fontSize: '11px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #0f172a' }}>
            كشف الحساب التفصيلي
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>التاريخ</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>البيان</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, width: '80px' }}>النوع</th>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#4ade80' }}>دائن (له) ج.م</th>
                <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#f87171' }}>مدين (عليه) ج.م</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748b' }}>{r.date}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.label}</div>
                    {r.sub && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{r.sub}</div>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, color: '#fff', background: kindColor[r.kind] }}>
                      {kindLabel[r.kind]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', textAlign: 'left' }}>
                    {r.credit > 0 ? fmt(r.credit) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626', textAlign: 'left' }}>
                    {r.debit > 0 ? fmt(r.debit) : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>لا توجد حركات مسجلة</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f172a', color: '#fff', fontWeight: 900 }}>
                <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px' }}>الإجماليات</td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '14px', color: '#4ade80', textAlign: 'left' }}>{fmt(totalEarned)}</td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '14px', color: '#f87171', textAlign: 'left' }}>{fmt(totalAdvances + totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* FINAL BALANCE BOX */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
          <div style={{ width: '300px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
            {[
              { label: 'إجمالي الإنتاج المستحق:', val: fmt(totalEarned), color: '#16a34a' },
              { label: 'إجمالي السلف المخصومة:', val: `- ${fmt(totalAdvances)}`, color: '#dc2626' },
              { label: 'إجمالي المبالغ المصروفة:', val: `- ${fmt(totalPaid)}`, color: '#d97706' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px' }}>{r.label}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }}>{r.val}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '10px 0' }} />
            <div style={{ background: '#0f172a', color: '#fff', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #d97706' }}>
              <span style={{ fontWeight: 700 }}>الرصيد المستحق الآن:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '20px', color: '#fbbf24' }}>{fmt(balance)} ج.م</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            <p>توقيع الصنايعي: __________________________</p>
            <p style={{ marginTop: '6px' }}>توقيع المشرف المسؤول: __________________________</p>
          </div>
          <div style={{ textAlign: 'left', fontSize: '10px', color: '#94a3b8' }}>
            <p>صدر بتاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p style={{ marginTop: '3px' }}>ProTex ERP · كشوف العمالة</p>
          </div>
        </div>
      </div>
    )
  }
)
PieceworkerStatementTemplate.displayName = 'PieceworkerStatementTemplate'
