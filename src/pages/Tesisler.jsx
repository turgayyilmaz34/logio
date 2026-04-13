import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import TesisModal from '../components/TesisModal'
import KatlarPanel from '../components/KatlarPanel'

export default function Tesisler() {
  const [tesisler, setTesisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [seciliTesis, setSeciliTesis] = useState(null)
  const [acikTesisId, setAcikTesisId] = useState(null)

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
          {tesisler.map(tesis => (
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
                  <button
                    onClick={() => tesisSil(tesis.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                  >
                    Sil
                  </button>
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
