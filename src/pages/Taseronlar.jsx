import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'
import { auditLog } from '../utils/auditLog'

const TASERON_TIPLERI = ['Nakliye', 'Depolama', 'Elleçleme', 'Güvenlik', 'Temizlik', 'IT', 'İnşaat', 'Diğer']

const bos = { ad: '', tip: '', vergi_no: '', ulke: 'Türkiye', yetkili: '', yetkili_tel: '', yetkili_email: '', notlar: '' }

export default function Taseronlar() {
  const { rol } = useRole()
  const [taseronlar, setTaseronlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState(bos)
  const [arama, setArama] = useState('')

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'taseronlar'), where('tenant_id', '==', tenantId)))
    setTaseronlar(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const kaydet = async () => {
    if (!form.ad) return alert('Taşeron adı zorunludur.')
    if (secili) {
      await updateDoc(doc(db, 'taseronlar', secili.id), form)
    } else {
      await addDoc(collection(db, 'taseronlar'), { ...form, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu taşeronu silmek istediğinize emin misiniz?')) return
    const _rec = taseronlar.find(x => x.id === id)
    await deleteDoc(doc(db, 'taseronlar', id))
    await auditLog({ modul: 'taseronlar', islem: 'sil', kayitId: id, kayitAd: _rec?.ad })
    yukle()
  }

  const filtreli = taseronlar.filter(t =>
    !arama || t.ad?.toLowerCase().includes(arama.toLowerCase()) || t.tip?.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Taşeronlar</h1>
          <p className="text-sm text-gray-400 mt-0.5">{taseronlar.length} taşeron tanımlı</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Taşeron ara..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-48" />
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + Yeni Taşeron
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : taseronlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏗️</div>
          <div className="text-sm font-medium text-gray-500">Henüz taşeron tanımlı değil</div>
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Taşeronu Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Taşeron</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Tip</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Yetkili</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">İletişim</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((t, i) => (
                <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === filtreli.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800 text-sm">{t.ad}</div>
                    {t.vergi_no && <div className="text-xs text-gray-400">VKN: {t.vergi_no}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    {t.tip && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.tip}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{t.yetkili || '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {t.yetkili_tel && <div>{t.yetkili_tel}</div>}
                    {t.yetkili_email && <div>{t.yetkili_email}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSecili(t); setForm({ ad: t.ad, tip: t.tip || '', vergi_no: t.vergi_no || '', ulke: t.ulke || 'Türkiye', yetkili: t.yetkili || '', yetkili_tel: t.yetkili_tel || '', yetkili_email: t.yetkili_email || '', notlar: t.notlar || '' }); setModalAcik(true) }}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                        Düzenle
                      </button>
                      {canDelete(rol) && (
                        <button onClick={() => sil(t.id)}
                          className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                          Sil
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{secili ? 'Taşeron Düzenle' : 'Yeni Taşeron'}</h2>
              <button onClick={() => setModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Taşeron Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tip</label>
                  <select value={form.tip} onChange={e => set('tip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Seçin...</option>
                    {TASERON_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vergi No</label>
                  <input value={form.vergi_no} onChange={e => set('vergi_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Yetkili Kişi</label>
                <input value={form.yetkili} onChange={e => set('yetkili', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                  <input value={form.yetkili_tel} onChange={e => set('yetkili_tel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-posta</label>
                  <input type="email" value={form.yetkili_email} onChange={e => set('yetkili_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalAcik(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
              <button onClick={kaydet} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
                {secili ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
