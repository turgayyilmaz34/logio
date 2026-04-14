import { Plus, Trash2 } from 'lucide-react'

export default function KatlarPanel({ katlar = [], onKatEkle, onKatSil, onKatGuncelle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Kat / Bölüm Detayları</h3>
        <button
          type="button"
          onClick={onKatEkle}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Kat Ekle
        </button>
      </div>

      {katlar.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs">
          Henüz kat bilgisi eklenmedi. "Kat Ekle" butonuna basarak başlayın.
        </div>
      ) : (
        <div className="space-y-3">
          {katlar.map((kat, index) => (
            <div key={kat.id} className="grid grid-cols-12 gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-xl relative group transition-all hover:border-gray-200 hover:bg-white">
              <div className="col-span-1 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gray-300 bg-white w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center shadow-sm">
                  {index + 1}
                </span>
              </div>
              
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Alan (m²)</label>
                <input
                  type="number"
                  value={kat.alan || ''}
                  onChange={e => onKatGuncelle(kat.id, { alan: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Yükseklik (h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={kat.yukseklik || ''}
                  onChange={e => onKatGuncelle(kat.id, { yukseklik: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* YENİ EKLENEN RAMPA SAYISI */}
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Rampa Sayısı</label>
                <input
                  type="number"
                  value={kat.rampa_sayisi || ''}
                  onChange={e => onKatGuncelle(kat.id, { rampa_sayisi: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="col-span-2 flex items-end justify-end pb-1">
                <button
                  type="button"
                  onClick={() => onKatSil(kat.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Katı Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
