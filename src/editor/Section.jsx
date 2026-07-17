import { C, ui, mono } from './tokens.js'
import { formatPrice, formatInt, parsePrice } from './format.js'
import ProductCard from './ProductCard.jsx'

const stop = (e) => e.stopPropagation()

export default function Section({
  sec, db, ranks, salesMax, sel, setSel, view, addSearch,
  actions, onSetView, onAddSearch, onPhotoToast, dnd,
}) {
  const { catId, columns, fields, manual } = sec
  const selected = sel.kind === 'section' && sel.catId === catId
  const meta = `${sec.count} поз. · ${formatInt(sec.qty)} кол.${manual ? ' · вручную' : ''}`

  const categoryOptions = db.categories.map((c) => ({ value: c.id, label: c.name }))
  const supplierOptions = [{ value: '', label: '—' }, ...db.suppliers.map((s) => ({ value: s.id, label: s.name }))]

  // add-product search results (up to 5), excluding items already in section
  const inSection = new Set(sec.items.map((p) => p.id))
  const q = (addSearch || '').trim().toLowerCase()
  const addResults = q
    ? db.products.filter((p) =>
        !inSection.has(p.id) &&
        (p.name.toLowerCase().includes(q) || String(p.code).includes(q)),
      ).slice(0, 5)
    : []

  return (
    <div style={{ marginBottom: 26 }} onDragOver={dnd.onDragOver} onDrop={dnd.makeDropOnSection(catId)}>
      {/* header */}
      <div onClick={(e) => { stop(e); setSel({ kind: 'section', catId }) }} style={{
        position: 'relative', border: selected ? `2px solid ${C.brand}` : '1px solid transparent',
        borderRadius: 7, padding: '8px 10px', marginBottom: 12, cursor: 'pointer',
        background: selected ? '#fff' : 'transparent',
      }}>
        <div style={{ ...mono(700, 11, C.brand), letterSpacing: '0.1em' }}>РАЗДЕЛ</div>
        {selected ? (
          <input value={sec.title} onChange={(e) => actions.renameSection(catId, e.target.value)} onClick={stop}
            style={{ display: 'block', background: 'none', border: 'none', width: '100%', padding: 0, marginTop: 2, ...ui(900, 26, C.deep) }} />
        ) : (
          <div style={{ ...ui(900, 26, C.deep), marginTop: 2 }}>{sec.title}</div>
        )}
        <div style={{ ...mono(400, 11, 'rgba(19,61,51,0.45)'), marginTop: 3 }}>{meta}</div>

        {selected && (
          <div onClick={stop} style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12,
            background: C.deep, borderRadius: 8, padding: '7px 8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: 2 }}>
              <button onClick={() => actions.setColumns(catId, -1)} style={{ ...stepBtn }}>−</button>
              <span style={{ ...mono(700, 10, '#fff') }}>{columns} кол.</span>
              <button onClick={() => actions.setColumns(catId, +1)} style={{ ...stepBtn }}>+</button>
            </div>
            <button onClick={() => onSetView(catId, view === 'table' ? 'cards' : 'table')}
              style={toolToggle(view === 'table')}>
              {view === 'table' ? '⊞ карточки' : '⊟ таблица'}
            </button>
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
            <FieldToggle on={fields.photo} onClick={() => actions.toggleField(catId, 'photo')}>фото</FieldToggle>
            <FieldToggle on={fields.code} onClick={() => actions.toggleField(catId, 'code')}>код</FieldToggle>
            <FieldToggle on={fields.supplier} onClick={() => actions.toggleField(catId, 'supplier')}>поставщик</FieldToggle>
            <FieldToggle on={fields.salesBar} onClick={() => actions.toggleField(catId, 'salesBar')}>продажи</FieldToggle>
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
            <button onClick={() => actions.removeSection(catId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', ...mono(700, 10, C.rustSoft) }}>убрать раздел</button>
          </div>
        )}
      </div>

      {/* body */}
      {view === 'table' ? (
        <TableView sec={sec} actions={actions} categoryOptions={categoryOptions} supplierOptions={supplierOptions} onPhotoToast={onPhotoToast} dnd={dnd} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 14 }}>
          {sec.items.map((p, i) => {
            const productSel = sel.kind === 'product' && sel.pid === p.id && sel.catId === catId
            return (
              <ProductCard
                key={p.id} p={p} idx={i} selected={productSel} rank={ranks[p.id]} salesMax={salesMax} fields={fields}
                onSelect={() => setSel({ kind: 'product', pid: p.id, catId })}
                onUp={() => actions.reorderProduct(p.id, catId, -1)}
                onDown={() => actions.reorderProduct(p.id, catId, +1)}
                onPhoto={onPhotoToast}
                onRemove={() => { actions.removeProduct(p.id, catId); setSel({ kind: null }) }}
                onDragStart={dnd.makeDragStart(p.id, catId)}
                onDragOver={dnd.onDragOver}
                onDrop={dnd.makeDropOnCard(p.id, catId)}
              />
            )
          })}
        </div>
      )}

      {/* add product (only when section selected) */}
      {selected && (
        <div onClick={stop} style={{ marginTop: 12, background: '#fff', border: '1px dashed rgba(31,110,90,0.4)', borderRadius: 9, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ ...ui(700, 11, C.brand) }}>+ Добавить товар в раздел</span>
            <input value={addSearch || ''} onChange={(e) => onAddSearch(catId, e.target.value)} placeholder="поиск по базе..."
              style={{ flex: 1, background: C.panel, border: '1px solid rgba(19,61,51,0.14)', borderRadius: 6, padding: '7px 9px', ...ui(400, 12, C.deep) }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {addResults.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderTop: '1px solid rgba(19,61,51,0.06)' }}>
                <span style={{ flex: 1, ...ui(400, 12, C.deep), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ ...mono(400, 11, 'rgba(19,61,51,0.4)') }}>{formatPrice(r.price)}</span>
                <span style={{ ...mono(400, 9, 'rgba(19,61,51,0.35)') }}>{db.catById.get(r.categoryId)?.name}</span>
                <button onClick={() => actions.addProduct(r.id, catId)} style={{ background: C.brand, border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', padding: '5px 9px', ...mono(700, 10) }}>добавить</button>
              </div>
            ))}
            {q && addResults.length === 0 && (
              <div style={{ ...ui(400, 11, 'rgba(19,61,51,0.4)'), padding: '6px 4px' }}>Ничего не найдено в базе.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TableView({ sec, actions, categoryOptions, supplierOptions, onPhotoToast, dnd }) {
  const cols = '26px 34px 1.6fr 0.8fr 0.5fr 1fr 1fr 20px'
  return (
    <div onClick={stop} style={{ background: '#fff', border: '1px solid rgba(19,61,51,0.12)', borderRadius: 9, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, background: C.panel, borderBottom: '1px solid rgba(19,61,51,0.1)', padding: '8px 10px', ...mono(700, 8, 'rgba(19,61,51,0.5)'), textTransform: 'uppercase' }}>
        <span /><span>фото</span><span>Название</span>
        <span style={{ textAlign: 'right' }}>Цена</span>
        <span style={{ textAlign: 'right' }}>Прод</span>
        <span>Категория</span><span>Поставщик</span><span />
      </div>
      {sec.items.map((p) => (
        <div key={p.id} draggable onDragStart={dnd.makeDragStart(p.id, sec.catId)} onDragOver={dnd.onDragOver} onDrop={dnd.makeDropOnCard(p.id, sec.catId)}
          style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid rgba(19,61,51,0.06)' }}>
          <span style={{ color: 'rgba(19,61,51,0.25)', cursor: 'grab', fontSize: 13 }}>⋮⋮</span>
          <button onClick={onPhotoToast} title="заменить фото" style={{ width: 26, height: 26, borderRadius: 5, background: p.photo ? `center/cover no-repeat url(${p.photo})` : C.empty, border: '1px solid rgba(19,61,51,0.12)', cursor: 'pointer', position: 'relative' }}>
            <span style={{ position: 'absolute', right: -3, bottom: -3, width: 12, height: 12, background: C.brand, color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ui(700, 8) }}>✎</span>
          </button>
          <input value={p.name} onChange={(e) => actions.updateProduct(p.id, { name: e.target.value })}
            style={{ background: 'none', border: 'none', width: '100%', padding: 3, borderRadius: 4, ...ui(400, 12, C.deep) }} />
          <input value={p.price} onChange={(e) => actions.updateProduct(p.id, { price: parsePrice(e.target.value) })}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'right', padding: 3, borderRadius: 4, ...mono(700, 12, C.deep) }} />
          <span style={{ textAlign: 'right', ...mono(400, 11, 'rgba(19,61,51,0.5)') }}>{formatInt(p.sales)}</span>
          <select value={p.categoryId} onChange={(e) => actions.updateProduct(p.id, { categoryId: e.target.value })}
            style={{ background: '#fff', border: '1px solid rgba(19,61,51,0.14)', borderRadius: 5, padding: 4, ...ui(400, 10, C.deep) }}>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={p.supplierId || ''} onChange={(e) => actions.updateProduct(p.id, { supplierId: e.target.value || null })}
            style={{ background: '#fff', border: '1px solid rgba(19,61,51,0.14)', borderRadius: 5, padding: 4, ...ui(400, 10, C.deep) }}>
            {supplierOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => actions.removeProduct(p.id, sec.catId)} style={{ background: 'none', border: 'none', color: C.rust, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function FieldToggle({ on, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: on ? C.mint : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer',
      padding: '6px 8px', ...mono(700, 10, on ? C.deep : 'rgba(255,255,255,0.55)'),
    }}>{children}</button>
  )
}

const stepBtn = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', width: 22, ...ui(700, 13) }
const toolToggle = (active) => ({
  background: active ? C.mint : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer',
  padding: '6px 9px', ...mono(700, 10, active ? C.deep : 'rgba(255,255,255,0.55)'),
})
