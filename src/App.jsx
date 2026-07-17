import { useAuth } from './lib/AuthProvider.jsx'
import SignIn from './auth/SignIn.jsx'
import Editor from './editor/Editor.jsx'

export default function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--brand)', fontFamily: 'var(--mono)', fontSize: 12 }}>
        загрузка…
      </div>
    )
  }
  return isAuthenticated ? <Editor /> : <SignIn />
}
