
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'

const bos = {
  ad: '', baslangic: '', bitis: '', mesafe_km: '',
  taseron_id: '', arac_tipi: '', notlar: ''
}

export default function Rotalar() {
  const { rol } = useRole()
  const [rotalar, setRotalar] = useState([])
  const [taseronlar, setTaseronlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState(bos)
  const [arama, setArama] = useState('')

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const [rSnap, tSnap] = await Promise.all([
      getDocs(query(collection(db, 'rotalar'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'taseronlar'), where('tenant_id', '==', tenantId)))
    ])
    setRotalar(rSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTaseronlar(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const kaydet = async () => {
    if (!form.ad || !form.baslangic || !form.bitis) return alert('Ad, başlangıç ve bitiş noktası zorunludur.')
    const veri = { ...form, tenant_id: tenantId, mesafe_km: Number(form.mesafe_km) || 0 }
    if (secili) {
      await updateDoc(doc(db, 'rotalar', secili.id), veri)
    } else {
      await addDoc(collection(db, 'rotalar'), veri)
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu rotayı silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'rotalar', id))
    yukle()
  }

  const taseron = (id) => taseronlar.find(t => t.id === id)?.ad || '—'

  const filtreli = rotalar.filter(r =>
    !arama || r.ad?.toLowerCase().includes(arama.toLowerCase()) ||
    r.baslangic?.toLowerCase().includes(arama.toLowerCase()) ||
    r.bitis?.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Rotalar</h1>
          <p className="text-sm text-gray-400 mt-0.5">{rotalar.length} rota tanımlı</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Rota ara..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-48" />
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + Yeni Rota
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : rotalar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🗺️</div>
          <div className="text-sm font-medium text-gray-500">Henüz rota tanımlı değil</div>
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Rotayı Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtreli.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:border-gray-200">
              <div>
                <div className="font-medium text-gray-800 text-sm">{r.ad}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span>{r.baslangic} → {r.bitis}</span>
                  {r.mesafe_km > 0 && <span>{r.mesafe_km} km</span>}
                  {r.taseron_id && <span>Taşeron: {taseron(r.taseron_id)}</span>}
                  {r.arac_tipi && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.arac_tipi}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSecili(r); setForm({ ad: r.ad, baslangic: r.baslangic || '', bitis: r.bitis || '', mesafe_km: r.mesafe_km || '', taseron_id: r.taseron_id || '', arac_tipi: r.arac_tipi || '', notlar: r.notlar || '' }); setModalAcik(true) }}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Düzenle
                </button>
                {canDelete(rol) && (
                  <button onClick={() => sil(r.id)}
                    className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{secili ? 'Rota Düzenle' : 'Yeni Rota'}</h2>
              <button onClick={() => setModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rota Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="İstanbul → İzmir Haftalık" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç Noktası *</label>
                  <input value={form.baslangic} onChange={e => set('baslangic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="İstanbul" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş Noktası *</label>
                  <input value={form.bitis} onChange={e => set('bitis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="İzmir" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mesafe (km)</label>
                  <input type="number" value={form.mesafe_km} onChange={e => set('mesafe_km', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Araç Tipi</label>
                  <input value={form.arac_tipi} onChange={e => set('arac_tipi', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="TIR, Kamyon..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Taşeron</label>
                <select value={form.taseron_id} onChange={e => set('taseron_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin (opsiyonel)...</option>
                  {taseronlar.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </select>
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
