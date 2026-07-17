// Resolution pipeline: turn a catalog (recipe) + shared DB into rendered sections.
// See README §"Resolution pipeline". Pure functions, no React.

export const DEFAULT_FIELDS = { photo: true, code: true, supplier: true, salesBar: true }
export const DEFAULT_COLUMNS = 4
export const MIN_COLS = 2
export const MAX_COLS = 6

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true })

// Comparators for each rule-based sort key
const COMPARATORS = {
  sales: (a, b) => (b.sales - a.sales) || collator.compare(a.name, b.name),
  price: (a, b) => (a.price - b.price) || collator.compare(a.name, b.name),
  name: (a, b) => collator.compare(a.name, b.name),
  supplier: (a, b) =>
    collator.compare(a.supplierName || '￿', b.supplierName || '￿') ||
    (b.sales - a.sales),
}

export const SORT_LABELS = {
  sales: 'продажам',
  price: 'цене',
  name: 'названию',
  supplier: 'поставщику',
  manual: 'вручную',
}

function supplierAllowed(catalog, product) {
  if (!catalog.supplierIds) return true // null = all
  return catalog.supplierIds.includes(product.supplierId)
}

// Included category ids, in section order. null = all categories in display order.
export function includedCategoryIds(db, catalog) {
  if (!catalog.categoryIds) return db.categories.map((c) => c.id)
  return catalog.categoryIds.filter((id) => db.byCat.has(id))
}

// Doc-wide top-3 by sales -> { productId: rank(1..3) }
export function computeRanks(db) {
  const ranked = [...db.products].sort((a, b) => b.sales - a.sales)
  const out = {}
  for (let i = 0; i < Math.min(3, ranked.length); i++) out[ranked[i].id] = i + 1
  return out
}

// Full resolution -> { sections, stats }
export function resolveCatalog(db, catalog) {
  const catIds = includedCategoryIds(db, catalog)
  const sortKey = catalog.sortKey || 'sales'
  const topN = catalog.topN || 0 // 0 = all
  const sections = []

  for (const catId of catIds) {
    const cat = db.catById.get(catId)
    if (!cat) continue

    let items
    const manual = catalog.manual && catalog.manual[catId]
    if (manual) {
      // Manual section: order defined by the manual array, reconciled to
      // still-existing + supplier-allowed products (any categoryId).
      items = manual
        .map((pid) => db.byId.get(pid))
        .filter((p) => p && supplierAllowed(catalog, p))
    } else {
      items = (db.byCat.get(catId) || []).filter((p) => supplierAllowed(catalog, p))
      const cmp = COMPARATORS[sortKey] || COMPARATORS.sales
      items = [...items].sort(cmp)
      if (topN > 0) items = items.slice(0, topN)
    }

    if (items.length === 0) continue // drop empty sections

    const title = (catalog.titleOverrides && catalog.titleOverrides[catId]) || cat.name
    const columns = (catalog.columnsBySection && catalog.columnsBySection[catId]) || catalog.columns || DEFAULT_COLUMNS
    const fields = { ...DEFAULT_FIELDS, ...(catalog.fieldsBySection && catalog.fieldsBySection[catId]) }
    const qty = items.reduce((s, p) => s + (p.sales || 0), 0)

    sections.push({
      catId,
      title,
      baseName: cat.name,
      items,
      columns,
      fields,
      manual: !!manual,
      count: items.length,
      qty,
    })
  }

  // Cover stats — computed from resolved items
  const allItems = sections.flatMap((s) => s.items)
  const uniqueSuppliers = new Set(allItems.map((p) => p.supplierId).filter(Boolean))
  const stats = {
    items: allItems.length,
    cats: sections.length,
    suppliers: uniqueSuppliers.size,
  }

  return { sections, stats }
}

// Seed a manual array for every included category from current rule output.
// Called by ensureManual before any structural edit.
export function seedManualFromRules(db, catalog) {
  const { sections } = resolveCatalog(db, catalog)
  const manual = {}
  for (const catId of includedCategoryIds(db, catalog)) {
    const sec = sections.find((s) => s.catId === catId)
    manual[catId] = sec ? sec.items.map((p) => p.id) : []
  }
  return manual
}
