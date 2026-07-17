import { C, ui, mono } from './tokens.js'

const stop = (e) => e.stopPropagation()

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ ...mono(700, 32, C.mint) }}>{value}</div>
      <div style={{ ...ui(400, 12, 'rgba(233,230,219,0.5)'), marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function Cover({ current, stats, selected, setSel, actions }) {
  return (
    <div onClick={(e) => { stop(e); setSel({ kind: 'cover' }) }} style={{
      background: C.deep, borderRadius: 8, position: 'relative', overflow: 'hidden',
      padding: '44px 46px', marginBottom: 22, cursor: 'pointer',
      border: selected ? `2px solid ${C.mint}` : '2px solid transparent',
    }}>
      <div style={{ position: 'absolute', right: -40, bottom: -80, fontWeight: 900, fontSize: 440, color: 'rgba(143,211,188,0.08)', lineHeight: 1, pointerEvents: 'none', fontFamily: 'var(--ui)' }}>α</div>
      <div style={{ position: 'relative' }}>
        <div style={{ ...mono(700, 12, C.mint), letterSpacing: '0.12em' }}>КАТАЛОГ ПРОДУКЦИИ · 2026</div>
        <input value={current.name} onChange={(e) => actions.renameCatalog(e.target.value)} onClick={stop}
          style={{ display: 'block', background: 'none', border: 'none', marginTop: 16, width: '100%', maxWidth: 560, padding: 0, ...ui(900, 40, C.warm) }} />
        <textarea value={current.desc} onChange={(e) => actions.setCoverDesc(e.target.value)} onClick={stop} rows={2}
          style={{ display: 'block', background: 'none', border: 'none', resize: 'none', marginTop: 14, width: '100%', maxWidth: 460, padding: 0, ...ui(400, 15, 'rgba(233,230,219,0.65)'), lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 40, marginTop: 30 }}>
          <Stat value={stats.items} label="товаров" />
          <Stat value={stats.cats} label="разделов" />
          <Stat value={stats.suppliers} label="поставщиков" />
        </div>
      </div>
    </div>
  )
}
