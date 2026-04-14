import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { exportMultiSheet } from '../utils/exportExcel'
import TesisModal from '../components/TesisModal'

export default function Tesisler() {
  const [tesisler, setTesisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))
      const snap = await getDocs(q)
      setTesisler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const kaydet = async (veri) => {
    if (secili) {
      await updateDoc(doc(db, 'tesisler', secili.id), veri)
    } else {
      await addDoc(collection(db, 'tesisler'), { ...veri, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu tesisi silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'tesisler', id))
    yukle()
  }

  const handleExport = () => {
    // Sekme 1: Tesis Listesi
    const tesislerData = tesisler.map(t => ({
      'Tesis ID': t.id,
      'Tesis Adı': t.ad || '',
      'Şehir': t.sehir || '',
      'İlçe': t.ilce || '',
      'Adres': t.adres || '',
      'Tesis Tipi': t.tip || '',
      'Toplam Kat Sayısı': (t.katlar || []).length,
      'Toplam Alan (m²)': (t.katlar || []).reduce((sum, k) => sum + Number(k.alan || 0), 0)
    }))

    // Sekme 2: Kat ve Rampa Detayları
    const katDetayData = []
    tesisler.forEach(t => {
      const katlar = t.katlar || []
      katlar.forEach((k, index) => {
        katDetayData.push({
          'Tesis Adı': t.ad,
          'Kat/Bölüm No': index + 1,
          'Alan (m²)': k.alan || 0,
          'Yükseklik (h)': k.yukseklik || 0,
          'Rampa Sayısı': k.rampa_sayisi || 0, // EXCEL'E EKLENEN YENİ SÜTUN
          'Zemin Tipi': k.zemin_tipi || 'Belirtilmemiş'
        })
      })
    })

    exportMultiSheet([
      { name: 'Genel Tesis Listesi', data: tesislerData },
      { name: 'Kat ve Rampa Detayları', data: katDetayData }
    ], 'Logio_Tesis_Raporu')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Tesisler</h1>
          <p className="text-sm text-gray-400 mt-0.5">Depo ve operasyonel tesis yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            ↓ Excel İndir
          </button>
          <button
            onClick={() => { setSecili(null); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            + Yeni Tesis Ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Tesisler yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tesisler.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{t.ad}</h3>
                  <p className="text-xs text-gray-400">{t.sehir} / {t.ilce}</p>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold uppercase">{t.tip}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Toplam Alan</div>
                  <div className="text-sm font-semibold text-gray-700">
                    {(t.katlar || []).reduce((sum, k) => sum + Number(k.alan || 0), 0).toLocaleString()} m²
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Kat / Rampa</div>
                  <div className="text-sm font-semibold text-gray-700">
                    {(t.katlar || []).length} Kat / {(t.katlar || []).reduce((sum, k) => sum + Number(k.rampa_sayisi || 0), 0)} Rampa
                  </div>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setSecili(t); setModalAcik(true) }}
                  className="flex-1 py-2 text-xs font-medium border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => sil(t.id)}
                  className="px-3 py-2 text-xs font-medium border border-red-50 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAcik && (
        <TesisModal
          tesis={secili}
          onKaydet={kaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
