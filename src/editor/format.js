// Formatting + small pure helpers shared across the editor.

const NBSP = ' '

// UZS price: space-separated thousands + " сум"  e.g. 46000 -> "46 000 сум"
export function formatPrice(n) {
  const v = Math.max(0, Math.round(Number(n) || 0))
  const grouped = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${grouped}${NBSP}сум`
}

// Plain grouped integer (no suffix) — for sales/quantity meta
export function formatInt(n) {
  const v = Math.round(Number(n) || 0)
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

// Parse a user-typed price back to an integer (strip spaces, сум, etc.)
export function parsePrice(str) {
  const digits = String(str).replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

// First meaningful letter for the monogram placeholder
export function monogram(name) {
  const ch = (name || '').trim().charAt(0)
  return ch ? ch.toUpperCase() : '·'
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
