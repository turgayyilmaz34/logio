import { useState, useEffect } from 'react'
import { exportMultiSheet } from '../utils/exportExcel'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import ProjeModal from '../components/ProjeModal'

const DURUM_RENK = {
  teklif: 'bg-gray-100 text-gray-600',
  sozlesme: 'bg-blue-50 text-blue-700',
  operasyon: 'bg-green-50 text-green-700',
  tamamlandi: 'bg-teal-50 text-teal-700',
  iptal: 'bg-red-50 text-red-600',
}

const DURUM_LABEL = {
  teklif: 'Teklif', sozlesme: 'Sözleşme', operasyon: 'Operasyon',
  tamamlandi: 'Tamamlandı', iptal: 'İptal'
}

export default function Projeler() {
  const [projeler, setProjeler] = useState([])
  const [sozlesmeler, setSozlesmeler] = useState([])
  const [musteriler, setMusteriler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  const [filtre, setFiltre] = useState('hepsi')
  const [arama, setArama] = useState('')

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const [prjSnap, sozSnap, musSnap] = await Promise.all([
      getDocs(query(collection(db, 'projeler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'sozlesmeler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId))),
    ])
    setProjeler(prjSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSozlesmeler(sozSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMusteriler(musSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const sozlesmeAd = (id) => sozlesmeler.find(s => s.id === id)?.ad || '—'
  const musteriAd = (sozlesmeId) => {
    const soz = sozlesmeler.find(s => s.id === sozlesmeId)
    if (!soz) return '—'
    return musteriler.find(m => m.id === soz.musteri_id)?.ad || '—'
  }

  const kaydet = async (veri) => {
    if (secili) {
      await updateDoc(doc(db, 'projeler', secili.id), veri)
    } else {
      await addDoc(collection(db, 'projeler'), { ...veri, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu projeyi silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'projeler', id))
    yukle()
  }

  const DURUMLAR = ['teklif', 'sozlesme', 'operasyon', 'tamamlandi', 'iptal']

  const filtreli = projeler
    .filter(p => filtre === 'hepsi' || p.durum === filtre)
    .filter(p =>
      p.ad?.toLowerCase().includes(arama.toLowerCase()) ||
      musteriAd(p.sozlesme_id).toLowerCase().includes(arama.toLowerCase())
    )


  const handleExport = async () => {
    const { getDocs, collection, query, where } = await import('firebase/firestore')
    const { db } = await import('../firebase')
    const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

    const [bagSnap, perSnap, katSnap, tesSnap] = await Promise.all([
      getDocs(query(collection(db, 'proje_kat_baginlantilari'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'proje_personel'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'katlar'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))),
    ])
    const baglantilar = bagSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const personeller = perSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const katlar = katSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const tesisler = tesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const katAd = (katId) => {
      const kat = katlar.find(k => k.id === katId)
      const tesis = tesisler.find(t => t.id === kat?.tesis_id)
      return kat ? `${tesis?.ad || ''} / ${kat.kat_adi}` : katId
    }

    // Sekme 1: Projeler genel
    const genelData = projeler.map(p => ({
      'Proje ID': p.id,
      'Proje Adı': p.ad || '',
      'Müşteri': musteriAd(p.sozlesme_id),
      'Sözleşme': sozlesmeAd(p.sozlesme_id),
      'Sözleşmesiz': !p.sozlesme_id ? 'Evet' : 'Hayır',
      'Durum': p.durum || '',
      'İmza Tarihi': p.imza_tarihi || '',
      'Operasyon Başlangıcı': p.operasyon_baslangic || '',
      'Alan Tipleri': (p.alan_tipleri || []).join(', '),
      'BU Kodu': p.bu_kodu || '',
      'Notlar': p.notlar || '',
    }))

    // Sekme 2: Kat Bağlantıları
    const katData = baglantilar.map(b => {
      const proje = projeler.find(p => p.id === b.proje_id)
      return {
        'Proje ID': b.proje_id,
        'Proje Adı': proje?.ad || '',
        'Müşteri': musteriAd(proje?.sozlesme_id),
        'Kat': katAd(b.kat_id),
        'Kullanılan m²': b.kullanilan_m2 || 0,
        'Asmakat m² (Bonus)': b.kullanilan_asmakat_m2 || 0,
        'Başlangıç': b.baslangic || '',
        'Bitiş': b.bitis || '',
      }
    })

    // Sekme 3: Personel Maliyeti
    const perData = personeller.map(p => {
      const proje = projeler.find(pr => pr.id === p.proje_id)
      return {
        'Proje ID': p.proje_id,
        'Proje Adı': proje?.ad || '',
        'Müşteri': musteriAd(proje?.sozlesme_id),
        'Dönem': p.donem || '',
        'Kişi Sayısı': p.kisi_sayisi || 0,
        'Toplam Saat': p.toplam_saat || 0,
        'Maliyet TRY': p.toplam_maliyet_try || 0,
        'Maliyet USD': p.toplam_maliyet_usd || 0,
        'Kur USD/TRY': p.kur || '',
      }
    })

    exportMultiSheet([
      { name: 'Projeler', data: genelData },
      { name: 'Kat Bağlantıları', data: katData },
      { name: 'Personel Maliyeti', data: perData },
    ], 'projeler')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Projeler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projeler.length} proje kayıtlı</p>
        </div>
        <button onClick={() => { setSecili(null); setModalAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          + Yeni Proje
        </button>
        <button onClick={handleExport}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↓ Excel
        </button>
      </div>

      {/* Pipeline görünümü */}
      {projeler.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          {DURUMLAR.map(d => {
            const sayi = projeler.filter(p => p.durum === d).length
            return (
              <div key={d} className={`rounded-lg px-3 py-2 text-center cursor-pointer border transition-colors ${filtre === d ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                onClick={() => setFiltre(filtre === d ? 'hepsi' : d)}>
                <div className={`text-xs font-medium ${DURUM_RENK[d].split(' ')[1]}`}>{DURUM_LABEL[d]}</div>
                <div className="text-xl font-semibold text-gray-700 mt-1">{sayi}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Arama */}
      {projeler.length > 0 && (
        <div className="mb-4 flex gap-3">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Proje adı veya müşteri ara..."
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64" />
          {filtre !== 'hepsi' && (
            <button onClick={() => setFiltre('hepsi')} className="text-xs text-gray-400 hover:text-gray-600">
              Filtreyi temizle ×
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : projeler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">📁</div>
          <div className="text-sm font-medium text-gray-500">Henüz proje eklenmedi</div>
          <button onClick={() => { setSecili(null); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Projeyi Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtreli.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{p.ad || '—'}</span>
                    <code className="text-xs text-gray-300 font-mono">{p.id.slice(0, 8)}…</code>
                    {p.bu_kodu && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">{p.bu_kodu}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{musteriAd(p.sozlesme_id)}</span>
                    {p.sozlesme_id && <span className="text-gray-300">•</span>}
                    <span>{sozlesmeAd(p.sozlesme_id)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-gray-400">
                  {p.imza_tarihi && <span>İmza: <span className="text-gray-600">{p.imza_tarihi}</span></span>}
                  {p.operasyon_baslangic && <span>Operasyon: <span className="text-gray-600">{p.operasyon_baslangic}</span></span>}
                </div>

                {p.alan_tipleri?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {p.alan_tipleri.map(t => (
                      <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DURUM_RENK[p.durum] || 'bg-gray-100 text-gray-600'}`}>
                  {DURUM_LABEL[p.durum] || p.durum}
                </span>
                <button onClick={() => { setSecili(p); setModalAcik(true) }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Düzenle
                </button>
                <button onClick={() => sil(p.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">
                  Sil
                </button>
              </div>
            </div>
          ))}
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Filtreye uyan proje bulunamadı.</div>
          )}
        </div>
      )}

      {modalAcik && (
        <ProjeModal
          proje={secili}
          sozlesmeler={sozlesmeler}
          musteriler={musteriler}
          tenantId={tenantId}
          onKaydet={kaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
