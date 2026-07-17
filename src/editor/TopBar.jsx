import { C, ui, mono, SHADOW } from './tokens.js'
import { SORT_LABELS, includedCategoryIds } from './resolve.js'

const stop = (e) => e.stopPropagation()

function Pop({ align = 'right', width, top = 38, children, style }) {
  return (
    <div
      onClick={stop}
      style={{
        position: 'absolute', [align]: 0, top, width,
        background: '#fff', border: '1px solid rgba(19,61,51,0.14)', borderRadius: 9,
        boxShadow: SHADOW.popover, animation: 'popIn 0.14s ease', zIndex: 50, ...style,
      }}
    >
      {children}
    </div>
  )
}

const popLabel = {
  ...mono(700, 8, 'rgba(19,61,51,0.4)'), textTransform: 'uppercase', letterSpacing: '0.05em',
}

const pillBtn = (active) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  background: active ? 'rgba(31,110,90,0.1)' : '#fff',
  border: '1px solid rgba(19,61,51,0.15)', borderRadius: 7, padding: '7px 10px',
  cursor: 'pointer', ...ui(700, 11, active ? C.brand : 'rgba(19,61,51,0.75)'),
})

export default function TopBar({
  db, current, catalogs, open, setOpen,
  printPreview, onTogglePrint, onExport, source, syncStatus, lastSync, onSync,
  onToggleAutoSync, actions,
}) {
  const toggle = (name) => setOpen((o) => (o === name ? null : name))
  const includedIds = includedCategoryIds(db, current)
  const filterActive = current.categoryIds !== null || (current.supplierIds !== null) || current.topN > 0

  return (
    <div
      className="no-print"
      onClick={stop}
      style={{
        position: 'sticky', top: 0, zIndex: 40, background: C.panel,
        borderBottom: '1px solid rgba(19,61,51,0.12)', padding: '9px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}
    >
      {/* left cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7, background: C.deep,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ ...ui(900, 17, C.mint) }}>α</span>
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => toggle('catalogs')} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none',
            border: 'none', cursor: 'pointer', padding: '2px 4px',
          }}>
            <span style={{ ...ui(800, 15, C.deep) }}>{current.name}</span>
            <span style={{ ...mono(700, 9, '#fff'), background: C.brand, borderRadius: 4, padding: '2px 6px' }}>{current.client}</span>
            <span style={{ color: 'rgba(19,61,51,0.5)', fontSize: 11 }}>▾</span>
          </button>

          {open === 'catalogs' && (
            <Pop align="left" width={260} style={{ overflow: 'hidden' }}>
              <div style={{ ...popLabel, padding: '10px 12px 5px' }}>Каталоги · одна база</div>
              {catalogs.map((c) => {
                const isCur = c.id === current.id
                return (
                  <button key={c.id} onClick={() => { actions.switchCatalog(c.id); setOpen(null) }} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                    textAlign: 'left', background: isCur ? 'rgba(143,211,188,0.15)' : 'none',
                    border: 'none', cursor: 'pointer', padding: '10px 12px',
                  }}>
                    <span>
                      <span style={{ display: 'block', ...ui(700, 13, C.deep) }}>{c.name}</span>
                      <span style={{ ...mono(400, 10, 'rgba(19,61,51,0.45)') }}>{catalogMeta(db, c)}</span>
                    </span>
                    <span style={{ ...mono(700, 9, C.brand) }}>{c.client}</span>
                  </button>
                )
              })}
              <button onClick={() => { actions.createCatalog(); setOpen(null) }} style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                borderTop: '1px solid rgba(19,61,51,0.08)', cursor: 'pointer', padding: '10px 12px',
                ...ui(700, 12, C.brand),
              }}>+ Новый каталог из базы</button>
            </Pop>
          )}
        </div>
      </div>

      {/* right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        {/* source */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => toggle('source')} title="Источник данных" style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
            border: '1px solid rgba(19,61,51,0.15)', borderRadius: 7, padding: '7px 10px',
            cursor: 'pointer', ...mono(400, 11, 'rgba(19,61,51,0.7)'),
          }}>
            <span style={{ color: C.sheets }}>●</span> Источник · {syncStatus}
          </button>
          {open === 'source' && (
            <Pop width={320} style={{ padding: 14 }}>
              <div style={{ ...popLabel, marginBottom: 10 }}>Источник данных</div>
              <SourceCard icon="◨" iconBg={C.sheets} title="Google Таблица" sub={source.sheetName}
                status="подключено" statusColor={C.brand} note="колонки: код · название · цена · продажи · категория · поставщик" />
              <SourceCard icon="▣" iconBg={C.drive} title="Папка Drive · фото" sub={source.folderName}
                status="980 фото" statusColor={C.brand} note="файлы по коду товара сопоставляются автоматически" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12, ...ui(600, 11, C.deep) }}>
                <input type="checkbox" checked={source.autoSync} onChange={onToggleAutoSync} /> Авто-синхронизация при изменении источника
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...mono(400, 10, 'rgba(19,61,51,0.45)') }}>обновлено: {lastSync}</span>
                <button onClick={onSync} style={{ background: C.brand, border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '8px 14px', ...ui(700, 11) }}>Синхронизировать</button>
              </div>
              <div style={{ ...ui(400, 9, 'rgba(19,61,51,0.4)'), lineHeight: 1.4, marginTop: 10 }}>
                Обновляет цены и продажи, добавляет новые товары. Ваши ручные правки, порядок и подбор каталогов сохраняются.
              </div>
            </Pop>
          )}
        </div>

        {/* filter */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => toggle('filter')} style={pillBtn(filterActive)}>
            Фильтр {filterActive && <span style={{ ...mono(700, 9, C.brand) }}>· {includedIds.length}</span>}
          </button>
          {open === 'filter' && (
            <Pop width={300} style={{ padding: 14, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ ...popLabel, marginBottom: 8 }}>Поставщики в этом каталоге</div>
              {db.suppliers.length === 0 ? (
                <div style={{ ...ui(400, 11, 'rgba(19,61,51,0.45)'), marginBottom: 14, lineHeight: 1.4 }}>
                  Нет данных о поставщиках в этой базе. Появятся после сопоставления в источнике.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button onClick={actions.allSuppliers} style={supFilterBtn(current.supplierIds === null)}>Все</button>
                    <button onClick={actions.noSuppliers} style={supFilterBtn(false)}>Снять все</button>
                  </div>
                </>
              )}
              <div style={{ ...popLabel, marginBottom: 8 }}>Разделы (категории)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                {db.categories.map((cat) => {
                  const on = includedIds.includes(cat.id)
                  return (
                    <button key={cat.id} onClick={() => actions.toggleCategory(cat.id)} style={{
                      background: on ? C.brand : '#fff', border: '1px solid rgba(19,61,51,0.15)',
                      borderRadius: 14, padding: '5px 10px', cursor: 'pointer',
                      ...ui(600, 11, on ? '#fff' : 'rgba(19,61,51,0.6)'),
                    }}>{cat.name}</button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...ui(600, 11, 'rgba(19,61,51,0.6)') }}>Топ-N в разделе (правило)</span>
                <input type="number" min={0} value={current.topN} onChange={(e) => actions.setTopN(e.target.value)} style={{
                  width: 56, background: '#fff', border: '1px solid rgba(19,61,51,0.15)', borderRadius: 6,
                  padding: 6, textAlign: 'center', ...mono(700, 12, C.deep),
                }} />
              </div>
              <div style={{ ...ui(400, 10, 'rgba(19,61,51,0.45)'), lineHeight: 1.4, marginTop: 8 }}>
                0 = все позиции. Изменение фильтра пересобирает разделы по правилу. Разделы, которые вы двигали вручную, сохранят порядок.
              </div>
            </Pop>
          )}
        </div>

        {/* sort */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => toggle('sort')} style={pillBtn(false)}>
            Сортировка: {SORT_LABELS[current.sortKey]} ▾
          </button>
          {open === 'sort' && (
            <Pop width={220} style={{ overflow: 'hidden' }}>
              <div style={{ ...popLabel, padding: '10px 12px 5px' }}>Весь документ</div>
              {Object.entries(SORT_LABELS).map(([key, label]) => {
                const active = current.sortKey === key
                return (
                  <button key={key} onClick={() => { actions.setSort(key); setOpen(null) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: active ? 'rgba(143,211,188,0.15)' : 'none', border: 'none', cursor: 'pointer',
                    padding: '9px 12px', ...ui(active ? 700 : 400, 12, active ? C.brand : C.deep),
                  }}>{label}</button>
                )
              })}
            </Pop>
          )}
        </div>

        <button onClick={onTogglePrint} style={pillBtn(printPreview)}>
          Просмотр печати {printPreview ? '●' : ''}
        </button>
        <button onClick={onExport} style={{ background: C.brand, border: 'none', borderRadius: 7, padding: '7px 13px', cursor: 'pointer', ...ui(700, 11, '#fff') }}>
          Экспорт PDF
        </button>
      </div>
    </div>
  )
}

