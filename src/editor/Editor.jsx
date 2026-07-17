import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCatalogStore } from './useCatalogStore.js'
import { includedCategoryIds } from './resolve.js'
import { C, ui, mono, SHADOW } from './tokens.js'
import TopBar from './TopBar.jsx'
import Cover from './Cover.jsx'
import Section from './Section.jsx'
import PrintPreview from './PrintPreview.jsx'

const stop = (e) => e.stopPropagation()
const nowLabel = () => new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function Editor() {
  const { user, logout } = useAuth()
  const { db, ranks, catalogs, current, resolved, actions } = useCatalogStore()

  const [open, setOpen] = useState(null)          // active popover
  const [sel, setSel] = useState({ kind: null })  // selection model
  const [printPreview, setPrintPreview] = useState(false)
  const [sectionView, setSectionView] = useState({})
  const [addSearch, setAddSearch] = useState({})
  const [toast, setToast] = useState(null)
  const [autoSync, setAutoSync] = useState(true)
  const [syncStatus, setSyncStatus] = useState('синхр. только что')
  const [lastSync, setLastSync] = useState('только что')

  const toastTimer = useRef(null)
  const dragRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const clearSelection = useCallback(() => { setSel({ kind: null }); setOpen(null) }, [])

  // --- drag & drop factories ---
  const dnd = {
    onDragOver: (e) => e.preventDefault(),
    makeDragStart: (pid, catId) => (e) => {
      dragRef.current = { pid, catId }
      e.dataTransfer.effectAllowed = 'move'
      try { e.dataTransfer.setData('text/plain', pid) } catch { /* noop */ }
    },
    makeDropOnCard: (targetPid, targetCat) => (e) => {
      e.preventDefault(); e.stopPropagation()
      const d = dragRef.current
      if (d) actions.moveProduct({ pid: d.pid, fromCat: d.catId, toCat: targetCat, beforePid: targetPid })
      dragRef.current = null
    },
    makeDropOnSection: (catId) => (e) => {
      e.preventDefault()
      const d = dragRef.current
      if (d) actions.moveProduct({ pid: d.pid, fromCat: d.catId, toCat: catId, beforePid: null })
      dragRef.current = null
    },
  }

  // --- top-bar actions ---
  const onSync = useCallback(() => {
    setSyncStatus('синхронизация…'); setOpen(null)
    setTimeout(() => {
      setSyncStatus('синхр. только что')
      setLastSync(nowLabel())
      showToast('12 новых, 1157 обновлено · ручные правки сохранены')
    }, 800)
  }, [showToast])

  const onExport = useCallback(() => {
    setPrintPreview(true); setOpen(null); clearSelection()
    showToast('Просмотр печати открыт · Ctrl/⌘+P — сохранить PDF')
  }, [showToast, clearSelection])

  const onPhotoToast = useCallback(() => showToast('Замена фото — подключите папку Drive в «Источник».'), [showToast])

  const source = { sheetName: 'Alpha Polimer — P&L 2025-06 → 2026-07', folderName: 'Drive · Alpha фото (980)', autoSync }
  const includedIds = includedCategoryIds(db, current)
  const addable = db.categories.filter((c) => !includedIds.includes(c.id))

  return (
    <div onClick={clearSelection} style={{ minHeight: '100vh', background: C.canvas, color: C.deep }}>
      <TopBar
        db={db} current={current} catalogs={catalogs}
        open={open} setOpen={setOpen}
        printPreview={printPreview} onTogglePrint={() => { setPrintPreview((v) => !v); clearSelection() }}
        onExport={onExport} source={source} syncStatus={syncStatus} lastSync={lastSync}
        onSync={onSync} onToggleAutoSync={() => setAutoSync((v) => !v)} actions={actions}
      />

      {/* signed-in strip */}
      <div className="no-print" onClick={stop} style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 24px 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <span style={{ ...mono(400, 10, 'rgba(19,61,51,0.5)') }}>{user?.first_name || user?.username || 'сотрудник'}</span>
        <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(19,61,51,0.15)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', ...mono(700, 10, 'rgba(19,61,51,0.6)') }}>выйти</button>
      </div>

      {printPreview ? (
        <PrintPreview current={current} stats={resolved.stats} sections={resolved.sections} />
      ) : (
        <div onClick={stop} style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 24px 120px' }}>
          <Cover current={current} stats={resolved.stats} selected={sel.kind === 'cover'} setSel={setSel} actions={actions} />

          {resolved.sections.map((sec) => (
            <Section
              key={sec.catId} sec={sec} db={db} ranks={ranks} salesMax={db.salesMax}
              sel={sel} setSel={setSel}
              view={sectionView[sec.catId] || 'cards'}
              addSearch={addSearch[sec.catId]}
              actions={actions}
              onSetView={(catId, v) => setSectionView((s) => ({ ...s, [catId]: v }))}
              onAddSearch={(catId, v) => setAddSearch((s) => ({ ...s, [catId]: v }))}
              onPhotoToast={onPhotoToast}
              dnd={dnd}
            />
          ))}

          {resolved.sections.length === 0 && (
            <div style={{ ...ui(400, 14, 'rgba(19,61,51,0.5)'), padding: '40px 0' }}>
              В этом каталоге нет разделов. Добавьте раздел ниже или измените фильтр.
            </div>
          )}

          {/* add section */}
          <div onClick={stop} style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setOpen((o) => (o === 'addSection' ? null : 'addSection'))} style={{
              background: 'none', border: '1.5px dashed rgba(31,110,90,0.4)', borderRadius: 9,
              padding: '12px 18px', cursor: 'pointer', ...ui(700, 12, C.brand),
            }}>+ Добавить раздел</button>
            {open === 'addSection' && (
              <div style={{ position: 'absolute', left: 0, top: 48, width: 240, background: '#fff', border: '1px solid rgba(19,61,51,0.14)', borderRadius: 9, boxShadow: SHADOW.popover, overflow: 'hidden', animation: 'popIn 0.14s ease', zIndex: 30, maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ ...mono(700, 8, 'rgba(19,61,51,0.4)'), padding: '10px 12px 5px', textTransform: 'uppercase' }}>Категории не в каталоге</div>
                {addable.map((c) => (
                  <button key={c.id} onClick={() => { actions.addSection(c.id); setOpen(null) }} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 12px', ...ui(600, 12, C.deep) }}>
                    {c.name} <span style={{ ...mono(400, 10, 'rgba(19,61,51,0.4)') }}>{(db.byCat.get(c.id) || []).length}</span>
                  </button>
                ))}
                {addable.length === 0 && (
                  <div style={{ ...ui(400, 11, 'rgba(19,61,51,0.4)'), padding: '10px 12px' }}>Все категории уже добавлены.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', background: C.deep, color: C.mint, padding: '12px 20px', borderRadius: 8, zIndex: 200, animation: 'toastIn 0.2s ease', boxShadow: SHADOW.toast, ...ui(700, 13) }}>
          {toast}
        </div>
      )}
    </div>
  )
}
