import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuthState'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tesisler from './pages/Tesisler'
import Musteriler from './pages/Musteriler'
import Sozlesmeler from './pages/Sozlesmeler'
import Projeler from './pages/Projeler'
import Ihaleler from './pages/Ihaleler'
import GrupSirketleri from './pages/GrupSirketleri'
import Layout from './components/Layout'

const Yapiyor = ({ sayfa }) => (
  <div className="p-8">
    <div className="text-xl font-semibold text-gray-800 mb-2">{sayfa}</div>
    <div className="text-sm text-gray-400">Bu modül yakında hazır olacak.</div>
  </div>
)

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
          <Route path="tesisler" element={<Tesisler />} />
          <Route path="musteriler" element={<Musteriler />} />
          <Route path="sozlesmeler" element={<Sozlesmeler />} />
          <Route path="projeler" element={<Projeler />} />
          <Route path="ihaleler" element={<Ihaleler />} />
          <Route path="grup-sirketleri" element={<GrupSirketleri />} />
          <Route path="raporlar" element={<Yapiyor sayfa="Raporlar" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
