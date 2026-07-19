import { useState } from 'react'
import { useAuth } from '../lib/AuthProvider.jsx'
import { C, ui, mono } from '../editor/tokens.js'

const ERROR_MESSAGES = {
  invalid_credentials: 'Неверный логин или пароль.',
}

export default function SignIn() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || 'Не удалось войти. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.canvas, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 380, background: C.deep, borderRadius: 12, position: 'relative',
        overflow: 'hidden', padding: '40px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
      }}>
        <div style={{ position: 'absolute', right: -40, bottom: -70, fontWeight: 900, fontSize: 320, color: 'rgba(143,211,188,0.08)', lineHeight: 1, fontFamily: 'var(--ui)', pointerEvents: 'none' }}>α</div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(143,211,188,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <span style={{ ...ui(900, 26, C.mint) }}>α</span>
          </div>
          <div style={{ ...mono(700, 11, C.mint), letterSpacing: '0.12em' }}>ЖИВОЙ КАТАЛОГ</div>
          <h1 style={{ ...ui(900, 28, C.warm), margin: '10px 0 24px', lineHeight: 1.15 }}>Alpha Polimer Line</h1>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Логин">
              <input
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" autoFocus style={fieldStyle}
              />
            </Field>
            <Field label="Пароль">
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" style={fieldStyle}
              />
            </Field>
            <button type="submit" disabled={busy || !username.trim() || !password} style={{
              marginTop: 8, background: C.brand, border: 'none', borderRadius: 8, padding: '12px 14px',
              cursor: busy ? 'default' : 'pointer', opacity: busy || !username.trim() || !password ? 0.6 : 1,
              ...ui(700, 14, '#fff'),
            }}>
              {busy ? 'Входим…' : 'Войти'}
            </button>
            {error && (
              <div style={{ ...ui(400, 12, '#F0A98A'), lineHeight: 1.5, marginTop: 2 }}>{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...mono(700, 10, 'rgba(233,230,219,0.55)'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </label>
  )
}

const fieldStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(143,211,188,0.25)',
  borderRadius: 8, padding: '11px 12px', ...ui(400, 14, C.warm),
}
