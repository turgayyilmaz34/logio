import { useState, useEffect } from 'react'
import { exportMultiSheet } from '../utils/exportExcel'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete, canSeeMali } from '../hooks/useRole'
import { auditLog } from '../utils/auditLog'
import SozlesmeModal from '../components/SozlesmeModal'

const TIP_RENK = {
  depolama: 'bg-blue-50 text-blue-700',
  transport: 'bg-green-50 text-green-700',
  vas: 'bg-purple-50 text-purple-700',
  karma: 'bg-amber-50 text-amber-700',
}

const TIP_LABEL = {
  depolama: 'Depolama',
  transport: 'Transport',
  vas: 'VAS',
  karma: 'Karma',
}

const DURUM_RENK = {
  teklif: 'bg-gray-100 text-gray-600',
  aktif: 'bg-green-50 text-green-700',
  bitti: 'bg-red-50 text-red-600',
  iptal: 'bg-red-100 text-red-700',
}

function gunKaldi(bitis) {
  if (!bitis) return null
  return Math.ceil((new Date(bitis) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Sozlesmeler() {
const { rol } = useRole()
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
    const [sozSnap, musSnap] = await Promise.all([
      getDocs(query(collection(db, 'sozlesmeler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId)))
    ])
    setSozlesmeler(sozSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMusteriler(musSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const musteriAd = (id) => musteriler.find(m => m.id === id)?.ad || '—'

  const kaydet = async (veri) => {
    if (secili) {
      await updateDoc(doc(db, 'sozlesmeler', secili.id), veri)
      await auditLog({ modul: 'sozlesmeler', islem: 'guncelle', kayitId: secili.id, kayitAd: veri.ad || veri.id })
    } else {
      const ref = await addDoc(collection(db, 'sozlesmeler'), { ...veri, tenant_id: tenantId })
      await auditLog({ modul: 'sozlesmeler', islem: 'ekle', kayitId: ref.id, kayitAd: veri.ad })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return
    const _rec = sozlesmeler.find(x => x.id === id)
    await deleteDoc(doc(db, 'sozlesmeler', id))
    await auditLog({ modul: 'sozlesmeler', islem: 'sil', kayitId: id, kayitAd: _rec?.ad })
    yukle()
  }

  const filtreli = sozlesmeler
    .filter(s => filtre === 'hepsi' || s.tip === filtre)
    .filter(s =>
      musteriAd(s.musteri_id).toLowerCase().includes(arama.toLowerCase()) ||
      s.ad?.toLowerCase().includes(arama.toLowerCase())
    )
    .sort((a, b) => a.bitis?.localeCompare(b.bitis || '') || 0)


  const handleExport = () => {
    // Sekme 1: Genel
    const genelData = sozlesmeler.map(s => ({
      'Sözleşme ID': s.id,
      'Sözleşme Adı': s.ad || '',
      'Müşteri': musteriAd(s.musteri_id),
      'Tip': s.tip || '',
      'Durum': s.durum || '',
      'Başlangıç': s.baslangic || '',
      'Bitiş': s.bitis || '',
      'Para Birimi': s.para_birimi || '',
      'Sözleşme Yapısı': s.sozlesme_tipi || '',
      'Yenileme Uyarı (gün)': s.yenileme_uyari_gun || '',
      'Notlar': s.notlar || '',
    }))

    // Sekme 2: Depolama Detay
    const depoData = sozlesmeler.filter(s => s.tip === 'depolama' || s.tip === 'karma').map(s => ({
      'Sözleşme ID': s.id,
      'Sözleşme Adı': s.ad || '',
      'Müşteri': musteriAd(s.musteri_id),
      'Fiyatlandırma Modu': s.dep_fiyatlandirma_modu || '',
      'Sabit Baz Tutar': s.dep_sabit_baz || '',
      'm² Birim Fiyat': s.dep_m2_birim_fiyat || '',
      'Asmakat Müşteri Fiyatı': s.dep_asmakat_musteri_fiyat || '',
      'Asmakat Maliyet': s.dep_asmakat_maliyet_fiyat || '',
      'Tavan Katsayısı Eşiği': s.dep_tavan_katsayisi_esigi || '',
      'Tavan Katsayısı Oranı': s.dep_tavan_katsayisi_orani || '',
    }))

    // Sekme 3: Transport Detay
    const traData = []
    sozlesmeler.filter(s => s.tip === 'transport' || s.tip === 'karma').forEach(s => {
      const kalemler = s.tra_kalemler || []
      if (kalemler.length === 0) {
        traData.push({
          'Sözleşme ID': s.id,
          'Sözleşme Adı': s.ad || '',
          'Müşteri': musteriAd(s.musteri_id),
          'Araç Sayısı': s.tra_arac_sayisi || '',
          'Sürücü Sayısı': s.tra_surucu_sayisi || '',
          'Kalem Tipi': '', 'Açıklama': '',
          'Maliyet Fiyat': '', 'Maliyet PB': '',
          'Müşteri Fiyat': '', 'Müşteri PB': '',
        })
      } else {
        kalemler.forEach(k => {
          traData.push({
            'Sözleşme ID': s.id,
            'Sözleşme Adı': s.ad || '',
            'Müşteri': musteriAd(s.musteri_id),
            'Araç Sayısı': s.tra_arac_sayisi || '',
            'Sürücü Sayısı': s.tra_surucu_sayisi || '',
            'Kalem Tipi': k.tip || '',
            'Açıklama': k.aciklama || '',
            'Maliyet Fiyat': k.maliyet_fiyat || '',
            'Maliyet PB': k.maliyet_pb || '',
            'Müşteri Fiyat': k.musteri_fiyat || '',
            'Müşteri PB': k.musteri_pb || '',
          })
        })
      }
    })

    // Sekme 4: VAS Detay
    const vasData = []
    sozlesmeler.filter(s => s.tip === 'vas' || s.tip === 'karma').forEach(s => {
      const kalemler = s.vas_kalemler || []
      if (kalemler.length === 0) {
        vasData.push({
          'Sözleşme ID': s.id, 'Sözleşme Adı': s.ad || '',
          'Müşteri': musteriAd(s.musteri_id),
          'Depolama Ücreti': s.vas_depolama_ucreti ? 'Evet' : 'Hayır',
          'Kalem Tipi': '', 'Açıklama': '',
          'Maliyet Fiyat': '', 'Maliyet PB': '',
          'Müşteri Fiyat': '', 'Müşteri PB': '',
        })
      } else {
        kalemler.forEach(k => {
          vasData.push({
            'Sözleşme ID': s.id, 'Sözleşme Adı': s.ad || '',
            'Müşteri': musteriAd(s.musteri_id),
            'Depolama Ücreti': s.vas_depolama_ucreti ? 'Evet' : 'Hayır',
            'Kalem Tipi': k.tip || '', 'Açıklama': k.aciklama || '',
            'Maliyet Fiyat': k.maliyet_fiyat || '', 'Maliyet PB': k.maliyet_pb || '',
            'Müşteri Fiyat': k.musteri_fiyat || '', 'Müşteri PB': k.musteri_pb || '',
          })
        })
      }
    })

    // Sekme 5: Artış & Ürün
    const artisData = sozlesmeler.map(s => ({
      'Sözleşme ID': s.id,
      'Sözleşme Adı': s.ad || '',
      'Müşteri': musteriAd(s.musteri_id),
      'Artış Var': s.artis_var ? 'Evet' : 'Hayır',
      'Artış Tipi': s.artis_tipi || '',
      'Zamanlama': s.artis_zamanlama || '',
      'Artış Tarihi': s.artis_belirli_tarih || '',
      'Özel Formül': s.artis_ozel_formul || '',
      'Ürün Tipleri': (s.urun_tipleri || []).join(', '),
    }))

    exportMultiSheet([
      { name: 'Sözleşmeler', data: genelData },
      { name: 'Depolama', data: depoData },
      { name: 'Transport', data: traData },
      { name: 'VAS', data: vasData },
      { name: 'Artış & Ürün', data: artisData },
    ], 'sozlesmeler')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Sözleşmeler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sozlesmeler.length} sözleşme kayıtlı</p>
        </div>
        <button
          onClick={() => { setSecili(null); setModalAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          + Yeni Sözleşme
        </button>
        <button onClick={handleExport}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↓ Excel
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['hepsi', 'Hepsi'], ['depolama', 'Depolama'], ['transport', 'Transport'], ['vas', 'VAS'], ['karma', 'Karma']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filtre === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Müşteri veya sözleşme ara..."
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64" />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : sozlesmeler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">📋</div>
          <div className="text-sm font-medium text-gray-500">Henüz sözleşme eklenmedi</div>
          <button onClick={() => { setSecili(null); setModalAcik(true) }}
            className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Sözleşmeyi Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Sözleşme</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Tip</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Dönem</th>
                {canSeeMali(rol) && <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Para Birimi</th>}
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Durum</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((s, i) => {
                const kalan = gunKaldi(s.bitis)
                return (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === filtreli.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-800 text-sm">{s.ad || '—'}</div>
                      <code className="text-xs text-gray-300 font-mono">{s.id.slice(0, 8)}…</code>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{musteriAd(s.musteri_id)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TIP_RENK[s.tip] || 'bg-gray-50 text-gray-600'}`}>
                        {TIP_LABEL[s.tip] || s.tip}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-gray-600">{s.baslangic} → {s.bitis}</div>
                      {kalan !== null && kalan <= 90 && (
                        <div className={`text-xs mt-0.5 ${kalan < 0 ? 'text-red-600' : kalan <= 30 ? 'text-red-500' : 'text-amber-600'}`}>
                          {kalan < 0 ? `${Math.abs(kalan)} gün önce bitti!` : `${kalan} gün kaldı`}
                        </div>
                      )}
                    </td>
                    {canSeeMali(rol) && <td className="px-5 py-3.5 text-sm text-gray-600">{s.para_birimi || '—'}</td>}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DURUM_RENK[s.durum] || 'bg-gray-100 text-gray-600'}`}>
                        {s.durum === 'teklif' ? 'Teklif' : s.durum === 'aktif' ? 'Aktif' : s.durum === 'bitti' ? 'Bitti' : 'İptal'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setSecili(s); setModalAcik(true) }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                          Düzenle
                        </button>
                        {canDelete(rol) && (
              <button onClick={() => sil(s.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">
                          Sil
                        </button>
              )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Filtreye uyan sözleşme bulunamadı.</div>
          )}
        </div>
      )}

      {modalAcik && (
        <SozlesmeModal
          sozlesme={secili}
          musteriler={musteriler}
          tenantId={tenantId}
          onKaydet={kaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
