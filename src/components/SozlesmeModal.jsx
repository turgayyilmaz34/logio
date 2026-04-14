import { useState, useEffect } from 'react'
import ArtisLogu from './ArtisLogu'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

const ARTIS_TIPLERI = ['TÜFE', 'ÜFE', 'TÜFE+ÜFE Ortalaması', 'ABD CPI', 'Euro Bölgesi HICP', 'Sabit Oran', 'Özel Formül']
const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']
const URUN_TIPLERI = [
  'Otomotiv', 'Gıda — Kuru', 'Gıda — Soğuk', 'Gıda — Derin Dondurma',
  'İlaç — Soğuk Zincir', 'İlaç — Kuru', 'Kozmetik', 'Kimyasal',
  'Tehlikeli Madde', 'Elektronik', 'Tekstil', 'Mobilya', 'Diğer'
]

const bos = {
  ad: '', musteri_id: '', tip: 'depolama', durum: 'aktif',
  imzalayan_sirket: '', para_birimi: 'USD',
  baslangic: '', bitis: '', yenileme_uyari_gun: 90,
  sozlesme_tipi: 'sabit_toplam',
  urun_tipleri: [],
  artis_var: false, artis_tipi: 'TÜFE', artis_zamanlama: 'yillik_donum',
  artis_belirli_tarih: '', artis_ozel_formul: '',
  dep_fiyatlandirma_modu: 'm2',
  dep_sabit_baz: '', dep_m2_birim_fiyat: '',
  dep_asmakat_musteri_fiyat: '',
  dep_asmakat_maliyet_fiyat: '',
  dep_tavan_katsayisi_esigi: '', dep_tavan_katsayisi_orani: '',
  dep_secili_tesis_id: '',
  dep_kat_ids: [],
  tra_olcum_modu: 'karma', tra_kalemler: [],
  tra_arac_sayisi: '', tra_surucu_sayisi: '',
  vas_tesis_id: '', vas_depolama_ucreti: false, vas_kalemler: [],
  notlar: '',
  belge: { tip: 'link', belge_link: '', belge_base64: '', belge_adi: '' },
}

