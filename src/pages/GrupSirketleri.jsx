import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'
import { auditLog } from '../utils/auditLog'

export default function GrupSirketleri() {
const { rol } = useRole()
    const [sirketler, setSirketler] = useState([])
  const [loading, setLoading] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState({ ad: '', parent_id: '', ulke: 'Türkiye', vergi_no: '', notlar: '' })

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'grup_sirketleri'), where('tenant_id', '==', tenantId)))
    setSirketler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const anaSirketler = sirketler.filter(s => !s.parent_id)
  const altSirketler = (parentId) => sirketler.filter(s => s.parent_id === parentId)

  const yeniAc = (parentId = '') => {
    setSecili(null)
    setForm({ ad: '', parent_id: parentId, ulke: 'Türkiye', vergi_no: '', notlar: '' })
    setFormAcik(true)
  }

  const duzenle = (sirket) => {
    setSecili(sirket)
    setForm({
      ad: sirket.ad || '', parent_id: sirket.parent_id || '',
      ulke: sirket.ulke || 'Türkiye', vergi_no: sirket.vergi_no || '',
      notlar: sirket.notlar || ''
    })
    setFormAcik(true)
  }

  const kaydet = async () => {
    if (!form.ad) return alert('Şirket adı zorunludur.')
    const veri = { ...form, tenant_id: tenantId }
    if (secili) {
      await updateDoc(doc(db, 'grup_sirketleri', secili.id), veri)
    } else {
      await addDoc(collection(db, 'grup_sirketleri'), veri)
    }
    setFormAcik(false)
    setSecili(null)
    yukle()
  }

  const sil = async (id) => {
    const altlar = altSirketler(id)
    if (altlar.length > 0) return alert('Önce alt şirketleri silin veya taşıyın.')
    if (!window.confirm('Bu şirketi silmek istediğinize emin misiniz?')) return
    const _s = sirketler.find(x => x.id === id)
    await deleteDoc(doc(db, 'grup_sirketleri', id))
    await auditLog({ modul: 'grup_sirketleri', islem: 'sil', kayitId: id, kayitAd: _s?.ad })
    yukle()
  }

  const SirketKart = ({ sirket, derinlik = 0 }) => (
    <div className={derinlik > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}>
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-3.5 mb-2 flex items-center justify-between hover:border-gray-200 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            {derinlik > 0 && <span className="text-gray-300 text-xs">└</span>}
            <span className="font-medium text-gray-800">{sirket.ad}</span>
            {!sirket.parent_id && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Ana Şirket</span>
            )}
            <code className="text-xs text-gray-300 font-mono">{sirket.id.slice(0, 8)}…</code>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{sirket.ulke}</span>
            {sirket.vergi_no && <span>VKN: {sirket.vergi_no}</span>}
            {altSirketler(sirket.id).length > 0 && (
              <span className="text-blue-500">{altSirketler(sirket.id).length} alt şirket</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => yeniAc(sirket.id)}
            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            + Alt Şirket
          </button>
          <button onClick={() => duzenle(sirket)}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Düzenle
          </button>
          {canDelete(rol) && (
              <button onClick={() => sil(sirket.id)}
            className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
            Sil
          </button>
              )}
        </div>
      </div>
      {altSirketler(sirket.id).map(alt => (
        <SirketKart key={alt.id} sirket={alt} derinlik={derinlik + 1} />
      ))}
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Grup Şirketleri</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sirketler.length} şirket tanımlı</p>
        </div>
        <button onClick={() => yeniAc()}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          + Yeni Şirket
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : sirketler.length === 0 && !formAcik ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏢</div>
          <div className="text-sm font-medium text-gray-500">Henüz şirket tanımlı değil</div>
          <div className="text-xs text-gray-400 mt-1">Tesis ve sözleşmelerde kullanmak için önce şirketleri tanımlayın</div>
          <button onClick={() => yeniAc()}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Şirketi Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {anaSirketler.map(s => <SirketKart key={s.id} sirket={s} />)}
        </div>
      )}

      {/* Form */}
      {formAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                {secili ? 'Şirketi Düzenle' : form.parent_id ? 'Alt Şirket Ekle' : 'Yeni Ana Şirket'}
              </h2>
              <button onClick={() => setFormAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {form.parent_id && (
                <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                  Alt şirket: {sirketler.find(s => s.id === form.parent_id)?.ad}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Şirket Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="CEVA Logistics Ltd. Şti." />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Üst Şirket (opsiyonel)</label>
                  <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Ana şirket olarak ekle</option>
                    {sirketler.filter(s => s.id !== secili?.id).map(s => (
                      <option key={s.id} value={s.id}>{s.ad}</option>
                    ))}
                  </select>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ülke</label>
                  <input value={form.ulke} onChange={e => set('ulke', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Türkiye" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vergi No</label>
                  <input value={form.vergi_no} onChange={e => set('vergi_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="1234567890" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setFormAcik(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
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
