import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext.jsx'
import AdminRoute from './AdminRoute.jsx'
import AdminLayout from './AdminLayout.jsx'
import AdminLogin from '../pages/admin/Login.jsx'
import Dashboard from '../pages/admin/Dashboard.jsx'
import RequestDetail from '../pages/admin/RequestDetail.jsx'

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="quotes/:id" element={<RequestDetail />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
