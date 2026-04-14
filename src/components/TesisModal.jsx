import { useState } from 'react'
import { X } from 'lucide-react'
import KatlarPanel from './KatlarPanel'

export default function TesisModal({ tesis, onKaydet, onKapat }) {
  const [form, setForm] = useState(tesis || {
    ad: '',
    sehir: '',
    ilce: '',
    adres: '',
    tip: 'Depo',
    yapi_tipi: 'betonarme',
    isletme_modeli: 'multi_user',
    mulkiyet_tipi: 'kiralik',
    foto_link: '',
    sharepoint_link: '',
    kira_baslangic: '',
    kira_bitis: '',
    katlar: []
  })

  const handleKatEkle = () => {
    const yeniKat = { id: Date.now(), alan: 0, yukseklik: 0, rampa_sayisi: 0, layout_link: '' }
    setForm({ ...form, katlar: [...(form.katlar || []), yeniKat] })
  }

  const handleKatSil = (id) => {
    setForm({ ...form, katlar: form.katlar.filter(k => k.id !== id) })
  }

  const handleKatGuncelle = (id, veri) => {
    setForm({
      ...form,
      katlar: form.katlar.map(k => k.id === id ? { ...k, ...veri } : k)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{tesis ? 'Tesisi Düzenle' : 'Yeni Tesis Ekle'}</h2>
            <p className="text-sm text-gray-400">Tesis teknik özellikleri ve dökümanları</p>
          </div>
          <button onClick={onKapat} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Tesis Adı</label>
                <input
                  value={form.ad}
                  onChange={e => setForm({ ...form, ad: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Örn: Tuzla Lojistik Merkezi"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Şehir</label>
                  <input
                    value={form.sehir}
                    onChange={e => setForm({ ...form, sehir: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">İlçe</label>
                  <input
                    value={form.ilce}
                    onChange={e => setForm({ ...form, ilce: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Yapı Tipi & Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.yapi_tipi}
                    onChange={e => setForm({ ...form, yapi_tipi: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="betonarme">Betonarme</option>
                    <option value="celik">Çelik Konstrüksiyon</option>
                  </select>
                  <select
                    value={form.isletme_modeli}
                    onChange={e => setForm({ ...form, isletme_modeli: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="multi_user">Multi-User</option>
                    <option value="dedicated">Dedicated</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Mülkiyet & Görsel Link</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    value={form.mulkiyet_tipi}
                    onChange={e => setForm({ ...form, mulkiyet_tipi: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="oz_mal">Öz Mal</option>
                    <option value="kiralik">Kiralık</option>
                    <option value="musteri_tesisi">Müşteri Tesisi</option>
                  </select>
                  <input
                    value={form.foto_link}
                    onChange={e => setForm({ ...form, foto_link: e.target.value })}
                    placeholder="Fotoğraf URL (JPG/PNG)"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Sharepoint / OneDrive Link</label>
                <input
                  value={form.sharepoint_link}
                  onChange={e => setForm({ ...form, sharepoint_link: e.target.value })}
                  placeholder="Dosya veya Klasör Linki"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Kira Başlangıç</label>
                  <input
                    type="date"
                    value={form.kira_baslangic}
                    onChange={e => setForm({ ...form, kira_baslangic: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Kira Bitiş</label>
                  <input
                    type="date"
                    value={form.kira_bitis}
                    onChange={e => setForm({ ...form, kira_bitis: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <KatlarPanel
            katlar={form.katlar}
            onKatEkle={handleKatEkle}
            onKatSil={handleKatSil}
            onKatGuncelle={handleKatGuncelle}
          />
        </div>

        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button onClick={onKapat} className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">
            İptal
          </button>
          <button
            onClick={() => onKaydet(form)}
            className="px-10 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
