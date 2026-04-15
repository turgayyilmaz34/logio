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

const DURUMLAR = ['musait', 'atanmis', 'bakimda', 'iade_edildi']
const DURUM_LABEL = { musait: 'Müsait', atanmis: 'Atanmış', bakimda: 'Bakımda', iade_edildi: 'İade Edildi' }
const DURUM_RENK = {
  musait: 'bg-green-50 text-green-700',
  atanmis: 'bg-blue-50 text-blue-700',
  bakimda: 'bg-amber-50 text-amber-700',
  iade_edildi: 'bg-gray-100 text-gray-500',
}
const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']

const bosEkipman = {
  tip: '', marka: '', model: '', seri_no: '',
  durum: 'musait', tesis_id: '',
  kira_baslangic: '', kira_bitis: '',
  aylik_kira: '', para_birimi: 'TRY',
  kiralayan_firma: '', kira_sozlesme_link: '', notlar: ''
}

const bosAtama = { proje_id: '', baslangic: '', bitis: '', notlar: '' }

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

function AtamalarPanel({ ekipmanId, tenantId, projeler }) {
  const [atamalar, setAtamalar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState(bosAtama)

  const yukle = async () => {
    const snap = await getDocs(query(
      collection(db, 'mhe_atamalari'),
      where('ekipman_id', '==', ekipmanId),
      where('tenant_id', '==', tenantId)
    ))
    setAtamalar(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || '')))
  }

  useEffect(() => { yukle() }, [ekipmanId])

  const projeAd = (id) => projeler.find(p => p.id === id)?.ad || '—'

  const kaydet = async () => {
    if (!form.proje_id) return alert('Proje seçimi zorunludur.')
    await addDoc(collection(db, 'mhe_atamalari'), {
      ...form, ekipman_id: ekipmanId, tenant_id: tenantId
    })
    setForm(bosAtama)
    setFormAcik(false)
    yukle()
  }

  const sil = async (id) => {
    await deleteDoc(doc(db, 'mhe_atamalari', id))
    yukle()
  }

  const aktifAtama = atamalar.find(a => {
    if (!a.bitis) return true
    return new Date(a.bitis) >= new Date()
  })

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Proje Atamaları
          {aktifAtama && (
            <span className="ml-2 text-blue-600 normal-case">→ {projeAd(aktifAtama.proje_id)}</span>
          )}
        </div>
        <button onClick={() => setFormAcik(!formAcik)}
          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          + Atama Ekle
        </button>
      </div>

      {atamalar.length === 0 && !formAcik && (
        <div className="text-xs text-gray-400 italic">Henüz atama yok — ekipman havuzda bekliyor.</div>
      )}

      {atamalar.map(a => {
        const bitti = a.bitis && new Date(a.bitis) < new Date()
        return (
          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`font-medium ${bitti ? 'text-gray-400' : 'text-gray-700'}`}>{projeAd(a.proje_id)}</span>
              {a.baslangic && <span className="text-gray-400">{a.baslangic}{a.bitis ? ` → ${a.bitis}` : ' → devam ediyor'}</span>}
              {bitti && <span className="text-gray-400">(tamamlandı)</span>}
              {a.notlar && <span className="text-gray-400 italic">{a.notlar}</span>}
            </div>
            <button onClick={() => sil(a.id)} className="text-red-400 hover:text-red-600 ml-2">Sil</button>
          </div>
        )
      })}

      {formAcik && (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Proje *</label>
              <select value={form.proje_id} onChange={e => setForm(f => ({ ...f, proje_id: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-400">
                <option value="">Seçin...</option>
                {projeler.filter(p => ['teklif','sozlesme','operasyon'].includes(p.durum)).map(p => (
                  <option key={p.id} value={p.id}>{p.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Atama Başlangıcı</label>
              <input type="date" value={form.baslangic} onChange={e => setForm(f => ({ ...f, baslangic: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Atama Bitişi</label>
              <input type="date" value={form.bitis} onChange={e => setForm(f => ({ ...f, bitis: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notlar</label>
              <input value={form.notlar} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
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

export default function MHE() {
  const { rol } = useRole()
  const [ekipmanlar, setEkipmanlar] = useState([])
  const [projeler, setProjeler] = useState([])
  const [tesisler, setTesisler] = useState([])
  const [kurlar, setKurlar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [form, setForm] = useState(bosEkipman)
  const [arama, setArama] = useState('')
  const [durumFiltre, setDurumFiltre] = useState('')
  const [tipFiltre, setTipFiltre] = useState('')
  const [acikEkipmanId, setAcikEkipmanId] = useState(null)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const [eSnap, pSnap, tSnap] = await Promise.all([
      getDocs(query(collection(db, 'mhe_ekipmanlar'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'projeler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))),
    ])
    setEkipmanlar(eSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setProjeler(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTesisler(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => {
    yukle()
    kurlariGetir().then(setKurlar)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const tesisAd = (id) => tesisler.find(t => t.id === id)?.ad || ''

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

  const filtreli = ekipmanlar.filter(e =>
    (!arama || e.tip?.toLowerCase().includes(arama.toLowerCase()) || e.marka?.toLowerCase().includes(arama.toLowerCase()) || e.seri_no?.toLowerCase().includes(arama.toLowerCase())) &&
    (!durumFiltre || e.durum === durumFiltre) &&
    (!tipFiltre || e.tip === tipFiltre)
  )

  const toplamTRY = ekipmanlar
    .filter(e => e.durum !== 'iade_edildi')
    .reduce((acc, e) => acc + kurdanCevir(e.aylik_kira || 0, e.para_birimi || 'TRY', 'TRY', kurlar), 0)

  const ozet = DURUMLAR.reduce((acc, d) => ({ ...acc, [d]: ekipmanlar.filter(e => e.durum === d).length }), {})

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">MHE Ekipman Havuzu</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {ekipmanlar.length} ekipman · Aktif kira ≈ {toplamTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TRY/ay
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Ekipman, marka, seri no..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-48" />
          <select value={durumFiltre} onChange={e => setDurumFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
            <option value="">Tüm Durumlar</option>
            {DURUMLAR.map(d => <option key={d} value={d}>{DURUM_LABEL[d]}</option>)}
          </select>
          <select value={tipFiltre} onChange={e => setTipFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
            <option value="">Tüm Tipler</option>
            {EKIPMAN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { setSecili(null); setForm(bosEkipman); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + Ekipman Ekle
          </button>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {DURUMLAR.map(d => (
          <div key={d} onClick={() => setDurumFiltre(durumFiltre === d ? '' : d)}
            className={`bg-white rounded-xl border p-4 text-center cursor-pointer transition-colors ${durumFiltre === d ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="text-2xl font-semibold text-gray-700">{ozet[d] || 0}</div>
            <div className={`text-xs mt-1 font-medium ${DURUM_RENK[d].split(' ')[1]}`}>{DURUM_LABEL[d]}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : ekipmanlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏗️</div>
          <div className="text-sm font-medium text-gray-500">Henüz ekipman yok</div>
          <button onClick={() => { setSecili(null); setForm(bosEkipman); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Ekipmanı Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtreli.map(e => {
            const kalan = gunKaldi(e.kira_bitis)
            const tryKira = kurdanCevir(e.aylik_kira || 0, e.para_birimi || 'TRY', 'TRY', kurlar)
            const acik = acikEkipmanId === e.id
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-gray-800">{e.tip}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${DURUM_RENK[e.durum]}`}>
                          {DURUM_LABEL[e.durum]}
                        </span>
                        {e.marka && <span className="text-xs text-gray-500">{e.marka} {e.model}</span>}
                        {e.seri_no && <code className="text-xs text-gray-400 font-mono">{e.seri_no}</code>}
                        {e.tesis_id && <span className="text-xs text-gray-400">📍 {tesisAd(e.tesis_id)}</span>}
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                        {e.kiralayan_firma && <span>{e.kiralayan_firma}</span>}
                        {e.kira_baslangic && <span>{e.kira_baslangic} → {e.kira_bitis || 'devam ediyor'}</span>}
                        {kalan !== null && (
                          <span className={kalan < 0 ? 'text-red-600 font-medium' : kalan <= 30 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                            {kalan < 0 ? `Kira ${Math.abs(kalan)} gün geçti!` : kalan === 0 ? 'Bugün bitiyor!' : `${kalan} gün kaldı`}
                          </span>
                        )}
                        {e.aylik_kira > 0 && (
                          <span className="font-medium text-gray-700">
                            {Number(e.aylik_kira).toLocaleString('tr-TR')} {e.para_birimi}/ay
                            {kurlar && e.para_birimi !== 'TRY' && (
                              <span className="text-gray-400 ml-1">≈ {tryKira.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TRY</span>
                            )}
                          </span>
                        )}
                        {e.kira_sozlesme_link && (
                          <a href={e.kira_sozlesme_link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">📄 Sözleşme</a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button onClick={() => setAcikEkipmanId(acik ? null : e.id)}
                        className={`text-xs px-3 py-1.5 border rounded-lg transition-colors ${acik ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {acik ? 'Kapat' : 'Atamalar'}
                      </button>
                      <button onClick={() => { setSecili(e); setForm({ tip: e.tip, marka: e.marka || '', model: e.model || '', seri_no: e.seri_no || '', durum: e.durum || 'musait', tesis_id: e.tesis_id || '', kira_baslangic: e.kira_baslangic || '', kira_bitis: e.kira_bitis || '', aylik_kira: e.aylik_kira || '', para_birimi: e.para_birimi || 'TRY', kiralayan_firma: e.kiralayan_firma || '', kira_sozlesme_link: e.kira_sozlesme_link || '', notlar: e.notlar || '' }); setModalAcik(true) }}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                        Düzenle
                      </button>
                      {canDelete(rol) && (
                        <button onClick={() => sil(e.id)}
                          className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">
                          Sil
                        </button>
                      )}
                    </div>
                  </div>

                  {acik && (
                    <AtamalarPanel ekipmanId={e.id} tenantId={tenantId} projeler={projeler} />
                  )}
                </div>
              </div>
            )
          })}
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Filtreye uyan ekipman bulunamadı.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{secili ? 'Ekipman Düzenle' : 'Yeni MHE Ekipmanı'}</h2>
              <button onClick={() => setModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ekipman Tipi *</label>
                  <select value={form.tip} onChange={e => set('tip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Seçin...</option>
                    {EKIPMAN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Marka</label>
                  <input value={form.marka} onChange={e => set('marka', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Toyota, Crown..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                  <input value={form.model} onChange={e => set('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Seri No</label>
                  <input value={form.seri_no} onChange={e => set('seri_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
                  <select value={form.durum} onChange={e => set('durum', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    {DURUMLAR.map(d => <option key={d} value={d}>{DURUM_LABEL[d]}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bulunduğu Tesis</label>
                  <select value={form.tesis_id} onChange={e => set('tesis_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Tesis seçin (opsiyonel)...</option>
                    {tesisler.map(t => <option key={t.id} value={t.id}>{t.ad} — {t.sehir}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-500 mb-3">Kira Bilgileri</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kiralayan Firma</label>
                    <input value={form.kiralayan_firma} onChange={e => set('kiralayan_firma', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kira Sözleşmesi (link)</label>
                    <input value={form.kira_sozlesme_link} onChange={e => set('kira_sozlesme_link', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder="SharePoint, OneDrive..." />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kira Başlangıcı</label>
                    <input type="date" value={form.kira_baslangic} onChange={e => set('kira_baslangic', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kira Bitişi</label>
                    <input type="date" value={form.kira_bitis} onChange={e => set('kira_bitis', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Aylık Kira</label>
                    <div className="flex gap-2">
                      <input type="number" value={form.aylik_kira} onChange={e => set('aylik_kira', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="0" />
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
