import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useRole, canManageUsers } from '../hooks/useRole'

const ROL_LABEL = { admin: 'Admin', finansal_operasyon: 'Fin. Op.', operasyon: 'Operasyon' }
const ROL_RENK = { admin: 'bg-blue-100 text-blue-700', finansal_operasyon: 'bg-purple-100 text-purple-700', operasyon: 'bg-green-100 text-green-700' }

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/tesisler', label: 'Tesisler', icon: '🏭' },
  { to: '/musteriler', label: 'Müşteriler', icon: '👥' },
  { to: '/sozlesmeler', label: 'Sözleşmeler', icon: '📋' },
  { to: '/projeler', label: 'Projeler', icon: '📁' },
  { to: '/ihaleler', label: 'İhaleler', icon: '🏆' },
  { to: '/raporlar', label: 'Raporlar', icon: '📊' },
  { to: '/anketler', label: 'Anketler', icon: '📝' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { rol } = useRole()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="text-xl font-semibold text-blue-700 tracking-tight">Logio</div>
          <div className="text-xs text-gray-400 mt-0.5">Operasyon Platformu</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
                }`
              }>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="pt-3 mt-3 border-t border-gray-100">
            <div className="text-xs text-gray-300 uppercase tracking-wide px-3 mb-1">Tanımlar</div>
            <NavLink to="/grup-sirketleri"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`
              }>
              <span>🏢</span> Grup Şirketleri
            </NavLink>
            {canManageUsers(rol) && (
              <NavLink to="/kullanicilar"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`
                }>
                <span>👤</span> Kullanıcılar
              </NavLink>
            )}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          {rol && (
            <div className="px-3 py-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_RENK[rol] || ''}`}>
                {ROL_LABEL[rol] || rol}
              </span>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <span>↩</span>
            Çıkış
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
