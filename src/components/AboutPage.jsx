import Nav from './Nav.jsx'

const PHONES = [
  { key: 'ph_main', num: '+998 90 819 77 22', channels: ['call'] },
  { key: 'ph_sales', num: '+998 88 725 80 88', channels: ['call', 'telegram'] },
  { key: 'ph_order', num: '+998 50 725 08 00', channels: ['call', 'telegram', 'whatsapp'] },
]

const CH_COLOR = {
  call: '#8FD3BC',
  telegram: '#5AB8F0',
  whatsapp: '#4BE08B',
}

const STATS = [
  { num: '15+', key: 'st_years', color: '#8FD3BC' },
  { num: '744', key: 'st_skus', color: '#8FD3BC' },
  { num: '11', key: 'st_sup', color: '#8FD3BC' },
  { num: '3', key: 'st_cur', color: '#E8923A' },
]

const SHOWCASE_IMAGES = ['p0001.jpg', 'p0003.jpg', 'p0006.jpg']

export default function AboutPage({ t, lang, setLang, onNav }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080B0A', color: '#EDEFEC', fontFamily: "'Archivo', sans-serif" }}>
      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,110,90,.35) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '60%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,110,90,.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav t={t} lang={lang} setLang={setLang} page="about" onNav={onNav} dark />

        {/* Hero */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(48px, 10vw, 96px) 32px clamp(40px,8vw,80px)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(143,211,188,.3)',
            background: 'rgba(31,110,90,.15)',
            borderRadius: 100, padding: '6px 16px',
            marginBottom: 32,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8FD3BC', boxShadow: '0 0 8px #8FD3BC' }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8FD3BC', letterSpacing: 1 }}>{t.eyebrow}</span>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: 'clamp(36px, 6vw, 66px)', lineHeight: 1.1, marginBottom: 24 }}>
            <span style={{ color: '#EDEFEC' }}>{t.hero_title_a} </span>
            <span style={{ background: 'linear-gradient(90deg, #8FD3BC, #3FA98A, #E8923A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t.hero_title_b}
            </span>
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(237,239,236,.7)', maxWidth: 620, lineHeight: 1.65 }}>{t.hero_sub}</p>
        </section>

        {/* Showcase */}
        <section style={{ padding: '0 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {SHOWCASE_IMAGES.map((img, i) => (
              <div key={i} style={{
                borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
              }}>
                <img src={`/assets/images/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.85)' }} />
              </div>
            ))}
          </div>
        </section>

        {/* About / Stats */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px, 4vw, 46px)', marginBottom: 40 }}>{t.about_h}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
            {STATS.map(({ num, key, color }) => (
              <div key={key} style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
                border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 16, padding: '28px 24px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,110,90,.4) 0%, transparent 70%)' }} />
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 'clamp(32px,4vw,58px)', color, lineHeight: 1, marginBottom: 8 }}>{num}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(237,239,236,.55)', letterSpacing: 0.5, lineHeight: 1.5 }}>{t[key]}</div>
              </div>
            ))}
          </div>

          {/* Story + quote */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 16, padding: '32px',
            }}>
              <p style={{ color: 'rgba(237,239,236,.75)', lineHeight: 1.7, marginBottom: 16 }}>{t.about_p1}</p>
              <p style={{ color: 'rgba(237,239,236,.75)', lineHeight: 1.7 }}>{t.about_p2}</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(31,110,90,.5), rgba(31,110,90,.12))',
              border: '1px solid rgba(143,211,188,.2)',
              borderRadius: 16, padding: '32px',
            }}>
              <div style={{ fontSize: 72, lineHeight: 0.8, color: 'rgba(143,211,188,.3)', fontWeight: 900, marginBottom: 16 }}>"</div>
              <p style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.5, marginBottom: 16 }}>{t.quote}</p>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(237,239,236,.55)' }}>{t.quote_attr}</p>
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#8FD3BC', letterSpacing: 2, marginBottom: 12 }}>{t.contact_eyebrow.toUpperCase()}</div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(28px, 4vw, 46px)', marginBottom: 40 }}>{t.contact_h}</h2>

          <div style={{
            background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)',
            borderRadius: 20, padding: 'clamp(24px, 4vw, 40px)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              {PHONES.map(({ key, num, channels }) => (
                <div key={key} style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 12, padding: '20px 20px',
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(237,239,236,.5)', letterSpacing: 1, marginBottom: 8 }}>{t[key]}</div>
                  <a href={`tel:${num.replace(/\s/g,'')}`} style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, color: '#EDEFEC', display: 'block', marginBottom: 12 }}>{num}</a>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {channels.map(ch => (
                      <span key={ch} style={{ padding: '3px 8px', borderRadius: 100, background: `${CH_COLOR[ch]}22`, border: `1px solid ${CH_COLOR[ch]}55`, color: CH_COLOR[ch], fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                        {ch === 'call' ? t.ch_call : ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: t.addr_label, val: t.addr_val },
                { label: t.email_label, val: 'info@alfapolimer.uz' },
                { label: t.work_label, val: t.hours },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 12, padding: '20px',
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(237,239,236,.5)', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 14, color: '#EDEFEC' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(237,239,236,.4)' }}>{t.foot_rights}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(237,239,236,.3)' }}>1 USD = 12 020 UZS · 1 USD = 294 KZT</span>
        </footer>
      </div>
    </div>
  )
}
