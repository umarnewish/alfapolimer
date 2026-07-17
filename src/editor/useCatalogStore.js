import { useCallback, useEffect, useMemo, useState } from 'react'
import baseData from '../data/catalog-data.json'
import {
  resolveCatalog, seedManualFromRules, includedCategoryIds, computeRanks,
  DEFAULT_FIELDS, DEFAULT_COLUMNS, MIN_COLS, MAX_COLS,
} from './resolve.js'
import { uid } from './format.js'

const STORAGE_KEY = 'alfa_living_catalog_v1'
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// ---- DB assembly (base JSON + persisted product overrides) -----------------
function buildDb(overrides) {
  const suppliers = baseData.suppliers || []
  const supById = new Map(suppliers.map((s) => [s.id, s]))
  const products = baseData.products.map((p) => {
    const ov = overrides[p.id]
    const m = ov ? { ...p, ...ov } : p
    return { ...m, supplierName: supById.get(m.supplierId)?.name || '' }
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  const byCat = new Map()
  for (const p of products) {
    if (!byCat.has(p.categoryId)) byCat.set(p.categoryId, [])
    byCat.get(p.categoryId).push(p)
  }
  const catById = new Map(baseData.categories.map((c) => [c.id, c]))
  const salesMax = products.reduce((m, p) => Math.max(m, p.sales || 0), 0)
  return { products, categories: baseData.categories, suppliers, byId, byCat, catById, supById, salesMax }
}

// ---- Seed catalogs (two recipes over one base) -----------------------------
function seedCatalogs() {
  const common = {
    supplierIds: null, columnsBySection: {}, fieldsBySection: {},
    titleOverrides: {}, manual: {}, priorSort: 'sales',
  }
  return [
    {
      id: 'cat_full', name: 'Полный каталог', client: 'ОПТ',
      desc: 'Все позиции Alpha Polimer Line по разделам — актуальные цены и продажи из MoySklad.',
      categoryIds: null, topN: 0, sortKey: 'sales', columns: 4, ...common,
    },
    {
      id: 'cat_top', name: 'Хиты продаж', client: 'ВИТРИНА',
      desc: 'Топ-6 позиций в каждом разделе — компактная витрина для клиентов.',
      categoryIds: null, topN: 6, sortKey: 'sales', columns: 5, ...common,
    },
  ]
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p.catalogs || !p.catalogs.length) return null
    return p
  } catch { return null }
}

