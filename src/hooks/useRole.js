
import { useState, useEffect, createContext, useContext } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'

export const RoleContext = createContext({ rol: null, yukleniyor: true })

export function useRole() {
  return useContext(RoleContext)
}

export function useRoleProvider() {
  const [rol, setRol] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setRol(null); setYukleniyor(false); return }
      try {
        const snap = await getDoc(doc(db, 'kullanicilar', user.uid))
        if (snap.exists()) {
          setRol(snap.data().rol || 'operasyon')
        } else {
          // İlk giriş — admin olarak kaydet (ilk kullanıcı)
          const tenantId = user.email?.split('@')[1] || 'default'
          await setDoc(doc(db, 'kullanicilar', user.uid), {
            email: user.email, ad: user.email,
            rol: 'admin', tenant_id: tenantId, aktif: true
          })
          setRol('admin')
        }
      } catch { setRol('operasyon') }
      setYukleniyor(false)
    })
    return unsub
  }, [])

  return { rol, yukleniyor }
}

// Yetki kontrolleri
export const canDelete = (rol) => ['admin', 'finansal_operasyon'].includes(rol)
export const canSeeMali = (rol) => ['admin', 'finansal_operasyon'].includes(rol)
export const canManageUsers = (rol) => rol === 'admin'
export const isOperasyon = (rol) => rol === 'operasyon'
