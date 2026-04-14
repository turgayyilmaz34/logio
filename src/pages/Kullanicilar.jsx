
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canManageUsers } from '../hooks/useRole'

const ROL_LABEL = { admin: 'Admin', finansal_operasyon: 'Finansal Operasyon', operasyon: 'Operasyon' }
const ROL_RENK = {
  admin: 'bg-blue-50 text-blue-700',
  finansal_operasyon: 'bg-purple-50 text-purple-700',
  operasyon: 'bg-green-50 text-green-700',
}

export default function Kullanicilar() {
  const { rol } = useRole()
  const [kullanicilar, setKullanicilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState({ email: '', ad: '', rol: 'operasyon' })
  const [duzenleId, setDuzenleId] = useState(null)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'kullanicilar'), where('tenant_id', '==', tenantId)))
    setKullanicilar(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  if (!canManageUsers(rol)) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-sm text-red-600">
        Bu sayfaya erişim yetkiniz yok.
      </div>
    </div>
  )

  const kaydet = async () => {
    if (!form.email || !form.ad) return alert('E-posta ve ad zorunludur.')
    if (duzenleId) {
      await updateDoc(doc(db, 'kullanicilar', duzenleId), { ad: form.ad, rol: form.rol })
    } else {
      // Yeni kullanıcı — Firebase UID'si olmadan email bazlı kayıt
      // Kullanıcı ilk giriş yapınca UID ile eşleşecek
      const tempId = `pending_${form.email.replace(/[^a-z0-9]/gi, '_')}`
      await setDoc(doc(db, 'kullanicilar', tempId), {
        email: form.email, ad: form.ad, rol: form.rol,
        tenant_id: tenantId, aktif: true, pending: true
      })
    }
    setFormAcik(false)
    setDuzenleId(null)
    setForm({ email: '', ad: '', rol: 'operasyon' })
    yukle()
  }

  const rolDegistir = async (id, yeniRol) => {
    await updateDoc(doc(db, 'kullanicilar', id), { rol: yeniRol })
    yukle()
  }

  const aktifToggle = async (id, mevcut) => {
    await updateDoc(doc(db, 'kullanicilar', id), { aktif: !mevcut })
    yukle()
  }

  const duzenle = (k) => {
    setForm({ email: k.email, ad: k.ad, rol: k.rol })
    setDuzenleId(k.id)
    setFormAcik(true)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Kullanıcılar</h1>
          <p className="text-sm text-gray-400 mt-0.5">{kullanicilar.length} kullanıcı tanımlı</p>
        </div>
        <button onClick={() => { setForm({ email: '', ad: '', rol: 'operasyon' }); setDuzenleId(null); setFormAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          + Kullanıcı Ekle
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-xs text-amber-700">
        <span className="font-medium">Not:</span> Yeni kullanıcıları önce Firebase Console'dan oluşturun (e-posta + şifre), ardından buradan rol atayın. Kullanıcı ilk girişte otomatik eşleşir.
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Kullanıcı</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">E-posta</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Durum</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {kullanicilar.map((k, i) => (
                <tr key={k.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === kullanicilar.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800 text-sm">{k.ad}</div>
                    {k.pending && <div className="text-xs text-amber-600">Henüz giriş yapmadı</div>}
                    {k.id === auth.currentUser?.uid && <div className="text-xs text-blue-500">Siz</div>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{k.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={k.rol}
                      onChange={e => rolDegistir(k.id, e.target.value)}
                      disabled={k.id === auth.currentUser?.uid}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer ${ROL_RENK[k.rol]} disabled:opacity-50`}
                    >
                      {Object.entries(ROL_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => aktifToggle(k.id, k.aktif)}
                      disabled={k.id === auth.currentUser?.uid}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${k.aktif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'} disabled:opacity-50`}
                    >
                      {k.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => duzenle(k)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{duzenleId ? 'Kullanıcı Düzenle' : 'Kullanıcı Ekle'}</h2>
              <button onClick={() => setFormAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad *</label>
                <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ad Soyad" />
              </div>
              {!duzenleId && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-posta *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="kullanici@firma.com" />
                  <div className="text-xs text-gray-400 mt-1">Bu e-posta Firebase Console'da oluşturulmuş olmalı.</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Rol</label>
                <div className="space-y-2">
                  {Object.entries(ROL_LABEL).map(([val, label]) => (
                    <label key={val} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${form.rol === val ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <input type="radio" name="rol" value={val} checked={form.rol === val}
                        onChange={() => setForm(f => ({ ...f, rol: val }))} className="mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {val === 'admin' && 'Tüm yetkiler, kullanıcı yönetimi, silme'}
                          {val === 'finansal_operasyon' && 'Mali veriler dahil tüm görünüm, silme yetkisi'}
                          {val === 'operasyon' && 'Sadece atandığı projeler, mali veri yok, silme yok'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
              <button onClick={kaydet} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
                {duzenleId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