function DepolamaDetay({ form, set, tenantId }) {
  const [tesisler, setTesisler] = useState([])
  const [tumKatlar, setTumKatlar] = useState([])

  useEffect(() => {
    const yukle = async () => {
      const [tSnap, kSnap] = await Promise.all([
        getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))),
        getDocs(query(collection(db, 'katlar'), where('tenant_id', '==', tenantId)))
      ])
      setTesisler(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTumKatlar(kSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    yukle()
  }, [])

  const seciliTesisKatlari = form.dep_secili_tesis_id
    ? tumKatlar.filter(k => k.tesis_id === form.dep_secili_tesis_id)
    : []

  const tesisDegisti = (tesisId) => {
    set('dep_secili_tesis_id', tesisId)
    set('dep_kat_ids', [])
  }

  const toggleKat = (id) => set('dep_kat_ids', form.dep_kat_ids.includes(id)
    ? form.dep_kat_ids.filter(k => k !== id)
    : [...form.dep_kat_ids, id])

  const seciliKatlar = tumKatlar.filter(k => form.dep_kat_ids.includes(k.id))
  const asmakatVar = seciliKatlar.some(k => k.asmakat_var && k.asmakat_m2 > 0)
  const toplamM2 = seciliKatlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
  const toplamAsmakatM2 = seciliKatlar.reduce((acc, k) => acc + (k.asmakat_var ? k.asmakat_m2 || 0 : 0), 0)

  return (
    <div className="space-y-4">
      {/* Tesis seçimi */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Tesis *</label>
        <select value={form.dep_secili_tesis_id} onChange={e => tesisDegisti(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
          <option value="">Önce tesis seçin...</option>
          {tesisler.map(t => (
            <option key={t.id} value={t.id}>{t.ad} — {t.sehir}</option>
          ))}
        </select>
      </div>

      {/* Kat seçimi — tesis seçilince */}
      {form.dep_secili_tesis_id && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Katlar
            {toplamM2 > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                Seçili: {toplamM2.toLocaleString('tr-TR')} m²
                {toplamAsmakatM2 > 0 && ` + ${toplamAsmakatM2.toLocaleString('tr-TR')} m² asmakat`}
              </span>
            )}
          </label>
          {seciliTesisKatlari.length === 0 ? (
            <div className="text-xs text-gray-400 italic">Bu tesiste kat tanımlı değil.</div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2">
              {seciliTesisKatlari.map(k => (
                <label key={k.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded">
                  <input type="checkbox" checked={form.dep_kat_ids.includes(k.id)}
                    onChange={() => toggleKat(k.id)} className="rounded" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-700">{k.kat_adi}</span>
                    <span className="text-xs text-gray-400 ml-2">{(k.kullanilabilir_m2 || 0).toLocaleString()} m²</span>
                    {k.asmakat_var && k.asmakat_m2 > 0 && (
                      <span className="text-xs text-orange-500 ml-2">+ {k.asmakat_m2} m² asmakat</span>
                    )}
                    {k.alan_tipleri?.length > 0 && (
                      <span className="text-xs text-gray-300 ml-2">{k.alan_tipleri.join(', ')}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fiyatlandırma modu */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fiyatlandırma Modu</label>
        <div className="flex gap-2 flex-wrap">
          {[['m2', 'm² Bazlı'], ['hacim_m3', 'Hacim (m³)'], ['tavan_katsayisi', 'Tavan Katsayısı']].map(([val, label]) => (
            <button key={val} onClick={() => set('dep_fiyatlandirma_modu', val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${form.dep_fiyatlandirma_modu === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sabit Baz Tutar ({form.para_birimi})</label>
          <input type="number" value={form.dep_sabit_baz} onChange={e => set('dep_sabit_baz', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">m² Birim Fiyat — Müşteri ({form.para_birimi})</label>
          <input type="number" step="0.01" value={form.dep_m2_birim_fiyat} onChange={e => set('dep_m2_birim_fiyat', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="0.00" />
        </div>

        {form.dep_fiyatlandirma_modu === 'tavan_katsayisi' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tavan Eşiği (m)</label>
              <input type="number" value={form.dep_tavan_katsayisi_esigi} onChange={e => set('dep_tavan_katsayisi_esigi', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="8.0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Katsayı (1.20 = %20 premium)</label>
              <input type="number" step="0.01" value={form.dep_tavan_katsayisi_orani} onChange={e => set('dep_tavan_katsayisi_orani', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="1.20" />
            </div>
          </>
        )}
      </div>

      {/* Asmakat — seçili katlarda asmakat varsa göster */}
      {asmakatVar && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-3">
          <div className="text-xs font-medium text-orange-700">
            Asmakat ({toplamAsmakatM2.toLocaleString()} m²) — Doluluk Dışı, Ek Gelir
          </div>
          <div className="text-xs text-orange-600">
            Doluluk hesabına dahil edilmez. Müşteriye ayrı faturalanır, sizin için bonus gelirdir.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Asmakat — Müşteri Fiyatı ({form.para_birimi})</label>
              <input type="number" step="0.01" value={form.dep_asmakat_musteri_fiyat}
                onChange={e => set('dep_asmakat_musteri_fiyat', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Asmakat — Maliyet ({form.para_birimi})</label>
              <input type="number" step="0.01" value={form.dep_asmakat_maliyet_fiyat}
                onChange={e => set('dep_asmakat_maliyet_fiyat', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="0.00 (ücretsizse 0 bırakın)" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TransportDetay({ form, set }) {
  const [yeniKalem, setYeniKalem] = useState({ tip: 'arac', aciklama: '', maliyet_fiyat: '', maliyet_pb: 'TRY', musteri_fiyat: '', musteri_pb: 'TRY' })

  const kalemEkle = () => {
    if (!yeniKalem.aciklama) return
    set('tra_kalemler', [...form.tra_kalemler, { ...yeniKalem, id: Date.now() }])
    setYeniKalem({ tip: 'arac', aciklama: '', maliyet_fiyat: '', maliyet_pb: 'TRY', musteri_fiyat: '', musteri_pb: 'TRY' })
  }

  const kalemSil = (id) => set('tra_kalemler', form.tra_kalemler.filter(k => k.id !== id))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Araç Sayısı</label>
          <input type="number" value={form.tra_arac_sayisi} onChange={e => set('tra_arac_sayisi', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sürücü Sayısı</label>
          <input type="number" value={form.tra_surucu_sayisi} onChange={e => set('tra_surucu_sayisi', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">Fiyat Kalemleri</div>
        {form.tra_kalemler.map(k => (
          <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
            <div className="text-xs">
              <span className="font-medium text-gray-700">{k.aciklama}</span>
              <span className="text-gray-400 ml-2">({k.tip})</span>
              <span className="text-red-600 ml-3">Maliyet: {k.maliyet_fiyat} {k.maliyet_pb}</span>
              <span className="text-green-600 ml-3">Müşteri: {k.musteri_fiyat} {k.musteri_pb}</span>
            </div>
            <button onClick={() => kalemSil(k.id)} className="text-xs text-red-400 hover:text-red-600">Sil</button>
          </div>
        ))}
        <div className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <select value={yeniKalem.tip} onChange={e => setYeniKalem(f => ({ ...f, tip: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                {['arac', 'surucu', 'yakit', 'sefer', 'km'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <input value={yeniKalem.aciklama} onChange={e => setYeniKalem(f => ({ ...f, aciklama: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="Araç kirası, yakıt vs." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1">
              <input type="number" value={yeniKalem.maliyet_fiyat} onChange={e => setYeniKalem(f => ({ ...f, maliyet_fiyat: e.target.value }))}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" placeholder="Maliyet" />
              <select value={yeniKalem.maliyet_pb} onChange={e => setYeniKalem(f => ({ ...f, maliyet_pb: e.target.value }))}
                className="w-16 px-1 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                {PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{pb}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <input type="number" value={yeniKalem.musteri_fiyat} onChange={e => setYeniKalem(f => ({ ...f, musteri_fiyat: e.target.value }))}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" placeholder="Müşteri fiyatı" />
              <select value={yeniKalem.musteri_pb} onChange={e => setYeniKalem(f => ({ ...f, musteri_pb: e.target.value }))}
                className="w-16 px-1 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                {PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{pb}</option>)}
              </select>
            </div>
          </div>
          <button onClick={kalemEkle} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Ekle</button>
        </div>
      </div>
    </div>
  )
}

function VasDetay({ form, set, tenantId }) {
  const [tesisler, setTesisler] = useState([])
  const [yeniKalem, setYeniKalem] = useState({ tip: 'islem', aciklama: '', maliyet_fiyat: '', maliyet_pb: 'TRY', musteri_fiyat: '', musteri_pb: 'TRY' })

  useEffect(() => {
    const yukle = async () => {
      const snap = await getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId)))
      setTesisler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    yukle()
  }, [])

  const kalemEkle = () => {
    if (!yeniKalem.aciklama) return
    set('vas_kalemler', [...form.vas_kalemler, { ...yeniKalem, id: Date.now() }])
    setYeniKalem({ tip: 'islem', aciklama: '', maliyet_fiyat: '', maliyet_pb: 'TRY', musteri_fiyat: '', musteri_pb: 'TRY' })
  }

  const kalemSil = (id) => set('vas_kalemler', form.vas_kalemler.filter(k => k.id !== id))

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tesis (opsiyonel)</label>
        <select value={form.vas_tesis_id} onChange={e => set('vas_tesis_id', e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
          <option value="">Müşteri tesisinde / Bağımsız</option>
          {tesisler.map(t => <option key={t.id} value={t.id}>{t.ad} — {t.sehir}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.vas_depolama_ucreti} onChange={e => set('vas_depolama_ucreti', e.target.checked)} className="rounded" />
        <span className="text-xs text-gray-600">Ayrıca depolama ücreti var</span>
      </label>
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">VAS Kalemleri</div>
        {form.vas_kalemler.map(k => (
          <div key={k.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
            <div className="text-xs">
              <span className="font-medium text-gray-700">{k.aciklama}</span>
              <span className="text-gray-400 ml-2">({k.tip})</span>
              <span className="text-red-600 ml-3">{k.maliyet_fiyat} {k.maliyet_pb}</span>
              <span className="text-green-600 ml-3">{k.musteri_fiyat} {k.musteri_pb}</span>
            </div>
            <button onClick={() => kalemSil(k.id)} className="text-xs text-red-400">Sil</button>
          </div>
        ))}
        <div className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select value={yeniKalem.tip} onChange={e => setYeniKalem(f => ({ ...f, tip: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
              {['islem', 'personel', 'saat', 'diger'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="col-span-2">
              <input value={yeniKalem.aciklama} onChange={e => setYeniKalem(f => ({ ...f, aciklama: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                placeholder="Etiketleme, ambalajlama..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1">
              <input type="number" value={yeniKalem.maliyet_fiyat} onChange={e => setYeniKalem(f => ({ ...f, maliyet_fiyat: e.target.value }))}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" placeholder="Maliyet" />
              <select value={yeniKalem.maliyet_pb} onChange={e => setYeniKalem(f => ({ ...f, maliyet_pb: e.target.value }))}
                className="w-16 px-1 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                {PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{pb}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <input type="number" value={yeniKalem.musteri_fiyat} onChange={e => setYeniKalem(f => ({ ...f, musteri_fiyat: e.target.value }))}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" placeholder="Müşteri fiyatı" />
              <select value={yeniKalem.musteri_pb} onChange={e => setYeniKalem(f => ({ ...f, musteri_pb: e.target.value }))}
                className="w-16 px-1 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                {PARA_BIRIMLERI.map(pb => <option key={pb} value={pb}>{pb}</option>)}
              </select>
            </div>
          </div>
          <button onClick={kalemEkle} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Ekle</button>
        </div>
      </div>
    </div>
  )
}


function BelgeAlan({ label, deger, onChange }) {
  const handleDosya = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Dosya 2MB\'dan büyük. Lütfen harici link kullanın.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange({ ...deger, belge_base64: ev.target.result, belge_adi: file.name, belge_link: '' })
    }
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      {deger?.belge_base64 ? (
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
          <span className="text-xs text-green-700 flex-1">{deger.belge_adi}</span>
          <button onClick={() => onChange({ ...deger, belge_base64: '', belge_adi: '' })} className="text-xs text-red-400">Kaldır</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 hover:border-gray-300 text-center">
            📎 Dosya Yükle (max 2MB)
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleDosya} />
          </label>
          <input
            value={deger?.belge_link || ''}
            onChange={e => onChange({ ...deger, belge_link: e.target.value, belge_base64: '' })}
            placeholder="SharePoint / Drive linki"
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
      )}
    </div>
  )
}

export default function SozlesmeModal({ sozlesme, musteriler, tenantId, onKaydet, onKapat }) {
  const [form, setForm] = useState(sozlesme ? { ...bos, ...sozlesme } : { ...bos })
  const [aktifTab, setAktifTab] = useState('genel')
  const [grupSirketleri, setGrupSirketleri] = useState([])

  useEffect(() => {
    const yukle = async () => {
      const snap = await getDocs(collection(db, 'grup_sirketleri'))
      const hepsi = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const sirali = []
      const analar = hepsi.filter(s => !s.parent_id).sort((a, b) => a.ad.localeCompare(b.ad))
      analar.forEach(ana => {
        sirali.push({ ...ana, _indent: false })
        hepsi.filter(s => s.parent_id === ana.id).sort((a, b) => a.ad.localeCompare(b.ad)).forEach(alt => {
          sirali.push({ ...alt, _indent: true })
        })
      })
      hepsi.filter(s => s.parent_id && !analar.find(a => a.id === s.parent_id)).forEach(s => {
        sirali.push({ ...s, _indent: false })
      })
      setGrupSirketleri(sirali)
    }
    yukle()
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleUrun = (u) => setForm(f => ({
    ...f, urun_tipleri: f.urun_tipleri.includes(u)
      ? f.urun_tipleri.filter(x => x !== u)
      : [...f.urun_tipleri, u]
  }))

  const handleKaydet = () => {
    if (!form.musteri_id) return alert('Müşteri seçimi zorunludur.')
    if (!form.baslangic || !form.bitis) return alert('Başlangıç ve bitiş tarihi zorunludur.')
    onKaydet(form)
  }

  const tabs = [
    { id: 'genel', label: 'Genel' },
    ...(sozlesme ? [{ id: 'artis_log', label: 'Artış Logu' }] : []),
    { id: 'detay', label: form.tip === 'depolama' ? 'Depolama' : form.tip === 'transport' ? 'Transport' : form.tip === 'vas' ? 'VAS' : 'Detay' },
    { id: 'artis', label: 'Artış & Ürün' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{sozlesme ? 'Sözleşme Düzenle' : 'Yeni Sözleşme'}</h2>
            {sozlesme?.id && <code className="text-xs text-gray-300 font-mono">{sozlesme.id}</code>}
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAktifTab(t.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${aktifTab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {aktifTab === 'genel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sözleşme Adı / Referansı</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Otomotiv Depolama 2024-2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri *</label>
                  <select value={form.musteri_id} onChange={e => set('musteri_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Seçin...</option>
                    {musteriler.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İmzalayan Şirket</label>
                  <select value={form.imzalayan_sirket_id || ''} onChange={e => set('imzalayan_sirket_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    <option value="">Seçin (opsiyonel)...</option>
                    {grupSirketleri.map(s => (
                      <option key={s.id} value={s.id} disabled={!s.parent_id && grupSirketleri.some(x => x.parent_id === s.id)}>
                        {s._indent ? `  └ ${s.ad}` : s.ad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Sözleşme Tipi</label>
                <div className="flex gap-2">
                  {[['depolama', 'Depolama'], ['transport', 'Transport'], ['vas', 'VAS'], ['karma', 'Karma']].map(([val, label]) => (
                    <button key={val} onClick={() => { set('tip', val); setAktifTab('genel') }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tip === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç *</label>
                  <input type="date" value={form.baslangic} onChange={e => set('baslangic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş *</label>
                  <input type="date" value={form.bitis} onChange={e => set('bitis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Para Birimi</label>
                  <div className="flex gap-1">
                    {PARA_BIRIMLERI.map(pb => (
                      <button key={pb} onClick={() => set('para_birimi', pb)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${form.para_birimi === pb ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {pb}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
                  <select value={form.durum} onChange={e => set('durum', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                    {[['teklif', 'Teklif'], ['aktif', 'Aktif'], ['bitti', 'Bitti'], ['iptal', 'İptal']].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Yenileme Uyarısı (gün)</label>
                  <input type="number" value={form.yenileme_uyari_gun} onChange={e => set('yenileme_uyari_gun', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="90" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sözleşme Yapısı</label>
                <div className="flex gap-2">
                  {[['sabit_toplam', 'Sabit Toplam'], ['yeniden_fiyatlanan', 'Yeniden Fiyatlanan']].map(([val, label]) => (
                    <button key={val} onClick={() => set('sozlesme_tipi', val)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium border ${form.sozlesme_tipi === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <BelgeAlan
                  label="Sözleşme Belgesi (PDF/Word, max 2MB veya link)"
                  deger={form.belge}
                  onChange={v => set('belge', v)}
                />
              </div>
            </div>
          )}

          {aktifTab === 'detay' && (
            <div>
              {form.tip === 'depolama' && <DepolamaDetay form={form} set={set} tenantId={tenantId} />}
              {form.tip === 'transport' && <TransportDetay form={form} set={set} />}
              {form.tip === 'vas' && <VasDetay form={form} set={set} tenantId={tenantId} />}
              {form.tip === 'karma' && (
                <div className="space-y-6">
                  <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">Karma sözleşme: ilgili bileşenleri doldurun.</div>
                  <div><div className="text-sm font-medium text-gray-700 mb-3">Depolama</div><DepolamaDetay form={form} set={set} tenantId={tenantId} /></div>
                  <div className="border-t border-gray-100 pt-4"><div className="text-sm font-medium text-gray-700 mb-3">Transport</div><TransportDetay form={form} set={set} /></div>
                  <div className="border-t border-gray-100 pt-4"><div className="text-sm font-medium text-gray-700 mb-3">VAS</div><VasDetay form={form} set={set} tenantId={tenantId} /></div>
                </div>
              )}
            </div>
          )}

          {aktifTab === 'artis_log' && sozlesme && (
            <ArtisLogu
              sozlesmeId={sozlesme.id}
              tenantId={tenantId}
              paraBirimi={form.para_birimi}
            />
          )}

          {aktifTab === 'artis' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.artis_var} onChange={e => set('artis_var', e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-gray-600">Artış Klözü Var</span>
                </label>
                {form.artis_var && (
                  <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Artış Tipi</label>
                        <select value={form.artis_tipi} onChange={e => set('artis_tipi', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                          {ARTIS_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Zamanlama</label>
                        <div className="flex gap-1">
                          {[['yillik_donum', 'Yıllık'], ['belirli_tarih', 'Tarih']].map(([val, label]) => (
                            <button key={val} onClick={() => set('artis_zamanlama', val)}
                              className={`flex-1 py-1.5 rounded-lg text-xs border ${form.artis_zamanlama === val ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {form.artis_zamanlama === 'belirli_tarih' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Artış Tarihi</label>
                          <input type="date" value={form.artis_belirli_tarih} onChange={e => set('artis_belirli_tarih', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                        </div>
                      )}
                      {form.artis_tipi === 'Özel Formül' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Özel Formül</label>
                          <input value={form.artis_ozel_formul} onChange={e => set('artis_ozel_formul', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                            placeholder="(TÜFE+ÜFE)/2" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ürün Tipleri (çoklu)</label>
                <div className="flex flex-wrap gap-1.5">
                  {URUN_TIPLERI.map(u => (
                    <button key={u} onClick={() => toggleUrun(u)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.urun_tipleri.includes(u) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
          <button onClick={handleKaydet} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
            {sozlesme ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
