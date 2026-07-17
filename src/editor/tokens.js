// Design tokens + tiny style helpers for the Living Catalog Editor.
// Colors mirror README §"Design Tokens". Font helpers keep inline styles terse.

export const C = {
  deep: '#133D33',      // cover, headers, toolbars
  brand: '#1F6E5A',     // primary actions, accents, selection outline
  mint: '#8FD3BC',      // on-dark accents, active toggles, sales bars
  warm: '#E9E6DB',      // text on dark
  canvas: '#E7E3DA',    // app background
  app: '#F4F2EA',
  panel: '#FBFAF6',
  paper: '#FCFBF7',
  white: '#FFFFFF',
  empty: '#FAF9F4',     // empty-photo bg
  rust: '#D2691E',      // rank badge, destructive
  rustSoft: '#E5A579',  // on-dark destructive
  sheets: '#0F9D58',
  drive: '#F4B400',
}

// Rotating card photo tints (README §product card)
export const TINTS = ['#DCEFE6', '#E9F4EE', '#D3EBDF', '#E2F0E8']
export const tintFor = (i) => TINTS[i % TINTS.length]

const UI = 'var(--ui)'
const MONO = 'var(--mono)'

// font: weight size family  ->  style object
export const ui = (weight, size, color) => ({
  fontFamily: UI, fontWeight: weight, fontSize: size, ...(color ? { color } : {}),
})
export const mono = (weight, size, color) => ({
  fontFamily: MONO, fontWeight: weight, fontSize: size, ...(color ? { color } : {}),
})

// Hairline helpers
export const line = (a = 0.12) => `1px solid rgba(19,61,51,${a})`
export const lineOnDark = (a = 0.12) => `1px solid rgba(255,255,255,${a})`

export const SHADOW = {
  card: '0 1px 2px rgba(19,61,51,0.05)',
  popover: '0 14px 34px rgba(0,0,0,0.16)',
  floating: '0 8px 20px rgba(0,0,0,0.28)',
  page: '0 18px 50px rgba(0,0,0,0.4)',
  toast: '0 8px 24px rgba(0,0,0,0.28)',
}
