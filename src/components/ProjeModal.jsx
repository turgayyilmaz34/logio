import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const ALAN_TIPLERI = [
  'Kuru Depo', 'Soğuk Depo', 'Derin Dondurma', 'Tehlikeli Madde',
  'Yangına Duyarlı', 'Gümrüklü', 'Yüksek Raflı', 'Dolu Zemin',
  'Baskı / Paketleme', 'Ofis Alanı'
]

const DURUMLAR = [
  ['teklif', 'Teklif'], ['sozlesme', 'Sözleşme'], ['operasyon', 'Operasyon'],
  ['tamamlandi', 'Tamamlandı'], ['iptal', 'İptal'],
]

function KatBaglantilari({ projeId, tenantId }) {
  const [baglantilar, setBaglantilar] = useState([])
  const [tesisler, setTesisler] = useState([])
  const [tumKatlar, setTumKatlar] = useState([])
  const [seciliTesisId, setSeciliTesisId] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState({ kat_id: '', kullanilan_m2: '', kullanilan_asmakat_m2: '', baslangic: '', bitis: '' })

  const yukle = async () => {
    const [bagSnap, katSnap, tesSnap] = await Promise.all([
      getDocs(query(collection(db, 'proje_kat_baginlantilari'),
        where('proje_id', '==', projeId), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'katlar'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId)))
    ])
    setBaglantilar(bagSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTumKatlar(katSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTesisler(tesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { if (projeId) yukle() }, [projeId])

  const katAd = (id) => {
    const kat = tumKatlar.find(k => k.id === id)
    if (!kat) return id
    const tesis = tesisler.find(t => t.id === kat.tesis_id)
    return `${tesis?.ad || ''} / ${kat.kat_adi}`
  }

  const filtreliKatlar = seciliTesisId
    ? tumKatlar.filter(k => k.tesis_id === seciliTesisId)
    : []

  const ekle = async () => {
    if (!form.kat_id || !form.kullanilan_m2) return alert('Kat ve m² zorunludur.')
    await addDoc(collection(db, 'proje_kat_baginlantilari'), {
      ...form, proje_id: projeId, tenant_id: tenantId,
      kullanilan_m2: Number(form.kullanilan_m2),
      kullanilan_asmakat_m2: Number(form.kullanilan_asmakat_m2) || 0,
    })
    setForm({ kat_id: '', kullanilan_m2: '', kullanilan_asmakat_m2: '', baslangic: '', bitis: '' })
    setSeciliTesisId('')
    setFormAcik(false)
    yukle()
  }

  const sil = async (id) => {
    await deleteDoc(doc(db, 'proje_kat_baginlantilari', id))
    yukle()
  }

  const toplamM2 = baglantilar.reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)
  const toplamAsmakat = baglantilar.reduce((acc, b) => acc + (b.kullanilan_asmakat_m2 || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kat Bağlantıları</div>
          {toplamM2 > 0 && <span className="text-xs text-blue-700 font-medium">Doluluk: {toplamM2.toLocaleString('tr-TR')} m²</span>}
          {toplamAsmakat > 0 && <span className="text-xs text-orange-500 font-medium">+ {toplamAsmakat.toLocaleString('tr-TR')} m² asmakat (bonus)</span>}
        </div>
        <button onClick={() => setFormAcik(!formAcik)}
          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          + Kat Ekle
        </button>
      </div>

      {baglantilar.map(b => (
        <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700">{katAd(b.kat_id)}</span>
            <span className="text-gray-500">{b.kullanilan_m2?.toLocaleString()} m²</span>
            {b.kullanilan_asmakat_m2 > 0 && <span className="text-orange-500">+{b.kullanilan_asmakat_m2} m² asmakat (bonus)</span>}
            {b.baslangic && <span className="text-gray-400">{b.baslangic} → {b.bitis}</span>}
          </div>
          <button onClick={() => sil(b.id)} className="text-red-400 hover:text-red-600">Sil</button>
        </div>
      ))}

      {formAcik && (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Tesis *</label>
              <select value={seciliTesisId}
                onChange={e => { setSeciliTesisId(e.target.value); setForm(f => ({ ...f, kat_id: '' })) }}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                <option value="">Önce tesis seçin...</option>
                {tesisler.map(t => <option key={t.id} value={t.id}>{t.ad} — {t.sehir}</option>)}
              </select>
            </div>
            {seciliTesisId && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Kat *</label>
                <select value={form.kat_id} onChange={e => setForm(f => ({ ...f, kat_id: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                  <option value="">Kat seçin...</option>
                  {filtreliKatlar.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.kat_adi} — {(k.kullanilabilir_m2 || 0).toLocaleString()} m²
                      {k.asmakat_var && k.asmakat_m2 > 0 ? ` + ${k.asmakat_m2} m² asmakat` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kullanılan m² *</label>
              <input type="number" value={form.kullanilan_m2}
                onChange={e => setForm(f => ({ ...f, kullanilan_m2: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Asmakat m² (bonus gelir)</label>
              <input type="number" value={form.kullanilan_asmakat_m2}
                onChange={e => setForm(f => ({ ...f, kullanilan_asmakat_m2: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="Doluluk dışı" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
              <input type="date" value={form.baslangic}
                onChange={e => setForm(f => ({ ...f, baslangic: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
              <input type="date" value={form.bitis}
                onChange={e => setForm(f => ({ ...f, bitis: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setFormAcik(false); setSeciliTesisId('') }}
              className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-50 rounded-lg">İptal</button>
            <button onClick={ekle} className="text-xs bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800">Kaydet</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonelPanel({ projeId, tenantId }) {
  const [kayitlar, setKayitlar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState({ donem: '', kisi_sayisi: '', toplam_saat: '', toplam_maliyet_try: '', toplam_maliyet_usd: '', kur: '' })

  const yukle = async () => {
    const snap = await getDocs(query(collection(db, 'proje_personel'),
      where('proje_id', '==', projeId), where('tenant_id', '==', tenantId)))
    setKayitlar(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.donem?.localeCompare(a.donem || '') || 0))
  }

  useEffect(() => { if (projeId) yukle() }, [projeId])

  const kaydet = async () => {
    if (!form.donem) return alert('Dönem zorunludur.')
    await addDoc(collection(db, 'proje_personel'), {
      ...form, proje_id: projeId, tenant_id: tenantId,
      kisi_sayisi: Number(form.kisi_sayisi) || 0,
      toplam_saat: Number(form.toplam_saat) || 0,
      toplam_maliyet_try: Number(form.toplam_maliyet_try) || 0,
      toplam_maliyet_usd: Number(form.toplam_maliyet_usd) || 0,
      kur: Number(form.kur) || 0,
    })
    setForm({ donem: '', kisi_sayisi: '', toplam_saat: '', toplam_maliyet_try: '', toplam_maliyet_usd: '', kur: '' })
    setFormAcik(false)
    yukle()
  }

  const sil = async (id) => {
    await deleteDoc(doc(db, 'proje_personel', id))
    yukle()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personel Maliyeti</div>
        <button onClick={() => setFormAcik(!formAcik)}
          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          + Dönem Ekle
        </button>
      </div>

      {kayitlar.map(k => (
        <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">{k.donem}</span>
            <span className="text-gray-500">{k.kisi_sayisi} kişi / {k.toplam_saat} saat</span>
            <span className="text-red-700">₺{Number(k.toplam_maliyet_try).toLocaleString()}</span>
            {k.toplam_maliyet_usd > 0 && <span className="text-blue-700">${Number(k.toplam_maliyet_usd).toLocaleString()}</span>}
          </div>
          <button onClick={() => sil(k.id)} className="text-red-400 hover:text-red-600">Sil</button>
        </div>
      ))}

      {formAcik && (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dönem *</label>
              <input value={form.donem} onChange={e => setForm(f => ({ ...f, donem: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                placeholder="2026-04" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kişi</label>
              <input type="number" value={form.kisi_sayisi} onChange={e => setForm(f => ({ ...f, kisi_sayisi: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Saat</label>
              <input type="number" value={form.toplam_saat} onChange={e => setForm(f => ({ ...f, toplam_saat: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Maliyet TRY</label>
              <input type="number" value={form.toplam_maliyet_try} onChange={e => setForm(f => ({ ...f, toplam_maliyet_try: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Maliyet USD</label>
              <input type="number" value={form.toplam_maliyet_usd} onChange={e => setForm(f => ({ ...f, toplam_maliyet_usd: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kur USD/TRY</label>
              <input type="number" step="0.01" value={form.kur} onChange={e => setForm(f => ({ ...f, kur: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
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

export default function ProjeModal({ proje, sozlesmeler, musteriler, tenantId, onKaydet, onKapat }) {
  const [form, setForm] = useState({
    ad: proje?.ad || '',
    sozlesme_id: proje?.sozlesme_id || '',
    imza_tarihi: proje?.imza_tarihi || '',
    operasyon_baslangic: proje?.operasyon_baslangic || '',
    durum: proje?.durum || 'teklif',
    alan_tipleri: proje?.alan_tipleri || [],
    notlar: proje?.notlar || '',
  })
  const [aktifTab, setAktifTab] = useState('genel')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleAlan = (t) => setForm(f => ({
    ...f, alan_tipleri: f.alan_tipleri.includes(t)
      ? f.alan_tipleri.filter(x => x !== t)
      : [...f.alan_tipleri, t]
  }))

  const musteriAd = (sozId) => {
    const soz = sozlesmeler.find(s => s.id === sozId)
    if (!soz) return null
    return musteriler.find(m => m.id === soz.musteri_id)?.ad
  }

  const handleKaydet = () => {
    if (!form.ad) return alert('Proje adı zorunludur.')
    onKaydet(form)
  }

  const tabs = [
    { id: 'genel', label: 'Genel' },
    ...(proje ? [
      { id: 'katlar', label: 'Kat Bağlantıları' },
      { id: 'personel', label: 'Personel' },
    ] : [])
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{proje ? 'Proje Düzenle' : 'Yeni Proje'}</h2>
            {proje?.id && <code className="text-xs text-gray-300 font-mono">{proje.id}</code>}
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {tabs.length > 1 && (
          <div className="flex border-b border-gray-100 px-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setAktifTab(t.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${aktifTab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {aktifTab === 'genel' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Proje Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Toyota Otomotiv Depolama Projesi" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">BU Kodu (opsiyonel)</label>
                <input value={form.bu_kodu || ''} onChange={e => set('bu_kodu', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder="TR001, WH-IST-01..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bağlı Sözleşme</label>
                <select value={form.sozlesme_id} onChange={e => set('sozlesme_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Sözleşme seçin (opsiyonel)...</option>
                  {sozlesmeler.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.ad || s.id.slice(0, 8)} — {musteriler.find(m => m.id === s.musteri_id)?.ad || ''}
                    </option>
                  ))}
                </select>
                {form.sozlesme_id && musteriAd(form.sozlesme_id) && (
                  <div className="text-xs text-blue-600 mt-1">Müşteri: {musteriAd(form.sozlesme_id)}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Durum</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DURUMLAR.map(([val, label]) => (
                    <button key={val} onClick={() => set('durum', val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.durum === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İmza Tarihi</label>
                  <input type="date" value={form.imza_tarihi} onChange={e => set('imza_tarihi', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Operasyon Başlangıcı</label>
                  <input type="date" value={form.operasyon_baslangic} onChange={e => set('operasyon_baslangic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Alan Tipleri (çoklu)</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALAN_TIPLERI.map(t => (
                    <button key={t} onClick={() => toggleAlan(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.alan_tipleri.includes(t) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </>
          )}

          {aktifTab === 'katlar' && proje && (
            <KatBaglantilari projeId={proje.id} tenantId={tenantId} />
          )}

          {aktifTab === 'personel' && proje && (
            <PersonelPanel projeId={proje.id} tenantId={tenantId} />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
          <button onClick={handleKaydet} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
            {proje ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