export function useCatalogStore() {
  const persisted = useMemo(loadPersisted, [])
  const [overrides, setOverrides] = useState(() => persisted?.overrides || {})
  const [catalogs, setCatalogs] = useState(() => persisted?.catalogs || seedCatalogs())
  const [currentId, setCurrentId] = useState(() => persisted?.currentId || 'cat_full')

  const db = useMemo(() => buildDb(overrides), [overrides])
  const ranks = useMemo(() => computeRanks(db), [db])

  const current = useMemo(
    () => catalogs.find((c) => c.id === currentId) || catalogs[0],
    [catalogs, currentId],
  )
  const resolved = useMemo(() => resolveCatalog(db, current), [db, current])

  // Persist (debounced by React batching; localStorage write is cheap enough)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ overrides, catalogs, currentId }))
    } catch { /* quota — ignore */ }
  }, [overrides, catalogs, currentId])

  // ---- catalog update plumbing --------------------------------------------
  const patchCurrent = useCallback((transform) => {
    setCatalogs((cs) => cs.map((c) => (c.id === currentId ? transform(c) : c)))
  }, [currentId])

  // Ensure the catalog is in manual mode with a manual array for every
  // included category (README §"Manual vs rule reconciliation").
  const ensured = useCallback((c) => {
    if (c.sortKey !== 'manual') {
      return { ...c, priorSort: c.sortKey, sortKey: 'manual', manual: seedManualFromRules(db, c) }
    }
    const missing = includedCategoryIds(db, c).filter((id) => !c.manual[id])
    if (missing.length === 0) return c
    const seeded = seedManualFromRules(db, { ...c, sortKey: c.priorSort || 'sales' })
    const manual = { ...c.manual }
    for (const id of missing) manual[id] = seeded[id] || []
    return { ...c, manual }
  }, [db])

  const materializeCats = useCallback((c) => includedCategoryIds(db, c), [db])

  // ---- structural edits (force manual) ------------------------------------
  const moveProduct = useCallback(({ pid, fromCat, toCat, beforePid = null }) => {
    patchCurrent((c0) => {
      const c = ensured(c0)
      const manual = { ...c.manual }
      const from = (manual[fromCat] || []).filter((x) => x !== pid)
      manual[fromCat] = from
      let to = fromCat === toCat ? from : (manual[toCat] || []).filter((x) => x !== pid)
      if (beforePid == null || beforePid === pid) {
        to = [...to, pid]
      } else {
        const idx = to.indexOf(beforePid)
        to = idx < 0 ? [...to, pid] : [...to.slice(0, idx), pid, ...to.slice(idx)]
      }
      manual[toCat] = to
      return { ...c, manual }
    })
  }, [patchCurrent, ensured])

  const reorderProduct = useCallback((pid, catId, dir) => {
    patchCurrent((c0) => {
      const c = ensured(c0)
      const arr = [...(c.manual[catId] || [])]
      const i = arr.indexOf(pid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return c
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...c, manual: { ...c.manual, [catId]: arr } }
    })
  }, [patchCurrent, ensured])

  const removeProduct = useCallback((pid, catId) => {
    patchCurrent((c0) => {
      const c = ensured(c0)
      return { ...c, manual: { ...c.manual, [catId]: (c.manual[catId] || []).filter((x) => x !== pid) } }
    })
  }, [patchCurrent, ensured])

  const addProduct = useCallback((pid, catId) => {
    patchCurrent((c0) => {
      const c = ensured(c0)
      const arr = c.manual[catId] || []
      if (arr.includes(pid)) return c
      return { ...c, manual: { ...c.manual, [catId]: [...arr, pid] } }
    })
  }, [patchCurrent, ensured])

  // ---- sort (whole document) ----------------------------------------------
  const setSort = useCallback((key) => {
    patchCurrent((c) => {
      if (key === 'manual') {
        return { ...c, priorSort: c.sortKey === 'manual' ? c.priorSort : c.sortKey, sortKey: 'manual', manual: seedManualFromRules(db, c) }
      }
      return { ...c, sortKey: key, manual: {} } // clears manual overrides
    })
  }, [patchCurrent, db])

  // ---- filter (reflows rule-based sections) -------------------------------
  const toggleCategory = useCallback((catId) => {
    patchCurrent((c) => {
      const cur = materializeCats(c)
      const has = cur.includes(catId)
      const order = db.categories.map((x) => x.id)
      const next = has
        ? cur.filter((id) => id !== catId)
        : [...cur, catId].sort((a, b) => order.indexOf(a) - order.indexOf(b))
      return { ...c, categoryIds: next }
    })
  }, [patchCurrent, materializeCats, db])

  const addSection = useCallback((catId) => {
    patchCurrent((c) => {
      const cur = materializeCats(c)
      if (cur.includes(catId)) return c
      return { ...c, categoryIds: [...cur, catId] } // append at end
    })
  }, [patchCurrent, materializeCats])

  const removeSection = useCallback((catId) => {
    patchCurrent((c) => ({ ...c, categoryIds: materializeCats(c).filter((id) => id !== catId) }))
  }, [patchCurrent, materializeCats])

  const setTopN = useCallback((n) => {
    patchCurrent((c) => ({ ...c, topN: clamp(parseInt(n, 10) || 0, 0, 999) }))
  }, [patchCurrent])

  const toggleSupplier = useCallback((sid) => {
    patchCurrent((c) => {
      const all = db.suppliers.map((s) => s.id)
      const cur = c.supplierIds || all
      const has = cur.includes(sid)
      const next = has ? cur.filter((x) => x !== sid) : [...cur, sid]
      return { ...c, supplierIds: next.length === all.length ? null : next }
    })
  }, [patchCurrent, db])

  const allSuppliers = useCallback(() => patchCurrent((c) => ({ ...c, supplierIds: null })), [patchCurrent])
  const noSuppliers = useCallback(() => patchCurrent((c) => ({ ...c, supplierIds: [] })), [patchCurrent])

  // ---- per-section view options -------------------------------------------
  const setColumns = useCallback((catId, delta) => {
    patchCurrent((c) => {
      const cur = (c.columnsBySection[catId]) || c.columns || DEFAULT_COLUMNS
      const next = clamp(cur + delta, MIN_COLS, MAX_COLS)
      return { ...c, columnsBySection: { ...c.columnsBySection, [catId]: next } }
    })
  }, [patchCurrent])

  const toggleField = useCallback((catId, field) => {
    patchCurrent((c) => {
      const cur = { ...DEFAULT_FIELDS, ...(c.fieldsBySection[catId]) }
      cur[field] = !cur[field]
      return { ...c, fieldsBySection: { ...c.fieldsBySection, [catId]: cur } }
    })
  }, [patchCurrent])

  const renameSection = useCallback((catId, title) => {
    patchCurrent((c) => ({ ...c, titleOverrides: { ...c.titleOverrides, [catId]: title } }))
  }, [patchCurrent])

  // ---- cover / catalog meta ------------------------------------------------
  const renameCatalog = useCallback((name) => patchCurrent((c) => ({ ...c, name })), [patchCurrent])
  const setCoverDesc = useCallback((desc) => patchCurrent((c) => ({ ...c, desc })), [patchCurrent])

  // ---- catalog switch / create --------------------------------------------
  const switchCatalog = useCallback((id) => setCurrentId(id), [])
  const createCatalog = useCallback(() => {
    const id = uid('cat')
    const n = catalogs.length + 1
    const fresh = {
      id, name: `Новый каталог ${n}`, client: 'КЛИЕНТ',
      desc: 'Черновик каталога на основе общей базы. Настройте разделы, сортировку и подбор.',
      supplierIds: null, categoryIds: null, topN: 4, sortKey: 'sales',
      columns: 4, columnsBySection: {}, fieldsBySection: {},
      titleOverrides: {}, manual: {}, priorSort: 'sales',
    }
    setCatalogs((cs) => [...cs, fresh])
    setCurrentId(id)
    return fresh
  }, [catalogs.length])

  // ---- shared-DB product edits (propagate to all catalogs) ----------------
  const updateProduct = useCallback((id, patch) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  }, [])

  return {
    db, ranks, catalogs, current, currentId, resolved,
    actions: {
      moveProduct, reorderProduct, removeProduct, addProduct,
      setSort, toggleCategory, addSection, removeSection, setTopN,
      toggleSupplier, allSuppliers, noSuppliers,
      setColumns, toggleField, renameSection,
      renameCatalog, setCoverDesc,
      switchCatalog, createCatalog, updateProduct,
    },
  }
}
