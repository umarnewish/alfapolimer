// Client-side editor: the only server surface we need is Telegram auth.
// Catalog/product state lives in the browser (see editor/useCatalogStore.js).

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch { /* ignore */ }
    const err = new Error(detail)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  loginTelegram: (telegramUser) => request('/auth/telegram', { method: 'POST', body: JSON.stringify(telegramUser) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
}
