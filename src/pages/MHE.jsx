
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'
import { kurlariGetir, kurdanCevir } from '../utils/kurService'

const EKIPMAN_TIPLERI = [
  'Counterbalance Forklift', 'Reach Truck (RT)', 'HLOP (High Level Order Picker)',
  'LLOP / ETP', 'Pallet Stacker', 'Turret Truck (VNA)', 'Manlift / Personel Platformu',
  'Pallet Jack (Manuel)', 'Konveyör Sistemi', 'Bant Sistemi', 'Shrink Makinesi',
  'Barkod / RFID Okuyucu', 'Diğer'
]

const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']

const bos = {
  proje_id: '', tip: '', marka: '', model: '', seri_no: '',
  baslangic: '', bitis: '', aylik_kira: '', para_birimi: 'TRY',
  kiralayan_firma: '', kira_sozlesme_link: '', notlar: ''
}

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function MHE() {
  const { rol } = useRole()
  const [ekipmanlar, setEkipmanlar] = useState([])
  const [projeler, setProjeler] = useState([])
  const [kurlar, setKurlar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState(bos)
  const [arama, setArama] = useState('')
  const [projeFiltre, setProjeFiltre] = useState('')
  const [tipFiltre, setTipFiltre] = useState('')

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const [eSnap, pSnap] = await Promise.all([
      getDocs(query(collection(db, 'mhe_ekipmanlar'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'projeler'), where('tenant_id', '==', tenantId))),
    ])
    setEkipmanlar(eSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setProjeler(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => {
    yukle()
    kurlariGetir().then(setKurlar)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const kaydet = async () => {
    if (!form.tip) return alert('Ekipman tipi zorunludur.')
    const veri = { ...form, tenant_id: tenantId, aylik_kira: Number(form.aylik_kira) || 0 }
    if (secili) {
      await updateDoc(doc(db, 'mhe_ekipmanlar', secili.id), veri)
    } else {
      await addDoc(collection(db, 'mhe_ekipmanlar'), veri)
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu ekipmanı silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'mhe_ekipmanlar', id))
    yukle()
  }

  const projeAd = (id) => projeler.find(p => p.id === id)?.ad || '—'

  const filtreli = ekipmanlar.filter(e =>
    (!arama || e.tip?.toLowerCase().includes(arama.toLowerCase()) || e.marka?.toLowerCase().includes(arama.toLowerCase()) || e.seri_no?.toLowerCase().includes(arama.toLowerCase())) &&
    (!projeFiltre || e.proje_id === projeFiltre) &&
    (!tipFiltre || e.tip === tipFiltre)
  )

  // Toplam aylık maliyet (TRY bazında)
  const toplamTRY = ekipmanlar.reduce((acc, e) => {
    const tryTutar = kurdanCevir(e.aylik_kira || 0, e.para_birimi || 'TRY', 'TRY', kurlar)
    return acc + tryTutar
  }, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">MHE Ekipmanları</h1>
          <p className="text-sm text-gray-400 mt-0.5">{ekipmanlar.length} ekipman · Aylık ≈ {toplamTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TRY</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Ekipman, marka, seri no..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-48" />
          <select value={projeFiltre} onChange={e => setProjeFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
            <option value="">Tüm Projeler</option>
            {projeler.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
          </select>
          <select value={tipFiltre} onChange={e => setTipFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
            <option value="">Tüm Tipler</option>
            {EKIPMAN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + Ekipman Ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : ekipmanlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏗️</div>
          <div className="text-sm font-medium text-gray-500">Henüz ekipman kaydı yok</div>
          <button onClick={() => { setSecili(null); setForm(bos); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Ekipmanı Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ekipman</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Proje</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Seri No</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Kira Süresi</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Aylık Kira</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((e, i) => {
                const kalan = gunKaldi(e.bitis)
                const tryKira = kurdanCevir(e.aylik_kira || 0, e.para_birimi || 'TRY', 'TRY', kurlar)
                return (
                  <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === filtreli.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-800 text-sm">{e.tip}</div>
                      {(e.marka || e.model) && (
                        <div className="text-xs text-gray-400">{[e.marka, e.model].filter(Boolean).join(' ')}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{projeAd(e.proje_id)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{e.seri_no || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-gray-500">
                        {e.baslangic && <span>{e.baslangic}</span>}
                        {e.bitis && <span> → {e.bitis}</span>}
                      </div>
                      {kalan !== null && (
                        <div className={`text-xs font-medium mt-0.5 ${kalan < 0 ? 'text-red-600' : kalan <= 30 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {kalan < 0 ? `${Math.abs(kalan)} gün geçti!` : kalan === 0 ? 'Bugün bitiyor!' : `${kalan} gün kaldı`}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="text-sm font-medium text-gray-800">
                        {(e.aylik_kira || 0).toLocaleString('tr-TR')} {e.para_birimi}
                      </div>
                      {kurlar && e.para_birimi !== 'TRY' && (
                        <div className="text-xs text-gray-400">≈ {tryKira.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TRY</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {e.kira_sozlesme_link && (
                          <a href={e.kira_sozlesme_link} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700">📄</a>
                        )}
                        <button onClick={() => {
                          setSecili(e)
                          setForm({ proje_id: e.proje_id || '', tip: e.tip || '', marka: e.marka || '', model: e.model || '', seri_no: e.seri_no || '', baslangic: e.baslangic || '', bitis: e.bitis || '', aylik_kira: e.aylik_kira || '', para_birimi: e.para_birimi || 'TRY', kiralayan_firma: e.kiralayan_firma || '', kira_sozlesme_link: e.kira_sozlesme_link || '', notlar: e.notlar || '' })
                          setModalAcik(true)
                        }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                          Düzenle
                        </button>
                        {canDelete(rol) && (
                          <button onClick={() => sil(e.id)}
                            className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{secili ? 'Ekipman Düzenle' : 'Yeni MHE Ekipmanı'}</h2>
              <button onClick={() => setModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ekipman Tipi *</label>
                <select value={form.tip} onChange={e => set('tip', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin...</option>
                  {EKIPMAN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Marka</label>
                  <input value={form.marka} onChange={e => set('marka', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Toyota, Crown, Jungheinrich..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                  <input value={form.model} onChange={e => set('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Seri No</label>
                  <input value={form.seri_no} onChange={e => set('seri_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bağlı Proje</label>
                  <select value={form.proje_id} onChange={e => set('proje_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Seçin (opsiyonel)...</option>
                    {projeler.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kiralayan Firma</label>
                <input value={form.kiralayan_firma} onChange={e => set('kiralayan_firma', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kira Başlangıcı</label>
                  <input type="date" value={form.baslangic} onChange={e => set('baslangic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kira Bitişi</label>
                  <input type="date" value={form.bitis} onChange={e => set('bitis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Aylık Kira</label>
                <div className="flex gap-2">
                  <input type="number" value={form.aylik_kira} onChange={e => set('aylik_kira', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="0" />
                  <div className="flex gap-1">
                    {PARA_BIRIMLERI.map(pb => (
                      <button key={pb} onClick={() => set('para_birimi', pb)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border ${form.para_birimi === pb ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {pb}
                      </button>
                    ))}
                  </div>
                </div>
                {kurlar && form.aylik_kira && form.para_birimi !== 'TRY' && (
                  <div className="text-xs text-gray-400 mt-1">
                    ≈ {kurdanCevir(form.aylik_kira, form.para_birimi, 'TRY', kurlar).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TRY
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kira Sözleşmesi (link)</label>
                <input value={form.kira_sozlesme_link} onChange={e => set('kira_sozlesme_link', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="SharePoint, OneDrive..." />
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
