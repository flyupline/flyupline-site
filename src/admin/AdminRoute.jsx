import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function AdminRoute({ children }) {
  const { loading, session, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="admin-boot">
        <div className="admin-spinner" />
      </div>
    )
  }
  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname, denied: session && !isAdmin }} />
  }
  return children
}
