
import { useState } from 'react'

const SEKTORLER = [
  'Otomotiv', 'Gıda & İçecek', 'İlaç & Sağlık', 'Kimya & Petrokimya',
  'Tekstil & Hazır Giyim', 'Elektronik & Teknoloji', 'Perakende & E-ticaret',
  'İnşaat & Yapı', 'Enerji', 'Savunma & Havacılık', 'Tarım & Ormancılık',
  'Mobilya & Dekorasyon', 'Lojistik & 3PL', 'Diğer'
]

const URUN_TIPLERI = [
  'Otomotiv', 'Gıda — Kuru', 'Gıda — Soğuk', 'Gıda — Derin Dondurma',
  'İlaç — Soğuk Zincir', 'İlaç — Kuru', 'Kozmetik', 'Kimyasal',
  'Tehlikeli Madde', 'Elektronik', 'Tekstil', 'Mobilya', 'İnşaat Malzemesi',
  'Tarım & Hammadde', 'Enerji & Petrol', 'Perakende & E-ticaret', 'Diğer'
]

const ULKELER = [
  'Türkiye', 'Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda',
  'Belçika', 'Polonya', 'Çek Cumhuriyeti', 'Romanya', 'Bulgaristan',
  'Yunanistan', 'İngiltere', 'ABD', 'Çin', 'Diğer'
]

export default function MusteriModal({ musteri, onKaydet, onKapat }) {
  const [form, setForm] = useState({
    ad: musteri?.ad || '',
    ulke: musteri?.ulke || '',
    vergi_no: musteri?.vergi_no || '',
    yillik_ciro_usd: musteri?.yillik_ciro_usd || '',
    odeme_vadesi_gun: musteri?.odeme_vadesi_gun || '',
    kredi_limiti_usd: musteri?.kredi_limiti_usd || '',
    risk_sinifi: musteri?.risk_sinifi || 'A',
    sektor: musteri?.sektor || [],
    urun_tipleri: musteri?.urun_tipleri || [],
    irtibat_kisiler: musteri?.irtibat_kisiler || [],
    notlar: musteri?.notlar || '',
  })

  const [yeniIrtibat, setYeniIrtibat] = useState({ ad: '', unvan: '', email: '', tel: '' })
  const [irtibatFormAcik, setIrtibatFormAcik] = useState(false)
  const [aktifTab, setAktifTab] = useState('genel')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleCoklu = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
    }))
  }

  const irtibatEkle = () => {
    if (!yeniIrtibat.ad) return
    setForm(f => ({ ...f, irtibat_kisiler: [...f.irtibat_kisiler, yeniIrtibat] }))
    setYeniIrtibat({ ad: '', unvan: '', email: '', tel: '' })
    setIrtibatFormAcik(false)
  }

  const irtibatSil = (i) => {
    setForm(f => ({ ...f, irtibat_kisiler: f.irtibat_kisiler.filter((_, idx) => idx !== i) }))
  }

  const handleKaydet = () => {
    if (!form.ad) return alert('Müşteri adı zorunludur.')
    onKaydet(form)
  }

  const tabs = [
    { id: 'genel', label: 'Genel Bilgi' },
    { id: 'sektor', label: 'Sektör & Ürün' },
    { id: 'irtibat', label: 'İrtibat' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">
              {musteri ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
            </h2>
            {musteri?.id && (
              <code className="text-xs text-gray-300 font-mono">{musteri.id}</code>
            )}
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setAktifTab(t.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                aktifTab === t.id
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form içeriği */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* GENEL BİLGİ */}
          {aktifTab === 'genel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri Adı *</label>
                <input
                  value={form.ad}
                  onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Firma Adı A.Ş."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ülke</label>
                  <select
                    value={form.ulke}
                    onChange={e => set('ulke', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">Seçin...</option>
                    {ULKELER.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vergi No</label>
                  <input
                    value={form.vergi_no}
                    onChange={e => set('vergi_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Yıllık Ciro (USD)</label>
                  <input
                    type="number"
                    value={form.yillik_ciro_usd}
                    onChange={e => set('yillik_ciro_usd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kredi Limiti (USD)</label>
                  <input
                    type="number"
                    value={form.kredi_limiti_usd}
                    onChange={e => set('kredi_limiti_usd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="500000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ödeme Vadesi (gün)</label>
                  <input
                    type="number"
                    value={form.odeme_vadesi_gun}
                    onChange={e => set('odeme_vadesi_gun', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Risk Sınıfı</label>
                  <div className="flex gap-2">
                    {['A', 'B', 'C'].map(r => (
                      <button
                        key={r}
                        onClick={() => set('risk_sinifi', r)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          form.risk_sinifi === r
                            ? r === 'A' ? 'bg-green-600 text-white border-green-600'
                              : r === 'B' ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea
                  value={form.notlar}
                  onChange={e => set('notlar', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Ek bilgiler..."
                />
              </div>
            </div>
          )}

          {/* SEKTÖR & ÜRÜN */}
          {aktifTab === 'sektor' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Sektör (çoklu seçim)</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEKTORLER.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleCoklu('sektor', s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.sektor.includes(s)
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Ürün Tipleri (çoklu seçim)</label>
                <div className="flex flex-wrap gap-1.5">
                  {URUN_TIPLERI.map(u => (
                    <button
                      key={u}
                      onClick={() => toggleCoklu('urun_tipleri', u)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.urun_tipleri.includes(u)
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* İRTİBAT */}
          {aktifTab === 'irtibat' && (
            <div className="space-y-3">
              {form.irtibat_kisiler.map((k, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{k.ad}</div>
                    {k.unvan && <div className="text-xs text-gray-400">{k.unvan}</div>}
                    <div className="flex gap-3 mt-1">
                      {k.email && <span className="text-xs text-blue-600">{k.email}</span>}
                      {k.tel && <span className="text-xs text-gray-500">{k.tel}</span>}
                    </div>
                  </div>
                  <button onClick={() => irtibatSil(i)} className="text-xs text-red-400 hover:text-red-600">Sil</button>
                </div>
              ))}

              {irtibatFormAcik ? (
                <div className="border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ad *</label>
                      <input
                        value={yeniIrtibat.ad}
                        onChange={e => setYeniIrtibat(f => ({ ...f, ad: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ünvan</label>
                      <input
                        value={yeniIrtibat.unvan}
                        onChange={e => setYeniIrtibat(f => ({ ...f, unvan: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">E-posta</label>
                      <input
                        type="email"
                        value={yeniIrtibat.email}
                        onChange={e => setYeniIrtibat(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                      <input
                        value={yeniIrtibat.tel}
                        onChange={e => setYeniIrtibat(f => ({ ...f, tel: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIrtibatFormAcik(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:bg-gray-50 rounded-lg">İptal</button>
                    <button onClick={irtibatEkle} className="text-xs bg-blue-700 text-white px-4 py-1.5 rounded-lg hover:bg-blue-800">Ekle</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIrtibatFormAcik(true)}
                  className="w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500"
                >
                  + İrtibat Kişisi Ekle
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
          <button
            onClick={handleKaydet}
            className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800"
          >
            {musteri ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
