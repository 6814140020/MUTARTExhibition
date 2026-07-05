import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Stock from './pages/Stock'
import Purchase from './pages/Purchase'
import Team from './pages/Team'
function LoginRoute() {
     const { session, loading } = useAuth()
     if (loading) return null
     if (session) return <Navigate to="/" replace />
     return <Login />
   }
function Gate({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
<Route path="/login" element={<LoginRoute />} />      <Route
        path="/"
        element={
          <Gate>
            <Layout />
          </Gate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="finance" element={<Finance />} />
        <Route path="stock" element={<Stock />} />
        <Route path="purchase" element={<Purchase />} />
        <Route path="team" element={<Team />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
