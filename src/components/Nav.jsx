import { I18N } from '../i18n.js'

const LANGS = ['uz', 'en', 'ru', 'kk']

export default function Nav({ t, lang, setLang, page, onNav, dark = false, children }) {
  const bg = dark ? 'transparent' : '#16241E'
  const border = dark ? '1px solid rgba(255,255,255,.1)' : 'none'

  return (
    <nav style={{
      background: bg,
      borderBottom: border,
      height: 64,
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: 32,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <img src="/assets/alpha-mark.png" alt="α" style={{ height: 32, width: 32, objectFit: 'contain', filter: dark ? 'none' : 'brightness(0) invert(1)' }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13, color: dark ? '#EDEFEC' : '#fff', letterSpacing: 2 }}>ALPHA</span>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {['catalog', 'about'].map(p => {
          const label = p === 'catalog' ? t.nav_catalog : t.nav_company
          const active = page === p
          return (
            <button
              key={p}
              onClick={() => onNav(p)}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: active ? (dark ? '#8FD3BC' : '#8FD3BC') : (dark ? 'rgba(237,239,236,.6)' : 'rgba(255,255,255,.55)'),
                borderBottom: active ? `2px solid ${dark ? '#8FD3BC' : '#8FD3BC'}` : '2px solid transparent',
                paddingBottom: 2,
                transition: 'color .2s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {children}

      <div style={{ display: 'flex', gap: 2 }}>
        {LANGS.map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              background: lang === l ? (dark ? '#8FD3BC' : '#1F6E5A') : 'transparent',
              color: lang === l ? (dark ? '#080B0A' : '#fff') : (dark ? 'rgba(237,239,236,.6)' : 'rgba(255,255,255,.55)'),
              border: `1px solid ${dark ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.2)'}`,
              letterSpacing: 1,
            }}
          >
            {I18N[l]._abbr}
          </button>
        ))}
      </div>
    </nav>
  )
}
