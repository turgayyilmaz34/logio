import { useState } from 'react'

const TESIS_TIPLERI = [
  'Cep Depo', 'Depo', 'Aktarma Merkezi', 'Cross-dock',
  'TIR Parkı', 'Fabrika', 'Liman / Rıhtım', 'Antrepo',
  'Açık Saha', 'Soğuk Zincir Hub'
]

const MULKIYET_STATUSLERI = [
  'Mülk', 'Kiralık', 'Antrepo', 'Müşteri Tesisi', 'Ortak Kullanım'
]

const OPERATOR_ROLLERI = [
  'Hizmet Sağlayıcı', 'İşletmeci', 'Kiracı', 'Alt Kiracı', 'Ortak İşletmeci'
]

export default function TesisModal({ tesis, onKaydet, onKapat }) {
  const [form, setForm] = useState({
    ad: tesis?.ad || '',
    sehir: tesis?.sehir || '',
    adres: tesis?.adres || '',
    tur: tesis?.tur || 'kiralik',
    tesis_tipi: tesis?.tesis_tipi || '',
    mulkiyet_statusu: tesis?.mulkiyet_statusu || '',
    operator_rolu: tesis?.operator_rolu || '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleKaydet = () => {
    if (!form.ad || !form.sehir) return alert('Ad ve şehir zorunludur.')
    onKaydet(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">
              {tesis ? 'Tesis Düzenle' : 'Yeni Tesis'}
            </h2>
            {tesis?.id && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-gray-400">ID:</span>
                <code className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded font-mono">
                  {tesis.id}
                </code>
              </div>
            )}
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Toplam m² bilgi notu */}
        {!tesis && (
          <div className="mx-6 mt-4 bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
            Toplam m² bilgisi kat tanımlamalarından otomatik hesaplanır. Tesisi kaydettikten sonra kat ekleyebilirsiniz.
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tesis Adı *</label>
              <input
                value={form.ad}
                onChange={e => set('ad', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="İzmir Depo A"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Şehir *</label>
              <input
                value={form.sehir}
                onChange={e => set('sehir', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="İzmir"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tür</label>
              <div className="flex gap-2">
                {[['kiralik', 'Kiralık'], ['mulk', 'Mülk']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => set('tur', val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.tur === val
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Adres</label>
              <input
                value={form.adres}
                onChange={e => set('adres', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="Mahalle, ilçe..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tesis Tipi</label>
              <select
                value={form.tesis_tipi}
                onChange={e => set('tesis_tipi', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Seçin...</option>
                {TESIS_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mülkiyet Statüsü</label>
              <select
                value={form.mulkiyet_statusu}
                onChange={e => set('mulkiyet_statusu', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Seçin...</option>
                {MULKIYET_STATUSLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Operatör Rolü</label>
              <select
                value={form.operator_rolu}
                onChange={e => set('operator_rolu', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">Seçin...</option>
                {OPERATOR_ROLLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            İptal
          </button>
          <button
            onClick={handleKaydet}
            className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800"
          >
            {tesis ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
