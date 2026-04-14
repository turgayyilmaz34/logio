import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from './hooks/useAuthState'
import { RoleContext, useRoleProvider } from './hooks/useRole'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tesisler from './pages/Tesisler'
import Musteriler from './pages/Musteriler'
import Sozlesmeler from './pages/Sozlesmeler'
import Projeler from './pages/Projeler'
import Ihaleler from './pages/Ihaleler'
import GrupSirketleri from './pages/GrupSirketleri'
import Raporlar from './pages/Raporlar'
import Kullanicilar from './pages/Kullanicilar'
import Anketler from './pages/Anketler'
import AnketDoldur from './pages/AnketDoldur'
import Taseronlar from './pages/Taseronlar'
import Rotalar from './pages/Rotalar'
import Layout from './components/Layout'

function AppWithRole() {
  const roleData = useRoleProvider()
  const { user, loading } = useAuthState()

  if (loading || roleData.yukleniyor) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-2xl font-semibold text-blue-700 mb-2">Logio</div>
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      </div>
    </div>
  )

  return (
    <RoleContext.Provider value={roleData}>
      <BrowserRouter>
        <Routes>
          <Route path="/anket/:token" element={<AnketDoldur />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="tesisler" element={<Tesisler />} />
            <Route path="musteriler" element={<Musteriler />} />
            <Route path="sozlesmeler" element={<Sozlesmeler />} />
            <Route path="projeler" element={<Projeler />} />
            <Route path="ihaleler" element={<Ihaleler />} />
            <Route path="raporlar" element={<Raporlar />} />
            <Route path="anketler" element={<Anketler />} />
            <Route path="grup-sirketleri" element={<GrupSirketleri />} />
            <Route path="kullanicilar" element={<Kullanicilar />} />
            <Route path="taseronlar" element={<Taseronlar />} />
            <Route path="rotalar" element={<Rotalar />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleContext.Provider>
  )
}

export default function App() { return <AppWithRole /> }
