import { useState } from 'react'
import { C, ui, mono, tintFor, SHADOW } from './tokens.js'
import { formatPrice, monogram } from './format.js'

const stop = (e) => e.stopPropagation()

function salesPct(sales, salesMax) {
  if (!salesMax) return 0
  return Math.min(100, Math.sqrt((sales || 0) / salesMax) * 100)
}

export default function ProductCard({
  p, idx, selected, rank, salesMax, fields,
  onSelect, onUp, onDown, onPhoto, onRemove,
  onDragStart, onDragOver, onDrop,
}) {
  const [imgError, setImgError] = useState(false)
  const tint = tintFor(idx)
  const hasPhoto = !!p.photo && !imgError

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={(e) => { stop(e); onSelect() }}
      style={{
        position: 'relative', background: '#fff',
        border: selected ? `2px solid ${C.brand}` : '1px solid rgba(19,61,51,0.08)',
        borderRadius: 9, cursor: 'pointer', boxShadow: SHADOW.card,
      }}
    >
      {selected && (
        <div onClick={stop} style={{
          position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 1, background: C.deep, borderRadius: 7, padding: 4,
          boxShadow: SHADOW.floating, whiteSpace: 'nowrap', zIndex: 6,
        }}>
          <span title="перетащить" style={{ ...mono(700, 11, 'rgba(255,255,255,0.6)'), padding: '3px 6px', cursor: 'grab' }}>⋮⋮</span>
          <button onClick={onUp} style={toolBtn}>↑</button>
          <button onClick={onDown} style={toolBtn}>↓</button>
          <button onClick={onPhoto} style={{ ...toolBtn, ...mono(700, 10) }}>фото</button>
          <button onClick={onRemove} style={{ ...toolBtn, color: C.mint }}>✕</button>
        </div>
      )}

      <div style={{ overflow: 'hidden', borderRadius: 9 }}>
        {fields.photo && (
          <div style={{
            aspectRatio: '1/1', background: hasPhoto ? '#fff' : (p.photo ? tint : C.empty),
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            {hasPhoto ? (
              <img src={p.photo} alt="" loading="lazy" onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : p.photo ? (
              <span style={{ ...ui(900, 44, C.brand), opacity: 0.5 }}>{monogram(p.name)}</span>
            ) : (
              <span style={{ ...mono(700, 10, 'rgba(19,61,51,0.35)'), textTransform: 'uppercase' }}>нет фото</span>
            )}
            {rank && (
              <div style={{ position: 'absolute', top: 8, left: 8, background: C.rust, color: '#fff', padding: '3px 6px', borderRadius: 5, ...mono(700, 10) }}>
                ТОП-{rank}
              </div>
            )}
            {fields.code && p.code && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', padding: '2px 5px', borderRadius: 4, ...mono(400, 9, 'rgba(19,61,51,0.55)') }}>
                {p.code}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: 11 }}>
          <div style={{
            ...ui(400, 12, C.deep), lineHeight: 1.4, minHeight: 33,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{p.name}</div>
          <div style={{ ...mono(700, 15, C.deep), marginTop: 6 }}>{formatPrice(p.price)}</div>
          {fields.salesBar && (
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(19,61,51,0.08)', marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: C.mint, width: `${salesPct(p.sales, salesMax)}%` }} />
            </div>
          )}
          {fields.supplier && (
            <div style={{ ...mono(400, 9, 'rgba(19,61,51,0.45)'), textTransform: 'uppercase', marginTop: 7 }}>
              {p.supplierName || '—'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const toolBtn = {
  background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
  ...mono(700, 11), padding: '3px 6px',
}
