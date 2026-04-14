import { useState, useEffect } from 'react'
import { exportMultiSheet } from '../utils/exportExcel'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useRole, canDelete } from '../hooks/useRole'
import TesisModal from '../components/TesisModal'
import KatlarPanel from '../components/KatlarPanel'

export default function Tesisler() {
  const [tesisler, setTesisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [seciliTesis, setSeciliTesis] = useState(null)
  const [acikTesisId, setAcikTesisId] = useState(null)
  const [arama, setArama] = useState('')

const { rol } = useRole()
    const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const q = query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    setTesisler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const tesisEkle = () => { setSeciliTesis(null); setModalAcik(true) }
  const tesisDuzenle = (tesis) => { setSeciliTesis(tesis); setModalAcik(true) }

  const tesisSil = async (id) => {
    if (!window.confirm('Bu tesisi silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'tesisler', id))
    yukle()
  }

  const modalKaydet = async (veri) => {
    if (seciliTesis) {
      await updateDoc(doc(db, 'tesisler', seciliTesis.id), veri)
    } else {
      await addDoc(collection(db, 'tesisler'), { ...veri, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const turRenk = (tur) => tur === 'mulk'
    ? 'bg-green-50 text-green-700'
    : 'bg-blue-50 text-blue-700'


  const handleExport = async () => {
    const { getDocs, collection, query, where } = await import('firebase/firestore')
    const { db } = await import('../firebase')
    const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

    const katSnap = await getDocs(query(collection(db, 'katlar'), where('tenant_id', '==', tenantId)))
    const katlar = katSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Sekme 1: Tesisler genel
    const tesislerData = tesisler.map(t => ({
      'Tesis ID': t.id,
      'Tesis Adı': t.ad || '',
      'Şehir': t.sehir || '',
      'Adres': t.adres || '',
      'Tür': t.tur === 'mulk' ? 'Mülk' : 'Kiralık',
      'Tesis Tipi Primary': t.tesis_tipi_primary || '',
      'Tesis Tipi Secondary': (t.tesis_tipi_secondary || []).join(', '),
      'TUR Kodu': t.tur_kodu || '',
      'OSB İçi': t.osb_ici ? 'Evet' : 'Hayır',
    }))

    // Sekme 2: Katlar
    const katlarData = katlar.map(k => {
      const tesis = tesisler.find(t => t.id === k.tesis_id)
      return {
        'Tesis ID': k.tesis_id || '',
        'Tesis Adı': tesis?.ad || '',
        'Kat Adı': k.kat_adi || '',
        'TUR Kodu': k.tur_kodu || '',
        'Sözleşme m²': k.sozlesme_m2 || 0,
        'Kullanılabilir m²': k.kullanilabilir_m2 || 0,
        'Tavan Yüksekliği (m)': k.tavan_yuksekligi || '',
        'Alan Tipleri': (k.alan_tipleri || []).join(', '),
        'Asmakat': k.asmakat_var ? 'Evet' : 'Hayır',
        'Asmakat m²': k.asmakat_var ? (k.asmakat_m2 || 0) : '',
        'Asmakat Açıklama': k.asmakat_aciklama || '',
      }
    })

    // Sekme 3: Rol & Etiketler
    const rolData = tesisler.map(t => ({
      'Tesis ID': t.id,
      'Tesis Adı': t.ad || '',
      'Operatör Rolü Primary': t.operator_rolu_primary || '',
      'Operatör Rolü Secondary': (t.operator_rolu_secondary || []).join(', '),
      'Operasyon Etiketleri': (t.operasyon_etiketler || []).join(', '),
      'Ruhsat Kimin Adına': t.belge_sahipligi?.ruhsat_kimin || '',
      'ÇED Proje Sahibi': t.belge_sahipligi?.ced_proje_sahibi || '',
      'İtfaiye Başvurusu': t.belge_sahipligi?.itfaiye_basvuru || '',
      'Notlar': t.notlar || '',
    }))

    // Sekme 4: RACI & Uyum
    const raciData = tesisler.map(t => ({
      'Tesis ID': t.id,
      'Tesis Adı': t.ad || '',
      'Ruhsat Seviye': t.ruhsat?.seviye ?? '',
      'Ruhsat Geçerlilik': t.ruhsat?.gecerlilik_tarihi || '',
      'Ruhsat Belge': t.ruhsat?.belge_link || (t.ruhsat?.belge_base64 ? 'Yüklü' : ''),
      'ÇED Seviye': t.ced?.seviye ?? '',
      'ÇED Onay Tarihi': t.ced?.onay_tarihi || '',
      'ÇED Belge': t.ced?.belge_link || (t.ced?.belge_base64 ? 'Yüklü' : ''),
      'İtfaiye Seviye': t.itfaiye?.seviye ?? '',
      'İtfaiye Geçerlilik': t.itfaiye?.gecerlilik_tarihi || '',
      'RACI Ruhsat R': (t.raci?.ruhsat?.R || []).join(', '),
      'RACI Ruhsat A': (t.raci?.ruhsat?.A || []).join(', '),
      'RACI Ruhsat C': (t.raci?.ruhsat?.C || []).join(', '),
      'RACI Ruhsat I': (t.raci?.ruhsat?.I || []).join(', '),
      'RACI İtfaiye R': (t.raci?.itfaiye?.R || []).join(', '),
      'RACI İtfaiye A': (t.raci?.itfaiye?.A || []).join(', '),
      'RACI ÇED R': (t.raci?.ced?.R || []).join(', '),
      'RACI ÇED A': (t.raci?.ced?.A || []).join(', '),
      'Sözleşme Linki': t.kanit?.sozlesme_link || '',
      'Ruhsat Linki': t.kanit?.ruhsat_link || '',
      'İtfaiye Linki': t.kanit?.itfaiye_link || '',
      'ÇED Linki': t.kanit?.ced_link || '',
    }))

    exportMultiSheet([
      { name: 'Tesisler', data: tesislerData },
      { name: 'Katlar', data: katlarData },
      { name: 'Rol & Etiketler', data: rolData },
      { name: 'RACI & Uyum', data: raciData },
    ], 'tesisler')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Tesisler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tesisler.length} tesis tanımlı</p>
        </div>
        <button
          onClick={tesisEkle}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          + Yeni Tesis
        </button>
        <div className="flex items-center gap-3">
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Tesis adı, şehir, TUR kodu..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-56"
          />
          <button onClick={handleExport}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            ↓ Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : tesisler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">🏭</div>
          <div className="text-sm font-medium text-gray-500">Henüz tesis tanımlı değil</div>
          <div className="text-xs text-gray-400 mt-1">Başlamak için yeni tesis ekleyin</div>
          <button onClick={tesisEkle} className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + İlk Tesisi Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tesisler.filter(t =>
            !arama ||
            t.ad?.toLowerCase().includes(arama.toLowerCase()) ||
            t.sehir?.toLowerCase().includes(arama.toLowerCase()) ||
            t.tur_kodu?.toLowerCase().includes(arama.toLowerCase()) ||
            t.tesis_tipi_primary?.toLowerCase().includes(arama.toLowerCase())
          ).map(tesis => (
            <div key={tesis.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{tesis.ad}</span>
                      <code className="text-xs text-gray-300 font-mono">{tesis.id.slice(0, 8)}…</code>
                    {tesis.tur_kodu && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{tesis.tur_kodu}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tesis.sehir}{tesis.adres ? ` — ${tesis.adres}` : ''}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${turRenk(tesis.tur)}`}>
                    {tesis.tur === 'mulk' ? 'Mülk' : 'Kiralık'}
                  </span>
                  {tesis.tesis_tipi && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 font-medium">
                      {tesis.tesis_tipi}
                    </span>
                  )}
                  {tesis.operator_rolu && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                      {tesis.operator_rolu}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAcikTesisId(acikTesisId === tesis.id ? null : tesis.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {acikTesisId === tesis.id ? 'Katları Gizle' : 'Katlar'}
                  </button>
                  <button
                    onClick={() => tesisDuzenle(tesis)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Düzenle
                  </button>
                  {canDelete(rol) && (
                  <button
                    onClick={() => tesisSil(tesis.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                  >
                    Sil
                  </button>
                  )}
                </div>
              </div>

              {acikTesisId === tesis.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <KatlarPanel tesisId={tesis.id} tenantId={tenantId} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAcik && (
        <TesisModal
          tesis={seciliTesis}
          onKaydet={modalKaydet}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  )
}
