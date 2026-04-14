import { useState, useEffect } from 'react'
import { exportMultiSheet } from '../utils/exportExcel'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'
import MusteriModal from '../components/MusteriModal'

const RISK_RENK = {
  A: 'bg-green-50 text-green-700',
  B: 'bg-amber-50 text-amber-700',
  C: 'bg-red-50 text-red-700',
}

export default function Musteriler() {
  const [musteriler, setMusteriler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [arama, setArama] = useState('')

  // useRole'den gelen değişkenin 'role' veya 'rol' olduğundan emin olmalıyız. 
  // Yaygın kullanım 'role' olduğu için burada 'role' olarak alıp 'rol' ismine eşitliyoruz.
  const { role: rol } = useRole() 
  
  const currentUser = auth.currentUser;
  const tenantId = currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    if (!tenantId) return;
    setLoading(true)
    try {
      const q = query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId))
      const snap = await getDocs(q)
      setMusteriler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error("Müşteriler yüklenirken hata oluştu:", error)
    } finally {
      setLoading(false)
    }
  }

  // auth state değiştiğinde veya bileşen yüklendiğinde veriyi çek
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        yukle()
      }
    })
    return () => unsubscribe()
  }, [tenantId])

  const kaydet = async (veri) => {
    try {
      if (secili) {
        await updateDoc(doc(db, 'musteriler', secili.id), veri)
      } else {
        await addDoc(collection(db, 'musteriler'), { ...veri, tenant_id: tenantId })
      }
      setModalAcik(false)
      yukle()
    } catch (error) {
      alert("Kaydedilirken bir hata oluştu.")
    }
  }

  const sil = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    try {
      await deleteDoc(doc(db, 'musteriler', id))
      yukle()
    } catch (error) {
      alert("Silme işlemi başarısız.")
    }
  }

  const filtreli = musteriler.filter(m =>
    m.ad?.toLowerCase().includes(arama.toLowerCase()) ||
    m.sektor?.join(' ').toLowerCase().includes(arama.toLowerCase()) ||
    m.ulke?.toLowerCase().includes(arama.toLowerCase())
  )

  const handleExport = () => {
    const genelData = musteriler.map(m => ({
      'Müşteri ID': m.id,
      'Müşteri Adı': m.ad || '',
      'Ülke': m.ulke || '',
      'Vergi No': m.vergi_no || '',
      'Yıllık Ciro (USD)': m.yillik_ciro_usd || '',
      'Kredi Limiti (USD)': m.kredi_limiti_usd || '',
      'Ödeme Vadesi (gün)': m.odeme_vadesi_gun || '',
      'Risk Sınıfı': m.risk_sinifi || '',
      'Notlar': m.notlar || '',
    }))

    const sektorData = musteriler.map(m => ({
      'Müşteri ID': m.id,
      'Müşteri Adı': m.ad || '',
      'Sektörler': (m.sektor || []).join(', '),
      'Ürün Tipleri': (m.urun_tipleri || []).join(', '),
    }))

    const irtibatData = []
    musteriler.forEach(m => {
      const kisiler = m.irtibat_kisiler || []
      if (kisiler.length === 0) {
        irtibatData.push({
          'Müşteri ID': m.id,
          'Müşteri Adı': m.ad || '',
          'Ad': '', 'Ünvan': '', 'E-posta': '', 'Telefon': '',
        })
      } else {
        kisiler.forEach(k => {
          irtibatData.push({
            'Müşteri ID': m.id,
            'Müşteri Adı': m.ad || '',
            'Ad': k.ad || '',
            'Ünvan': k.unvan || '',
            'E-posta': k.email || '',
            'Telefon': k.tel || '',
          })
        })
      }
    })

    exportMultiSheet([
      { name: 'Müşteriler', data: genelData },
      { name: 'Sektör & Ürün', data: sektorData },
      { name: 'İrtibat Kişileri', data: irtibatData },
    ], 'musteriler')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Müşteriler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{musteriler.length} müşteri kayıtlı</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            ↓ Excel
          </button>
          <button
            onClick={() => { setSecili(null); setModalAcik(true) }}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            + Yeni Müşteri
          </button>
        </div>
      </div>

      {musteriler.length > 0 && (
        <div className="mb-4">
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Müşteri adı, sektör veya ülke ara..."
            className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : musteriler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">👥</div>
          <div className="text-sm font-medium text-gray-500">Henüz müşteri eklenmedi</div>
          <button
            onClick={() => { setSecili(null); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            + İlk Müşteriyi Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Müşteri</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Sektör / Ürün</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Ülke</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Vade/Limit</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase">Risk</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 uppercase text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800 text-sm">{m.ad}</div>
                    <div className="text-[10px] text-gray-300 font-mono">{m.id}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {m.sektor?.slice(0, 1).map(s => (
                        <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {m.urun_tipleri?.slice(0, 1).map(u => (
                        <span key={u} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{u}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{m.ulke || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    <div className="text-xs">{m.odeme_vadesi_gun ? `${m.odeme_vadesi_gun} Gün` : '—'}</div>
                    <div className="text-[10px] text-gray-400">{m.kredi_limiti_usd ? `$${Number(m.kredi_limiti_usd).toLocaleString()}` : ''}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {m.risk_sinifi ? (
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${RISK_RENK[m.risk_sinifi]}`}>
                        {m.risk_sinifi}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setSecili(m); setModalAcik(true) }}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                      >
                        Düzenle
                      </button>
                      {canDelete(rol) && (
                        <button
                          onClick={() => sil(m.id)}
                          className="text-xs px-2 py-1 rounded border border-red-100 text-red-500 hover:bg-red-50"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAcik && (
        <MusteriModal
          musteri={secili}
          onKaydet={kaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
