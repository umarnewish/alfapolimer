import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (telegramUser) => {
    const inviteToken = new URLSearchParams(window.location.search).get('invite')
    const { user } = await api.loginTelegram(inviteToken ? { ...telegramUser, invite_token: inviteToken } : telegramUser)
    if (inviteToken) {
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url)
    }
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = { user, isAuthenticated: !!user, loading, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
