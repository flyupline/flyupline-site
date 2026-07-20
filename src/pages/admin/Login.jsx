import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../admin/AuthContext.jsx'

export default function AdminLogin() {
  const { login, session, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.denied ? 'That account does not have admin access.' : '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && session && isAdmin) navigate('/admin', { replace: true })
  }, [loading, session, isAdmin, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await login(email.trim(), password)
    setBusy(false)
    if (error) {
      setError('Invalid email or password.')
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <img src="/assets/img/logo2.png" alt="FlyUp Line" className="admin-login-logo" />
        <h1>Admin sign in</h1>
        <p className="muted">Manage quote requests and send customer quotes.</p>
        {error && <div className="admin-alert error">{error}</div>}
        <label className="admin-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
