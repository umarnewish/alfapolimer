import { C, ui, mono, tintFor, SHADOW } from './tokens.js'
import { formatPrice, monogram } from './format.js'

const A4 = { width: '100%', maxWidth: 794, aspectRatio: '210/297', position: 'relative', boxShadow: SHADOW.page }

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ ...mono(700, 32, C.mint) }}>{value}</div>
      <div style={{ ...ui(400, 12, 'rgba(233,230,219,0.5)') }}>{label}</div>
    </div>
  )
}

export default function PrintPreview({ current, stats, sections }) {
  const pageCount = sections.length + 1
  return (
    <div className="print-sheet" onClick={(e) => e.stopPropagation()} style={{
      background: '#3E4744', padding: '32px 24px 90px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
    }}>
      <div className="no-print" style={{ width: '100%', maxWidth: 794, ...mono(400, 11, 'rgba(255,255,255,0.5)') }}>
        Просмотр печати · A4 · {pageCount} стр. — то, что уйдёт в PDF
      </div>

      {/* cover page */}
      <div className="print-page" style={{ ...A4, background: C.deep, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, bottom: -90, fontWeight: 900, fontSize: 560, color: 'rgba(143,211,188,0.08)', lineHeight: 1, fontFamily: 'var(--ui)' }}>α</div>
        <div style={{ position: 'relative', padding: '58px 54px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...mono(700, 13, C.mint), letterSpacing: '0.12em' }}>КАТАЛОГ ПРОДУКЦИИ · 2026</div>
          <div style={{ ...ui(900, 42, C.warm), marginTop: 18, maxWidth: 480 }}>{current.name}</div>
          <div style={{ ...ui(400, 14, 'rgba(233,230,219,0.6)'), lineHeight: 1.6, marginTop: 16, maxWidth: 420 }}>{current.desc}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 40 }}>
            <Stat value={stats.items} label="товаров" />
            <Stat value={stats.cats} label="разделов" />
            <Stat value={stats.suppliers} label="поставщиков" />
          </div>
        </div>
      </div>

      {/* section pages */}
      {sections.map((sec, si) => (
        <div key={sec.catId} className="print-page" style={{ ...A4, background: C.paper }}>
          <div style={{ padding: '44px 44px 0' }}>
            <div style={{ ...mono(700, 12, C.brand), letterSpacing: '0.1em' }}>РАЗДЕЛ</div>
            <div style={{ ...ui(900, 30, C.deep), marginTop: 5 }}>{sec.title}</div>
            <div style={{ ...mono(400, 12, 'rgba(19,61,51,0.5)'), marginTop: 5 }}>{sec.count} позиций</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sec.columns},1fr)`, gap: 12, marginTop: 22 }}>
              {sec.items.map((it, i) => (
                <div key={it.id} style={{ background: '#fff', border: '1px solid rgba(19,61,51,0.1)' }}>
                  <div style={{ aspectRatio: '1/1', background: it.photo ? tintFor(i) : C.empty, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {it.photo
                      ? <img src={it.photo} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ ...ui(900, 20, C.brand), opacity: 0.5 }}>{monogram(it.name)}</span>}
                  </div>
                  <div style={{ padding: 8 }}>
                    <div style={{ ...mono(400, 9, 'rgba(19,61,51,0.4)') }}>№{it.code}</div>
                    <div style={{ ...ui(400, 10, C.deep), lineHeight: 1.3, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 26 }}>{it.name}</div>
                    <div style={{ ...mono(700, 12, C.brand), marginTop: 3 }}>{formatPrice(it.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 24, left: 44, right: 44, display: 'flex', justifyContent: 'space-between', ...mono(400, 10, 'rgba(19,61,51,0.4)'), borderTop: '1px solid rgba(19,61,51,0.1)', paddingTop: 10 }}>
            <span>ALPHA POLIMER LINE</span><span>Стр. {si + 2}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
