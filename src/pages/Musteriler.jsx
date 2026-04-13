
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
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

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    const q = query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    setMusteriler(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const kaydet = async (veri) => {
    if (secili) {
      await updateDoc(doc(db, 'musteriler', secili.id), veri)
    } else {
      await addDoc(collection(db, 'musteriler'), { ...veri, tenant_id: tenantId })
    }
    setModalAcik(false)
    yukle()
  }

  const sil = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'musteriler', id))
    yukle()
  }

  const filtreli = musteriler.filter(m =>
    m.ad?.toLowerCase().includes(arama.toLowerCase()) ||
    m.sektor?.join(' ').toLowerCase().includes(arama.toLowerCase()) ||
    m.ulke?.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Müşteriler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{musteriler.length} müşteri kayıtlı</p>
        </div>
        <button
          onClick={() => { setSecili(null); setModalAcik(true) }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          + Yeni Müşteri
        </button>
      </div>

      {/* Arama */}
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Sektör / Ürün</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ülke</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ödeme Vadesi</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Kredi Limiti</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Risk</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((m, i) => (
                <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === filtreli.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800 text-sm">{m.ad}</div>
                    <code className="text-xs text-gray-300 font-mono">{m.id.slice(0, 8)}…</code>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {m.sektor?.slice(0, 2).map(s => (
                        <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {m.urun_tipleri?.slice(0, 2).map(u => (
                        <span key={u} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{u}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{m.ulke || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {m.odeme_vadesi_gun ? `${m.odeme_vadesi_gun} gün` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {m.kredi_limiti_usd ? `$${Number(m.kredi_limiti_usd).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {m.risk_sinifi ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RISK_RENK[m.risk_sinifi] || ''}`}>
                        {m.risk_sinifi}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setSecili(m); setModalAcik(true) }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => sil(m.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Arama sonucu bulunamadı.</div>
          )}
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
