
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase'

const ARTIS_TIPLERI = [
  'TÜFE', 'ÜFE', 'TÜFE+ÜFE Ortalaması', 'ABD CPI', 'Euro Bölgesi HICP',
  'Sabit Oran', 'Özel Formül'
]

const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']

const KIRA_TIPLERI = [
  { value: 'sabit', label: 'Sabit Aylık' },
  { value: 'm2_bazli', label: 'm² Bazlı' },
  { value: 'karma', label: 'Karma (Sabit + m²)' },
]

const bos = {
  mal_sahibi_adi: '',
  sozlesme_tipi: 'sabit_toplam',
  kira_tipi: 'sabit',
  baslangic: '',
  bitis: '',
  yenileme_uyari_gun: 90,
  para_birimi: 'TRY',
  sabit_tutar: '',
  m2_birim_fiyat: '',
  asmakat_birim_fiyat: '',
  artis_var: false,
  artis_tipi: 'TÜFE',
  artis_ozel_formul: '',
  artis_zamanlama: 'yillik_donum',
  artis_belirli_tarih: '',
  notlar: '',
}

function ArtisLoguPanel({ sozlesmeId, tenantId }) {
  const [loglar, setLoglar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState({
    uygulama_tarihi: '', artis_tipi: 'TÜFE', oran_yuzdesi: '',
    eski_m2_fiyat: '', yeni_m2_fiyat: '', gercek: true, aciklama: ''
  })

  const yukle = async () => {
    const q = query(collection(db, 'artis_loglari'),
      where('sozlesme_id', '==', sozlesmeId),
      where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    setLoglar(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.uygulama_tarihi?.localeCompare(a.uygulama_tarihi)))
  }

  useEffect(() => { if (sozlesmeId) yukle() }, [sozlesmeId])

  const kaydet = async () => {
    if (!form.uygulama_tarihi || !form.oran_yuzdesi) return alert('Tarih ve oran zorunludur.')
    await addDoc(collection(db, 'artis_loglari'), {
      ...form, sozlesme_id: sozlesmeId, tenant_id: tenantId,
      sozlesme_tipi: 'mal_sahibi',
      oran_yuzdesi: Number(form.oran_yuzdesi),
      eski_m2_fiyat: Number(form.eski_m2_fiyat) || 0,
      yeni_m2_fiyat: Number(form.yeni_m2_fiyat) || 0,
    })
    setForm({ uygulama_tarihi: '', artis_tipi: 'TÜFE', oran_yuzdesi: '', eski_m2_fiyat: '', yeni_m2_fiyat: '', gercek: true, aciklama: '' })
    setFormAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu artış kaydını silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'artis_loglari', id))
    yukle()
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Artış Logları</div>
        <button onClick={() => setFormAcik(!formAcik)}
          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          + Artış Ekle
        </button>
      </div>

      {formAcik && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Uygulama Tarihi *</label>
              <input type="date" value={form.uygulama_tarihi}
                onChange={e => setForm(f => ({ ...f, uygulama_tarihi: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Artış Tipi</label>
              <select value={form.artis_tipi} onChange={e => setForm(f => ({ ...f, artis_tipi: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white">
                {ARTIS_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Oran % *</label>
              <input type="number" step="0.01" value={form.oran_yuzdesi}
                onChange={e => setForm(f => ({ ...f, oran_yuzdesi: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="4.20" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Durum</label>
              <div className="flex gap-2">
                {[[true, 'Gerçek'], [false, 'Tahmini']].map(([val, label]) => (
                  <button key={label} onClick={() => setForm(f => ({ ...f, gercek: val }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs border ${form.gercek === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Eski m² Fiyatı</label>
              <input type="number" step="0.01" value={form.eski_m2_fiyat}
                onChange={e => setForm(f => ({ ...f, eski_m2_fiyat: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="9.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Yeni m² Fiyatı</label>
              <input type="number" step="0.01" value={form.yeni_m2_fiyat}
                onChange={e => setForm(f => ({ ...f, yeni_m2_fiyat: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                placeholder="9.38" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Açıklama</label>
            <input value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-50 rounded-lg">İptal</button>
            <button onClick={kaydet} className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700">Kaydet</button>
          </div>
        </div>
      )}

      {loglar.length === 0 ? (
        <div className="text-xs text-gray-400 py-1">Henüz artış kaydı yok.</div>
      ) : (
        <div className="space-y-1.5">
          {loglar.map(log => (
            <div key={log.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${log.gercek ? 'bg-white border border-gray-100' : 'bg-amber-50 border border-amber-100'}`}>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{log.uygulama_tarihi}</span>
                <span className="font-medium text-gray-700">{log.artis_tipi}</span>
                <span className="text-green-700 font-semibold">%{log.oran_yuzdesi}</span>
                {log.eski_m2_fiyat > 0 && (
                  <span className="text-gray-500">{log.eski_m2_fiyat} → {log.yeni_m2_fiyat}</span>
                )}
                {!log.gercek && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Tahmini</span>}
              </div>
              <button onClick={() => sil(log.id)} className="text-red-400 hover:text-red-600">Sil</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MalSahibiSozlesmesi({ katId, tenantId }) {
  const [sozlesme, setSozlesme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState(bos)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const yukle = async () => {
    setLoading(true)
    const q = query(collection(db, 'mal_sahibi_sozlesmeleri'),
      where('kat_id', '==', katId),
      where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      setSozlesme({ id: snap.docs[0].id, ...snap.docs[0].data() })
    } else {
      setSozlesme(null)
    }
    setLoading(false)
  }

  useEffect(() => { yukle() }, [katId])

  const duzenlemeAc = () => {
    if (sozlesme) {
      setForm({
        mal_sahibi_adi: sozlesme.mal_sahibi_adi || '',
        sozlesme_tipi: sozlesme.sozlesme_tipi || 'sabit_toplam',
        kira_tipi: sozlesme.kira_tipi || 'sabit',
        baslangic: sozlesme.baslangic || '',
        bitis: sozlesme.bitis || '',
        yenileme_uyari_gun: sozlesme.yenileme_uyari_gun || 90,
        para_birimi: sozlesme.para_birimi || 'TRY',
        sabit_tutar: sozlesme.sabit_tutar || '',
        m2_birim_fiyat: sozlesme.m2_birim_fiyat || '',
        asmakat_birim_fiyat: sozlesme.asmakat_birim_fiyat || '',
        artis_var: sozlesme.artis_var || false,
        artis_tipi: sozlesme.artis_tipi || 'TÜFE',
        artis_ozel_formul: sozlesme.artis_ozel_formul || '',
        artis_zamanlama: sozlesme.artis_zamanlama || 'yillik_donum',
        artis_belirli_tarih: sozlesme.artis_belirli_tarih || '',
        notlar: sozlesme.notlar || '',
      })
    } else {
      setForm(bos)
    }
    setFormAcik(true)
  }

  const kaydet = async () => {
    if (!form.mal_sahibi_adi) return alert('Mal sahibi adı zorunludur.')
    const veri = {
      ...form,
      kat_id: katId,
      tenant_id: tenantId,
      sabit_tutar: Number(form.sabit_tutar) || 0,
      m2_birim_fiyat: Number(form.m2_birim_fiyat) || 0,
      asmakat_birim_fiyat: Number(form.asmakat_birim_fiyat) || 0,
      yenileme_uyari_gun: Number(form.yenileme_uyari_gun) || 90,
    }
    if (sozlesme) {
      await updateDoc(doc(db, 'mal_sahibi_sozlesmeleri', sozlesme.id), veri)
    } else {
      await addDoc(collection(db, 'mal_sahibi_sozlesmeleri'), veri)
    }
    setFormAcik(false)
    yukle()
  }

  const sil = async () => {
    if (!window.confirm('Mal sahibi sözleşmesini silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'mal_sahibi_sozlesmeleri', sozlesme.id))
    setSozlesme(null)
  }

  const gunKaldi = (bitis) => {
    if (!bitis) return null
    const fark = Math.ceil((new Date(bitis) - new Date()) / (1000 * 60 * 60 * 24))
    return fark
  }

  if (loading) return <div className="text-xs text-gray-400 py-1">Yükleniyor...</div>

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mal Sahibi Sözleşmesi</div>
        {!formAcik && (
          <button onClick={duzenlemeAc}
            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            {sozlesme ? 'Düzenle' : '+ Ekle'}
          </button>
        )}
      </div>

      {/* Özet görünüm */}
      {!formAcik && sozlesme && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">{sozlesme.mal_sahibi_adi}</div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{sozlesme.baslangic} → {sozlesme.bitis}</span>
                <span className="font-medium text-gray-700">
                  {sozlesme.para_birimi} {sozlesme.m2_birim_fiyat > 0 ? `${sozlesme.m2_birim_fiyat}/m²` : sozlesme.sabit_tutar > 0 ? `${sozlesme.sabit_tutar} sabit` : ''}
                </span>
                {sozlesme.artis_var && (
                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{sozlesme.artis_tipi}</span>
                )}
              </div>
              {sozlesme.bitis && (() => {
                const kalan = gunKaldi(sozlesme.bitis)
                if (kalan <= (sozlesme.yenileme_uyari_gun || 90)) {
                  return (
                    <div className={`text-xs px-2 py-0.5 rounded inline-block ${kalan < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {kalan < 0 ? `${Math.abs(kalan)} gün önce bitti!` : `${kalan} gün kaldı — yenileme yaklaşıyor`}
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <button onClick={sil} className="text-xs text-red-400 hover:text-red-600">Sil</button>
          </div>
          <ArtisLoguPanel sozlesmeId={sozlesme.id} tenantId={tenantId} />
        </div>
      )}

      {!formAcik && !sozlesme && (
        <div className="text-xs text-gray-400 italic py-1">Mal sahibi sözleşmesi tanımlı değil.</div>
      )}

      {/* Form */}
      {formAcik && (
        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Mal Sahibi Adı *</label>
              <input value={form.mal_sahibi_adi} onChange={e => set('mal_sahibi_adi', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="Ekol Lojistik, ABC Gayrimenkul..." />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
              <input type="date" value={form.baslangic} onChange={e => set('baslangic', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
              <input type="date" value={form.bitis} onChange={e => set('bitis', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Yenileme Uyarısı (gün önce)</label>
              <input type="number" value={form.yenileme_uyari_gun} onChange={e => set('yenileme_uyari_gun', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="90" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Para Birimi</label>
              <div className="flex gap-1">
                {PARA_BIRIMLERI.map(pb => (
                  <button key={pb} onClick={() => set('para_birimi', pb)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${form.para_birimi === pb ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {pb}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Kira Tipi</label>
              <div className="flex gap-2">
                {KIRA_TIPLERI.map(kt => (
                  <button key={kt.value} onClick={() => set('kira_tipi', kt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${form.kira_tipi === kt.value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {kt.label}
                  </button>
                ))}
              </div>
            </div>

            {(form.kira_tipi === 'sabit' || form.kira_tipi === 'karma') && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sabit Aylık Tutar ({form.para_birimi})</label>
                <input type="number" value={form.sabit_tutar} onChange={e => set('sabit_tutar', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="50000" />
              </div>
            )}

            {(form.kira_tipi === 'm2_bazli' || form.kira_tipi === 'karma') && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">m² Birim Fiyat ({form.para_birimi})</label>
                <input type="number" step="0.01" value={form.m2_birim_fiyat} onChange={e => set('m2_birim_fiyat', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="9.00" />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Asmakat Birim Fiyat ({form.para_birimi})</label>
              <input type="number" step="0.01" value={form.asmakat_birim_fiyat} onChange={e => set('asmakat_birim_fiyat', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="0 ise girmeyebilirsiniz" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Sözleşme Tipi</label>
              <div className="flex gap-1">
                {[['sabit_toplam', 'Sabit Toplam'], ['yeniden_fiyatlanan', 'Yeniden Fiyatlanan']].map(([val, label]) => (
                  <button key={val} onClick={() => set('sozlesme_tipi', val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${form.sozlesme_tipi === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Artış Tanımı */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={form.artis_var} onChange={e => set('artis_var', e.target.checked)} className="rounded" />
              <span className="text-xs font-medium text-gray-600">Artış Klözü Var</span>
            </label>

            {form.artis_var && (
              <div className="grid grid-cols-2 gap-3 bg-amber-50 rounded-lg p-3">
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
                    {[['yillik_donum', 'Yıllık'], ['belirli_tarih', 'Belirli Tarih']].map(([val, label]) => (
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
                      placeholder="(TÜFE+ÜFE)/2 gibi" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notlar</label>
            <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:bg-gray-50 rounded-lg">İptal</button>
            <button onClick={kaydet} className="text-xs bg-blue-700 text-white px-4 py-1.5 rounded-lg hover:bg-blue-800">Kaydet</button>
          </div>
        </div>
      )}
    </div>
  )
}
