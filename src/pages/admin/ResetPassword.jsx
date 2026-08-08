import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../admin/AuthContext.jsx'

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  // Invited teammates get welcome copy; existing admins get reset copy.
  const isInvite = typeof window !== 'undefined' && window.__authFlowType === 'invite'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) return setError(error.message || 'Could not update your password. The link may have expired.')
    setDone(true)
    setTimeout(() => navigate('/admin', { replace: true }), 1800)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <img src="/assets/img/logo2.png" alt="FlyUp Line" className="admin-login-logo" />
        {done ? (
          <>
            <h1>{isInvite ? 'Welcome aboard' : 'Password updated'}</h1>
            <p className="muted">You're all set — taking you to the dashboard…</p>
          </>
        ) : loading ? (
          <p className="muted">{isInvite ? 'Checking your invitation…' : 'Checking your reset link…'}</p>
        ) : !session ? (
          <>
            <h1>Link expired</h1>
            <p className="muted">
              {isInvite
                ? 'This invitation link is invalid or has expired. Ask your administrator to send a new one.'
                : 'This password-reset link is invalid or has expired.'}
            </p>
            <Link to="/admin/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Go to sign in</Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <h1>{isInvite ? 'Create your password' : 'Set a new password'}</h1>
            <p className="muted">
              {isInvite
                ? "You've been invited to the FlyUp Line admin. Choose a password to finish setting up your account."
                : 'Choose a new password for your admin account.'}
            </p>
            {error && <div className="admin-alert error">{error}</div>}
            <label className="admin-field">
              <span>New password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
            </label>
            <label className="admin-field">
              <span>Confirm password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </label>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Saving…' : isInvite ? 'Create password & continue' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
