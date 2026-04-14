
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function ArtisLogu({ sozlesmeId, tenantId, paraBirimi = 'USD' }) {
  const [kayitlar, setKayitlar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState({
    tarih: '', artis_tipi: 'TÜFE', artis_orani: '',
    eski_fiyat: '', yeni_fiyat: '', notlar: ''
  })

  const yukle = async () => {
    const snap = await getDocs(query(
      collection(db, 'artis_loglari'),
      where('sozlesme_id', '==', sozlesmeId),
      where('tenant_id', '==', tenantId)
    ))
    setKayitlar(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.tarih?.localeCompare(a.tarih || '') || 0))
  }

  useEffect(() => { if (sozlesmeId) yukle() }, [sozlesmeId])

  const kaydet = async () => {
    if (!form.tarih) return alert('Tarih zorunludur.')
    await addDoc(collection(db, 'artis_loglari'), {
      ...form,
      sozlesme_id: sozlesmeId,
      tenant_id: tenantId,
      artis_orani: Number(form.artis_orani) || 0,
      eski_fiyat: Number(form.eski_fiyat) || 0,
      yeni_fiyat: Number(form.yeni_fiyat) || 0,
    })
    setForm({ tarih: '', artis_tipi: 'TÜFE', artis_orani: '', eski_fiyat: '', yeni_fiyat: '', notlar: '' })
    setFormAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'artis_loglari', id))
    yukle()
  }

  const ARTIS_TIPLERI = ['TÜFE', 'ÜFE', 'TÜFE+ÜFE Ortalaması', 'ABD CPI', 'Euro Bölgesi HICP', 'Sabit Oran', 'Özel Formül']

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Artış Logu</div>
        <button onClick={() => setFormAcik(!formAcik)}
          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          + Artış Ekle
        </button>
      </div>

      {kayitlar.length === 0 && !formAcik && (
        <div className="text-xs text-gray-400 italic py-2">Henüz artış kaydı yok.</div>
      )}

      {kayitlar.map(k => (
        <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-medium text-gray-700">{k.tarih}</span>
            <span className="text-gray-500">{k.artis_tipi}</span>
            {k.artis_orani > 0 && <span className="text-green-600 font-medium">%{k.artis_orani}</span>}
            {k.eski_fiyat > 0 && (
              <span className="text-gray-400">
                {k.eski_fiyat.toLocaleString()} → <span className="text-gray-700 font-medium">{k.yeni_fiyat.toLocaleString()} {paraBirimi}</span>
              </span>
            )}
            {k.notlar && <span className="text-gray-400 italic">{k.notlar}</span>}
          </div>
          <button onClick={() => sil(k.id)} className="text-red-400 hover:text-red-600 ml-2">Sil</button>
        </div>
      ))}

      {formAcik && (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Artış Tarihi *</label>
              <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Artış Tipi</label>
              <select value={form.artis_tipi} onChange={e => setForm(f => ({ ...f, artis_tipi: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-400">
                {ARTIS_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Artış Oranı (%)</label>
              <input type="number" step="0.01" value={form.artis_orani}
                onChange={e => setForm(f => ({ ...f, artis_orani: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="12.50" />
            </div>
            <div></div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Eski Fiyat ({paraBirimi})</label>
              <input type="number" step="0.01" value={form.eski_fiyat}
                onChange={e => setForm(f => ({ ...f, eski_fiyat: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Yeni Fiyat ({paraBirimi})</label>
              <input type="number" step="0.01" value={form.yeni_fiyat}
                onChange={e => setForm(f => ({ ...f, yeni_fiyat: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notlar</label>
              <input value={form.notlar} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="Sözleşme zeyilnamesi, e-posta onayı..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-50 rounded-lg">İptal</button>
            <button onClick={kaydet} className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800">Kaydet</button>
          </div>
        </div>
      )}
    </div>
  )
}
