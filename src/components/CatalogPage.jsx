import { useState, useEffect, useMemo, useCallback } from 'react'
import Nav from './Nav.jsx'
import { SUPPLIER_MAP, FX } from '../i18n.js'

const PAGE_SIZE = 48
const KNOWN_SUPPLIERS = Object.keys(SUPPLIER_MAP)

function formatPrice(uzs, currency) {
  if (currency === 'usd') return '$' + (uzs / FX.USD).toFixed(2)
  if (currency === 'kzt') return (Math.round(uzs / FX.KZT)).toLocaleString('ru') + ' ₸'
  return uzs.toLocaleString('ru') + ' сўм'
}

function formatRevenue(uzs, currency) {
  if (currency === 'usd') {
    const v = uzs / FX.USD
    return v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + v.toFixed(0)
  }
  if (currency === 'kzt') {
    const v = Math.round(uzs / FX.KZT)
    return v >= 1000000 ? (v / 1000000).toFixed(1) + 'M ₸' : (v / 1000).toFixed(0) + 'k ₸'
  }
  return uzs >= 1000000
    ? (uzs / 1000000).toFixed(1) + 'M'
    : (uzs / 1000).toFixed(0) + 'k'
}

export default function CatalogPage({ t, lang, setLang, currency, setCurrency, onNav }) {
  const [products, setProducts] = useState([])
  const [maxQty, setMaxQty] = useState(1)
  const [sort, setSort] = useState('q')
  const [dir, setDir] = useState('desc')
  const [view, setView] = useState('grid')
  const [selectedSuppliers, setSelectedSuppliers] = useState([])
  const [photoOnly, setPhotoOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mobile, setMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    fetch('/products.json')
      .then(r => r.json())
      .then(d => {
        setProducts(d.products)
        setMaxQty(d.stats.qty_sold.max)
      })
  }, [])

  const toggleSupplier = useCallback(tag => {
    setSelectedSuppliers(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
    setLimit(PAGE_SIZE)
  }, [])

  const handleSort = useCallback((axis) => {
    if (sort === axis) {
      setDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(axis)
      setDir(axis === 'name' ? 'asc' : 'desc')
    }
    setLimit(PAGE_SIZE)
  }, [sort])

  const filtered = useMemo(() => {
    let arr = products
    if (photoOnly) arr = arr.filter(p => p.image)
    if (selectedSuppliers.length > 0)
      arr = arr.filter(p => p.tags.some(tag => selectedSuppliers.includes(tag)))
    if (query.trim())
      arr = arr.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

    arr = [...arr].sort((a, b) => {
      let va, vb
      if (sort === 'q') { va = a.qty_sold; vb = b.qty_sold }
      else if (sort === 'price') { va = a.price.uzs; vb = b.price.uzs }
      else if (sort === 'rev') { va = a.revenue_uzs; vb = b.revenue_uzs }
      else { va = a.name; vb = b.name }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [products, photoOnly, selectedSuppliers, query, sort, dir])

  const visible = filtered.slice(0, limit)

  const sortLabels = { q: t.sort_sales, price: t.sort_price, rev: t.sort_revenue, name: t.sort_name }

  const supplierCounts = useMemo(() => {
    const counts = {}
    products.forEach(p => p.tags.forEach(tag => {
      if (KNOWN_SUPPLIERS.includes(tag)) counts[tag] = (counts[tag] || 0) + 1
    }))
    return counts
  }, [products])

  const supColor = {
    алфа: '#1F6E5A', р: '#2A7D6B', ф: '#5A8A7E', дос: '#2E6B55',
    эл: '#3B7A6A', имк: '#4D8C7B', дм: '#1A5E4A', аб: '#2F6E5F',
    бос: '#3D7A6E', шер: '#266A58', акука: '#4A8A7A',
  }

  const CurrencyToggle = (
    <div style={{ display: 'flex', gap: 2 }}>
      {['uzs', 'usd', 'kzt'].map(c => (
        <button key={c} onClick={() => setCurrency(c)} style={{
          fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
          padding: '4px 8px',
          background: currency === c ? '#1F6E5A' : 'transparent',
          color: currency === c ? '#fff' : 'rgba(255,255,255,.55)',
          border: '1px solid rgba(255,255,255,.2)',
          letterSpacing: 1,
        }}>{c.toUpperCase()}</button>
      ))}
    </div>
  )

  const SearchInput = (
    <input
      value={query}
      onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE) }}
      placeholder={t.search}
      style={{
        width: mobile ? '100%' : 250,
        padding: '6px 12px',
        background: 'rgba(255,255,255,.1)',
        border: '1px solid rgba(255,255,255,.2)',
        color: '#fff',
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        outline: 'none',
      }}
    />
  )

  const Sidebar = (
    <aside style={{
      width: 280, flexShrink: 0,
      background: '#E9E6DB',
      borderRight: '1px solid #16241E',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Sort */}
      <div style={{ borderBottom: '1px solid #D6D1C2', padding: '12px 0' }}>
        <div style={{ padding: '4px 16px 8px', fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#8A8F86', letterSpacing: 1 }}>{t.sort_h}</div>
        {Object.entries(sortLabels).map(([axis, label]) => (
          <button key={axis} onClick={() => handleSort(axis)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '10px 16px',
            background: sort === axis ? '#1F6E5A' : 'transparent',
            color: sort === axis ? '#fff' : '#16241E',
            fontSize: 13, fontWeight: 500,
            borderBottom: '1px solid #E2DDCE',
            textAlign: 'left',
          }}>
            <span>{label}</span>
            {sort === axis && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{dir === 'desc' ? '↓' : '↑'}</span>}
          </button>
        ))}
      </div>

      {/* Suppliers */}
      <div style={{ borderBottom: '1px solid #D6D1C2', padding: '12px 0' }}>
        <div style={{ padding: '4px 16px 8px', fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#8A8F86', letterSpacing: 1 }}>{t.supplier_h}</div>
        {KNOWN_SUPPLIERS.filter(tag => supplierCounts[tag]).map(tag => {
          const active = selectedSuppliers.includes(tag)
          return (
            <button key={tag} onClick={() => toggleSupplier(tag)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 16px',
              background: active ? '#16241E' : 'transparent',
              color: active ? '#fff' : '#16241E',
              fontSize: 12,
              borderBottom: '1px solid #E2DDCE',
              textAlign: 'left',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: supColor[tag] || '#1F6E5A',
              }} />
              <span style={{ flex: 1 }}>{SUPPLIER_MAP[tag]}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: active ? 'rgba(255,255,255,.6)' : '#9BA096' }}>
                {supplierCounts[tag]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Category */}
      <div style={{ padding: '12px 0' }}>
        <div style={{ padding: '4px 16px 8px', fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#8A8F86', letterSpacing: 1 }}>{t.category_h}</div>
        <div style={{ margin: '0 16px', padding: '10px 12px', border: '1px dashed #C9C3B2', fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#9BA096' }}>
          {t.category_pending}
        </div>
        <button onClick={() => { setPhotoOnly(v => !v); setLimit(PAGE_SIZE) }} style={{
          margin: '12px 16px 0',
          padding: '8px 14px',
          background: photoOnly ? '#1F6E5A' : 'transparent',
          color: photoOnly ? '#fff' : '#16241E',
          border: '1px solid #C9C3B2',
          fontSize: 12, fontWeight: 500,
          display: 'block', width: 'calc(100% - 32px)',
          textAlign: 'left',
        }}>{t.only_photo}</button>
      </div>
    </aside>
  )

  const CardGrid = ({ items }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    }}>
      {items.map((p, i) => {
        const rank = i < 3 ? i + 1 : null
        const tag = p.tags.find(t => KNOWN_SUPPLIERS.includes(t))
        return (
          <div key={p.id} style={{
            border: '1px solid #D6D1C2',
            marginRight: -1, marginBottom: -1,
            background: '#F4F2EA',
            cursor: 'default',
            transition: 'background .25s, border-color .25s',
            position: 'relative',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.borderColor = '#16241E'
              e.currentTarget.querySelector('.card-img')?.style && (e.currentTarget.querySelector('.card-img').style.transform = 'scale(1.03)')
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F4F2EA'
              e.currentTarget.style.borderColor = '#D6D1C2'
              e.currentTarget.querySelector('.card-img')?.style && (e.currentTarget.querySelector('.card-img').style.transform = 'scale(1)')
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #E2DDCE' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#9BA096' }}>№{String(p.id).padStart(3, '0')}</span>
              {tag && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#1F6E5A', fontWeight: 700, letterSpacing: 0.5 }}>{SUPPLIER_MAP[tag]?.toUpperCase().slice(0, 8)}</span>}
            </div>
            {/* Image */}
            <div style={{ position: 'relative', paddingTop: '100%', background: '#EBE8DE', overflow: 'hidden' }}>
              {rank && (
                <div style={{
                  position: 'absolute', top: 8, left: 8, zIndex: 2,
                  background: '#D2691E', color: '#fff',
                  fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                  padding: '2px 5px',
                }}>#{rank}</div>
              )}
              {p.image
                ? <img className="card-img" src={`/assets/${p.image}`} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }} />
                : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo', sans-serif", fontSize: 48, fontWeight: 900, color: '#C9C3B2' }}>{p.name[0].toUpperCase()}</div>
              }
            </div>
            {/* Body */}
            <div style={{ padding: '10px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#16241E', lineHeight: 1.35, marginBottom: 8, textTransform: 'capitalize', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>
                {p.name}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: '#16241E', marginBottom: 8 }}>
                {formatPrice(p.price.uzs, currency)}
              </div>
              {/* Sales bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 3, background: '#DEDACB' }}>
                  <div style={{ width: `${(p.qty_sold / maxQty) * 100}%`, height: '100%', background: '#1F6E5A' }} />
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#9BA096', whiteSpace: 'nowrap' }}>
                  {p.qty_sold.toLocaleString('ru')}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const TableList = ({ items }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#16241E', color: '#fff' }}>
          {[
            { key: null, label: t.col_code, w: 60 },
            { key: null, label: '', w: 48 },
            { key: 'name', label: t.col_name, w: 'auto' },
            { key: 'price', label: t.col_price, w: 110 },
            { key: 'q', label: t.col_sales, w: 130 },
            { key: null, label: t.col_supplier, w: 90 },
            { key: 'rev', label: t.col_revenue, w: 90 },
          ].map(({ key, label, w }, i) => (
            <th key={i} onClick={key ? () => handleSort(key) : undefined} style={{
              padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, letterSpacing: 1,
              width: w, whiteSpace: 'nowrap',
              color: key && sort === key ? '#8FD3BC' : '#fff',
              cursor: key ? 'pointer' : 'default',
            }}>
              {label}{key && sort === key ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((p, i) => {
          const tag = p.tags.find(t => KNOWN_SUPPLIERS.includes(t))
          return (
            <tr key={p.id} style={{ background: i % 2 === 0 ? '#F4F2EA' : '#EBE8DE', borderBottom: '1px solid #D6D1C2' }}>
              <td style={{ padding: '8px 12px', color: '#9BA096' }}>№{String(p.id).padStart(3, '0')}</td>
              <td style={{ padding: '4px 8px' }}>
                {p.image
                  ? <img src={`/assets/${p.image}`} alt="" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                  : <div style={{ width: 36, height: 36, background: '#DEDACB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#C9C3B2', fontFamily: "'Archivo', sans-serif" }}>{p.name[0].toUpperCase()}</div>
                }
              </td>
              <td style={{ padding: '8px 12px', fontFamily: "'Archivo', sans-serif", fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{p.name}</td>
              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{formatPrice(p.price.uzs, currency)}</td>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 60, height: 3, background: '#DEDACB' }}>
                    <div style={{ width: `${(p.qty_sold / maxQty) * 100}%`, height: '100%', background: '#1F6E5A' }} />
                  </div>
                  <span style={{ color: '#5C645C' }}>{p.qty_sold.toLocaleString('ru')}</span>
                </div>
              </td>
              <td style={{ padding: '8px 12px', color: '#1F6E5A', fontSize: 10 }}>{tag ? SUPPLIER_MAP[tag] : '—'}</td>
              <td style={{ padding: '8px 12px', color: '#5C645C' }}>{formatRevenue(p.revenue_uzs, currency)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const BottomSheet = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(22,36,30,.5)',
      display: sheetOpen ? 'flex' : 'none',
      alignItems: 'flex-end',
    }} onClick={() => setSheetOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#E9E6DB',
        borderTop: '2px solid #16241E',
        padding: 20, maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{t.sort_h}</span>
          <button onClick={() => { setSelectedSuppliers([]); setPhotoOnly(false); setQuery(''); setLimit(PAGE_SIZE) }} style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#1F6E5A', fontWeight: 700 }}>{t.reset}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {Object.entries(sortLabels).map(([axis, label]) => (
            <button key={axis} onClick={() => handleSort(axis)} style={{
              padding: '12px', background: sort === axis ? '#1F6E5A' : '#fff',
              color: sort === axis ? '#fff' : '#16241E',
              border: '1px solid #D6D1C2', fontSize: 13, fontWeight: 500,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{label}</span>
              {sort === axis && <span>{dir === 'desc' ? '↓' : '↑'}</span>}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#8A8F86', marginBottom: 8, letterSpacing: 1 }}>{t.supplier_h}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {KNOWN_SUPPLIERS.filter(tag => supplierCounts[tag]).map(tag => {
            const active = selectedSuppliers.includes(tag)
            return (
              <button key={tag} onClick={() => toggleSupplier(tag)} style={{
                padding: '6px 12px', border: '1px solid #C9C3B2',
                background: active ? '#16241E' : '#fff',
                color: active ? '#fff' : '#16241E',
                fontSize: 12,
              }}>{SUPPLIER_MAP[tag]}</button>
            )
          })}
        </div>
        <button onClick={() => { setPhotoOnly(v => !v); setLimit(PAGE_SIZE) }} style={{
          padding: '10px 14px', border: '1px solid #C9C3B2',
          background: photoOnly ? '#1F6E5A' : '#fff',
          color: photoOnly ? '#fff' : '#16241E',
          fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left', marginBottom: 16,
        }}>{t.only_photo}</button>
        <button onClick={() => setSheetOpen(false)} style={{
          width: '100%', padding: '14px',
          background: '#16241E', color: '#fff',
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 1,
        }}>
          {t.more_a} {filtered.length} {t.results} {t.more_b}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#E9E6DB' }}>
      <Nav t={t} lang={lang} setLang={setLang} page="catalog" onNav={onNav}>
        {!mobile && SearchInput}
        {!mobile && CurrencyToggle}
      </Nav>

      {/* Masthead */}
      <div style={{ background: '#133D33', color: '#fff', padding: mobile ? '16px 20px' : '20px 32px', display: 'flex', flexDirection: mobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobile ? 'flex-start' : 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: mobile ? 32 : 46, letterSpacing: -1, textTransform: 'uppercase' }}>{t.inv_title}</h1>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,.6)' }}>/ {products.length} {t.positions}</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,.55)', lineHeight: 1.6, textAlign: mobile ? 'left' : 'right' }}>
          <div>{t.period}</div>
          <div>1 USD = 12 020 UZS · 1 USD = 294 KZT</div>
        </div>
      </div>

      {/* Mobile controls */}
      {mobile && (
        <div style={{ padding: '12px 16px', background: '#E9E6DB', borderBottom: '1px solid #D6D1C2', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SearchInput}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {CurrencyToggle}
              <button onClick={() => setSheetOpen(true)} style={{
                padding: '6px 12px', background: '#16241E', color: '#fff',
                fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
              }}>{t.filter_btn}</button>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {['grid', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '5px 10px', fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1,
                  background: view === v ? '#16241E' : 'transparent',
                  color: view === v ? '#fff' : '#16241E',
                  border: '1px solid #C9C3B2',
                }}>{v === 'grid' ? t.grid : t.list}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!mobile && Sidebar}

        <main style={{ flex: 1, overflow: 'auto' }}>
          {/* Toolbar */}
          {!mobile && (
            <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #D6D1C2', background: '#EBE8DE', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#5C645C' }}>
                {filtered.length} {t.results} · {sort === 'q' ? t.s_sales : sort === 'price' ? t.s_price : sort === 'rev' ? t.s_revenue : t.s_name} {dir === 'desc' ? '↓' : '↑'}
              </span>
              <div style={{ display: 'flex', gap: 2 }}>
                {['grid', 'list'].map(v => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding: '5px 12px', fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    background: view === v ? '#16241E' : 'transparent',
                    color: view === v ? '#fff' : '#16241E',
                    border: '1px solid #C9C3B2',
                  }}>{v === 'grid' ? t.grid : t.list}</button>
                ))}
              </div>
            </div>
          )}

          {visible.length === 0 && (
            <div style={{ padding: 40, fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#9BA096', textAlign: 'center' }}>{t.empty}</div>
          )}

          {view === 'grid' ? <CardGrid items={visible} /> : <TableList items={visible} />}

          {filtered.length > limit && (
            <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setLimit(l => l + PAGE_SIZE)} style={{
                padding: '12px 32px', border: '1px solid #16241E',
                fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 1,
                background: 'transparent', color: '#16241E',
              }}>
                {t.more_a} {Math.min(PAGE_SIZE, filtered.length - limit)} {t.more_b}
              </button>
            </div>
          )}
        </main>
      </div>

      {BottomSheet}
    </div>
  )
}
