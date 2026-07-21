import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../admin/AuthContext.jsx'

export default function AdminLogin() {
  const { login, resetPassword, session, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.denied ? 'That account does not have admin access.' : '')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && session && isAdmin) navigate('/admin', { replace: true })
  }, [loading, session, isAdmin, navigate])

  const onLogin = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await login(email.trim(), password)
    setBusy(false)
    if (error) return setError('Invalid email or password.')
    navigate('/admin', { replace: true })
  }

  const onForgot = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const { error } = await resetPassword(email.trim())
    setBusy(false)
    // Always show a neutral confirmation (don't reveal whether an account exists).
    if (error && error.status && error.status >= 500) return setError('Could not send the reset email. Please try again.')
    setNotice('If an admin account exists for that email, a password-reset link is on its way. Check your inbox.')
  }

  return (
    <div className="admin-login">
      {mode === 'login' ? (
        <form className="admin-login-card" onSubmit={onLogin}>
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
          <button type="button" className="admin-link" onClick={() => { setMode('forgot'); setError(''); setNotice('') }}>
            Forgot password?
          </button>
        </form>
      ) : (
        <form className="admin-login-card" onSubmit={onForgot}>
          <img src="/assets/img/logo2.png" alt="FlyUp Line" className="admin-login-logo" />
          <h1>Reset password</h1>
          <p className="muted">Enter your admin email and we'll send you a reset link.</p>
          {error && <div className="admin-alert error">{error}</div>}
          {notice && <div className="admin-alert ok">{notice}</div>}
          <label className="admin-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <button type="button" className="admin-link" onClick={() => { setMode('login'); setError(''); setNotice('') }}>
            ← Back to sign in
          </button>
        </form>
      )}
    </div>
  )
}