function catalogMeta(db, c) {
  const cats = c.categoryIds ? c.categoryIds.length : db.categories.length
  const sup = c.supplierIds ? c.supplierIds.length : db.suppliers.length
  return `${cats} разд. · ${sup} пост.`
}

function SourceCard({ icon, iconBg, title, sub, status, statusColor, note }) {
  return (
    <div style={{ border: '1px solid rgba(19,61,51,0.12)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 5, background: iconBg, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...ui(900, 12),
          }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...ui(700, 11, C.deep) }}>{title}</div>
            <div style={{ ...mono(400, 9, 'rgba(19,61,51,0.5)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
          </div>
        </div>
        <span style={{ ...mono(700, 9, statusColor), flexShrink: 0 }}>{status}</span>
      </div>
      <div style={{ ...mono(400, 9, 'rgba(19,61,51,0.4)'), lineHeight: 1.4, marginTop: 8 }}>{note}</div>
    </div>
  )
}

const supFilterBtn = (active) => ({
  flex: 1, background: active ? 'rgba(31,110,90,0.1)' : '#fff',
  border: '1px solid rgba(31,110,90,0.3)', borderRadius: 6, padding: 6, cursor: 'pointer',
  ...mono(700, 10, active ? C.brand : 'rgba(19,61,51,0.6)'),
})
