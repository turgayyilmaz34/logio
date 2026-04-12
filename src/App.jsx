
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuthState'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'

export default function App() {
  const { user, loading } = useAuthState()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-2xl font-semibold text-blue-700 mb-2">Logio</div>
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
