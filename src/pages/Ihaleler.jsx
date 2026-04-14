import { useState, useEffect } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import IhaleModal from '../components/IhaleModal'

const DURUM_RENK = {
  hazirlik: 'bg-gray-100 text-gray-600',
  gonderildi: 'bg-blue-50 text-blue-700',
  bekleniyor: 'bg-amber-50 text-amber-700',
  kazanildi: 'bg-green-50 text-green-700',
  kaybedildi: 'bg-red-50 text-red-600',
}

const DURUM_LABEL = {
  hazirlik: 'Hazırlık',
  gonderildi: 'Gönderildi',
  bekleniyor: 'Bekleniyor',
  kazanildi: 'Kazanıldı',
  kaybedildi: 'Kaybedildi',
}

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Ihaleler() {
  const [ihaleler, setIhaleler] = useState([])
  const [musteriler, setMusteriler] = useState([])
  const [kullanicilar, setKullanicilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [filtre, setFiltre] = useState('aktif')
  const [arama, setArama] = useState('')

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const [ihlSnap, musSnap] = await Promise.all([
      getDocs(query(collection(db, 'ihaleler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId))),
    ])
    setIhaleler(ihlSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMusteriler(musSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const musteriAd = (id) => musteriler.find(m => m.id === id)?.ad || '—'

  const kaydet = async (veri) => {
    if (secili) {
      await updateDoc(doc(db, 'ihaleler', secili.id), veri)
    } else {
      await addDoc(collection(db, 'ihaleler'), { ...veri, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu ihaleyi silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'ihaleler', id))
    yukle()
  }

  const DURUMLAR = ['hazirlik', 'gonderildi', 'bekleniyor', 'kazanildi', 'kaybedildi']
  const AKTIF = ['hazirlik', 'gonderildi', 'bekleniyor']

  const filtreli = ihaleler
    .filter(i => {
      if (filtre === 'aktif') return AKTIF.includes(i.durum)
      if (filtre === 'hepsi') return true
      return i.durum === filtre
    })
    .filter(i =>
      i.ad?.toLowerCase().includes(arama.toLowerCase()) ||
      musteriAd(i.musteri_id).toLowerCase().includes(arama.toLowerCase())
    )
    .sort((a, b) => a.son_basvuru?.localeCompare(b.son_basvuru || '') || 0)

  // İstatistikler
  const kazanma_orani = ihaleler.length > 0
    ? Math.round(ihaleler.filter(i => i.durum === 'kazanildi').length /
      ihaleler.filter(i => ['kazanildi', 'kaybedildi'].includes(i.durum)).length * 100) || 0
    : 0


  const handleExport = () => {
    const data = ihaleler.map(i => ({
      'İhale Adı': i.ad || '',
      'Müşteri': musteriAd(i.musteri_id),
      'Durum': i.durum || '',
      'Son Başvuru': i.son_basvuru || '',
      'Tahmini Değer (USD)': i.tahmini_deger_usd || '',
      'Para Birimi': i.para_birimi || '',
      'Satış Sorumlusu': i.sorumlu_satis || '',
      'ZDS Sorumlusu': i.sorumlu_zds || '',
      'Operasyon Sorumlusu': i.sorumlu_operasyon || '',
      'Mevcut 3PL': i.mevcut_3pl || '',
      'Sadece Fiyat': i.sadece_fiyat ? 'Evet' : 'Hayır',
      'Hizmet Tipleri': (i.hizmet_tipleri || []).join(', '),
      'Ürün Tipleri': (i.urun_tipleri || []).join(', '),
    }))
    exportToExcel(data, 'ihaleler', 'İhaleler')
  }
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">İhaleler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{ihaleler.length} ihale kayıtlı</p>
        </div>
        <button onClick={() => { setSecili(null); setModalAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          + Yeni İhale
        </button>
        <button onClick={handleExport}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↓ Excel
        </button>
      </div>

      {/* Pipeline + istatistik */}
      {ihaleler.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mb-6">
          {DURUMLAR.map(d => (
            <div key={d}
              onClick={() => setFiltre(filtre === d ? 'hepsi' : d)}
              className={`rounded-lg px-3 py-2 text-center cursor-pointer border transition-colors ${filtre === d ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
              <div className={`text-xs font-medium ${DURUM_RENK[d]?.split(' ')[1]}`}>{DURUM_LABEL[d]}</div>
              <div className="text-xl font-semibold text-gray-700 mt-1">
                {ihaleler.filter(i => i.durum === d).length}
              </div>
            </div>
          ))}
          <div className="rounded-lg px-3 py-2 text-center bg-white border border-gray-100">
            <div className="text-xs font-medium text-gray-400">Kazan Oranı</div>
            <div className={`text-xl font-semibold mt-1 ${kazanma_orani >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
              %{kazanma_orani}
            </div>
          </div>
        </div>
      )}

      {/* Filtre & arama */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['aktif', 'Aktif'], ['hepsi', 'Hepsi'], ['kazanildi', 'Kazanıldı'], ['kaybedildi', 'Kaybedildi']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtre === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="İhale adı veya müşteri ara..."
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64" />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : ihaleler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏆</div>
          <div className="text-sm font-medium text-gray-500">Henüz ihale eklenmedi</div>
          <button onClick={() => { setSecili(null); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk İhaleyi Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtreli.map(i => {
            const kalan = gunKaldi(i.son_basvuru)
            return (
              <div key={i.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-gray-800">{i.ad || '—'}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DURUM_RENK[i.durum]}`}>
                        {DURUM_LABEL[i.durum]}
                      </span>
                      {i.sadece_fiyat && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Fiyat toplama</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">{musteriAd(i.musteri_id)}</span>
                      {i.tahmini_deger_usd > 0 && (
                        <span className="text-xs font-medium text-gray-700">
                          ${Number(i.tahmini_deger_usd).toLocaleString()} USD
                        </span>
                      )}
                      {i.son_basvuru && (
                        <span className={`text-xs ${kalan !== null && kalan < 0 ? 'text-red-600 font-medium' : kalan !== null && kalan <= 7 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          Son başvuru: {i.son_basvuru}
                          {kalan !== null && (
                            <span className="ml-1">
                              {kalan < 0 ? `(${Math.abs(kalan)} gün geçti!)` : kalan === 0 ? '(Bugün!)' : `(${kalan} gün kaldı)`}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {i.sorumlu_satis && <span className="text-xs text-gray-400">Satış: <span className="text-gray-600">{i.sorumlu_satis}</span></span>}
                      {i.sorumlu_zds && <span className="text-xs text-gray-400">ZDS: <span className="text-gray-600">{i.sorumlu_zds}</span></span>}
                      {i.sorumlu_operasyon && <span className="text-xs text-gray-400">Operasyon: <span className="text-gray-600">{i.sorumlu_operasyon}</span></span>}
                    </div>

                    {i.mevcut_3pl && (
                      <div className="text-xs text-gray-400 mt-1">
                        Mevcut 3PL: <span className="text-gray-600">{i.mevcut_3pl}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button onClick={() => { setSecili(i); setModalAcik(true) }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                      Düzenle
                    </button>
                    <button onClick={() => sil(i.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Filtreye uyan ihale bulunamadı.</div>
          )}
        </div>
      )}

      {modalAcik && (
        <IhaleModal
          ihale={secili}
          musteriler={musteriler}
          onKaydet={kaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
