import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import TesisModal from '../components/TesisModal'

export default function Tesisler() {
  const [tesisler, setTesisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState(null)
  
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const q = query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    setTesisler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Tesisler</h1>
        <button
          onClick={() => { setSecili(null); setModalAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          + Yeni Tesis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tesisler.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative group">
            <h3 className="font-semibold text-gray-800">{t.ad}</h3>
            <p className="text-sm text-gray-400 mb-4">{t.sehir} / {t.ilce}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setSecili(t); setModalAcik(true) }}
                className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                Düzenle
              </button>
              <button
                onClick={() => sil(t.id)}
                className="text-xs px-3 py-1.5 border border-red-50 text-red-500 hover:bg-red-50 rounded-lg"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

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
