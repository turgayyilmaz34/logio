
import { useState } from 'react'

const DURUMLAR = [
  ['hazirlik', 'Hazırlık'],
  ['gonderildi', 'Gönderildi'],
  ['bekleniyor', 'Bekleniyor'],
  ['kazanildi', 'Kazanıldı'],
  ['kaybedildi', 'Kaybedildi'],
]

const HIZMET_TIPLERI = ['Depolama', 'Transport', 'VAS', 'Karma']
const URUN_TIPLERI = [
  'Otomotiv', 'Gıda — Kuru', 'Gıda — Soğuk', 'İlaç', 'Kozmetik',
  'Kimyasal', 'Tehlikeli Madde', 'Elektronik', 'Tekstil', 'Diğer'
]

const bos = {
  ad: '', musteri_id: '', son_basvuru: '', tahmini_deger_usd: '',
  durum: 'hazirlik', para_birimi: 'USD',
  sorumlu_satis: '', sorumlu_zds: '', sorumlu_operasyon: '',
  sadece_fiyat: false,
  hikaye_nereden_geldi: '', mevcut_3pl: '', degisim_sebebi: '',
  hizmet_tipleri: [], urun_tipleri: [],
  notlar: '',
}

export default function IhaleModal({ ihale, musteriler, onKaydet, onKapat }) {
  const [form, setForm] = useState(ihale ? { ...bos, ...ihale } : { ...bos })
  const [aktifTab, setAktifTab] = useState('genel')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggle = (key, val) => setForm(f => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
  }))

  const handleKaydet = () => {
    if (!form.ad) return alert('İhale adı zorunludur.')
    if (!form.musteri_id) return alert('Müşteri seçimi zorunludur.')
    onKaydet(form)
  }

  const tabs = [
    { id: 'genel', label: 'Genel' },
    { id: 'hikaye', label: 'Hikaye' },
    { id: 'kapsam', label: 'Kapsam' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{ihale ? 'İhale Düzenle' : 'Yeni İhale'}</h2>
            {ihale?.id && <code className="text-xs text-gray-300 font-mono">{ihale.id}</code>}
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

          {/* GENEL */}
          {aktifTab === 'genel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">İhale Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Otomotiv Depolama İhalesi 2026" />
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Son Başvuru Tarihi</label>
                  <input type="date" value={form.son_basvuru} onChange={e => set('son_basvuru', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tahmini Değer (USD)</label>
                  <input type="number" value={form.tahmini_deger_usd} onChange={e => set('tahmini_deger_usd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="500000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Para Birimi</label>
                  <div className="flex gap-1">
                    {['USD', 'EUR', 'TRY'].map(pb => (
                      <button key={pb} onClick={() => set('para_birimi', pb)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border ${form.para_birimi === pb ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {pb}
                      </button>
                    ))}
                  </div>
                </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Satış Sorumlusu</label>
                  <input value={form.sorumlu_satis} onChange={e => set('sorumlu_satis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ZDS Sorumlusu</label>
                  <input value={form.sorumlu_zds} onChange={e => set('sorumlu_zds', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Operasyon Sorumlusu</label>
                  <input value={form.sorumlu_operasyon} onChange={e => set('sorumlu_operasyon', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ad Soyad" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.sadece_fiyat} onChange={e => set('sadece_fiyat', e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-600">Sadece fiyat topluyorlar (gerçek ihale değil)</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
          )}

          {/* HİKAYE */}
          {aktifTab === 'hikaye' && (
            <div className="space-y-4">
              <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg">
                Bu iş bize nereden geldi? Müşteri neden değiştirmek istiyor? Rekabet durumu nedir?
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bu iş bize nereden geldi?</label>
                <textarea value={form.hikaye_nereden_geldi} onChange={e => set('hikaye_nereden_geldi', e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Referans, soğuk temas, ihale platformu, mevcut müşteri yönlendirmesi..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mevcut 3PL kim yapıyor?</label>
                <input value={form.mevcut_3pl} onChange={e => set('mevcut_3pl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Rakip firma adı veya bilinmiyor" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri neden değiştirmek istiyor?</label>
                <textarea value={form.degisim_sebebi} onChange={e => set('degisim_sebebi', e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Fiyat, servis kalitesi, kapasite sorunu, sözleşme yenileme, büyüme..." />
              </div>
            </div>
          )}

          {/* KAPSAM */}
          {aktifTab === 'kapsam' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Hizmet Tipleri</label>
                <div className="flex flex-wrap gap-1.5">
                  {HIZMET_TIPLERI.map(h => (
                    <button key={h} onClick={() => toggle('hizmet_tipleri', h)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.hizmet_tipleri.includes(h) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ürün Tipleri</label>
                <div className="flex flex-wrap gap-1.5">
                  {URUN_TIPLERI.map(u => (
                    <button key={u} onClick={() => toggle('urun_tipleri', u)}
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
            {ihale ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
