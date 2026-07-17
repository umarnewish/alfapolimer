import TelegramLoginButton from './TelegramLoginButton.jsx'
import { C, ui, mono } from '../editor/tokens.js'

export default function SignIn() {
  const configured = !!import.meta.env.VITE_TELEGRAM_BOT_USERNAME

  return (
    <div style={{ minHeight: '100vh', background: C.canvas, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 400, background: C.deep, borderRadius: 12, position: 'relative',
        overflow: 'hidden', padding: '44px 40px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
      }}>
        <div style={{ position: 'absolute', right: -40, bottom: -70, fontWeight: 900, fontSize: 320, color: 'rgba(143,211,188,0.08)', lineHeight: 1, fontFamily: 'var(--ui)', pointerEvents: 'none' }}>α</div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(143,211,188,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <span style={{ ...ui(900, 26, C.mint) }}>α</span>
          </div>
          <div style={{ ...mono(700, 11, C.mint), letterSpacing: '0.12em' }}>ЖИВОЙ КАТАЛОГ</div>
          <h1 style={{ ...ui(900, 30, C.warm), margin: '10px 0 0', lineHeight: 1.1 }}>Alpha Polimer Line</h1>
          <p style={{ ...ui(400, 14, 'rgba(233,230,219,0.6)'), lineHeight: 1.6, margin: '12px 0 28px', maxWidth: 300 }}>
            Редактор каталога для сотрудников. Войдите через Telegram, чтобы продолжить.
          </p>

          {configured ? (
            <TelegramLoginButton />
          ) : (
            <div style={{ ...mono(400, 11, 'rgba(233,230,219,0.7)'), lineHeight: 1.6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(143,211,188,0.2)', borderRadius: 8, padding: 14 }}>
              Не задан <span style={{ color: C.mint }}>VITE_TELEGRAM_BOT_USERNAME</span>.<br />
              Укажите имя бота в <span style={{ color: C.mint }}>.env</span>, чтобы включить вход.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
