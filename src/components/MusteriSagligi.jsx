
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

const RISK_RENK = { A: 'text-green-600 bg-green-50', B: 'text-amber-600 bg-amber-50', C: 'text-red-600 bg-red-50' }

function ChurnBadge({ skor }) {
  if (skor <= 30) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">🔴 Yüksek Risk</span>
  if (skor <= 60) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">🟡 Orta Risk</span>
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600">🟢 Düşük Risk</span>
}

export default function MusteriSagligi() {
  const [veri, setVeri] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sirala, setSirala] = useState('skor_asc')
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [mSnap, sSnap, anSnap, cSnap] = await Promise.all([
        q('musteriler'), q('sozlesmeler'), q('anketler'), q('anket_cevaplari'),
      ])
      const musteriler = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const sozlesmeler = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const anketler = anSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const cevaplar = cSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const musVeri = musteriler.map(m => {
        const mSoz = sozlesmeler.filter(s => s.musteri_id === m.id)
        const aktifSoz = mSoz.filter(s => s.durum === 'aktif')

        // NPS
        const mAnket = anketler.filter(a => a.musteri_id === m.id)
        const mCevap = cevaplar.filter(c => mAnket.some(a => a.id === c.anket_id) && c.nps !== undefined)
        const npsOrt = mCevap.length > 0
          ? mCevap.reduce((a, c) => a + c.nps, 0) / mCevap.length
          : null

        // En yakın sözleşme bitişi
        const enYakinBitis = aktifSoz
          .filter(s => s.bitis)
          .map(s => ({ ...s, kalan: gunKaldi(s.bitis) }))
          .sort((a, b) => a.kalan - b.kalan)[0]

        // Risk skoru (0-100, düşük = kötü)
        let skor = 50 // başlangıç

        // NPS etkisi (-25/+25)
        if (npsOrt !== null) skor += (npsOrt - 5) * 5

        // Sözleşme bitiş etkisi
        if (enYakinBitis) {
          if (enYakinBitis.kalan < 0) skor -= 30
          else if (enYakinBitis.kalan <= 30) skor -= 20
          else if (enYakinBitis.kalan <= 90) skor -= 10
          else if (enYakinBitis.kalan > 365) skor += 10
        } else if (aktifSoz.length === 0) {
          skor -= 20
        }

        // Müşteri risk sınıfı etkisi
        if (m.risk_sinifi === 'A') skor += 10
        else if (m.risk_sinifi === 'C') skor -= 15

        skor = Math.max(0, Math.min(100, Math.round(skor)))

        return {
          musteri: m,
          skor,
          npsOrt,
          enYakinBitis,
          aktifSozSayisi: aktifSoz.length,
          toplamSozSayisi: mSoz.length,
          anketSayisi: mCevap.length,
        }
      })

      setVeri(musVeri)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Hesaplanıyor...</div>

  const sirali = [...veri].sort((a, b) => {
    if (sirala === 'skor_asc') return a.skor - b.skor
    if (sirala === 'skor_desc') return b.skor - a.skor
    if (sirala === 'nps') return (b.npsOrt || 0) - (a.npsOrt || 0)
    return 0
  })

  const yuksekRisk = veri.filter(m => m.skor <= 30).length
  const ortaRisk = veri.filter(m => m.skor > 30 && m.skor <= 60).length
  const dusukRisk = veri.filter(m => m.skor > 60).length

  return (
    <div className="space-y-6">
      {/* Özet */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-red-600">{yuksekRisk}</div>
          <div className="text-xs text-red-500 mt-1">Yüksek Churn Riski</div>
          <div className="text-xs text-red-400">Acil aksiyon gerekiyor</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-amber-600">{ortaRisk}</div>
          <div className="text-xs text-amber-500 mt-1">Orta Risk</div>
          <div className="text-xs text-amber-400">Yakın takip gerekiyor</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-green-600">{dusukRisk}</div>
          <div className="text-xs text-green-500 mt-1">Düşük Risk</div>
          <div className="text-xs text-green-400">Sağlıklı ilişki</div>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-400">Sırala:</div>
        {[['skor_asc', 'Riskli önce'], ['skor_desc', 'Sağlıklı önce'], ['nps', 'NPS']].map(([val, label]) => (
          <button key={val} onClick={() => setSirala(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${sirala === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Müşteri listesi */}
      <div className="space-y-3">
        {sirali.map(mv => (
          <div key={mv.musteri.id} className={`bg-white rounded-xl border p-5 ${mv.skor <= 30 ? 'border-red-200' : mv.skor <= 60 ? 'border-amber-200' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-gray-800">{mv.musteri.ad}</span>
                  <ChurnBadge skor={mv.skor} />
                  {mv.musteri.risk_sinifi && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_RENK[mv.musteri.risk_sinifi] || 'bg-gray-100 text-gray-500'}`}>
                      Risk {mv.musteri.risk_sinifi}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                  <span>{mv.aktifSozSayisi} aktif sözleşme</span>
                  {mv.npsOrt !== null ? (
                    <span className={`font-medium ${mv.npsOrt >= 8 ? 'text-green-600' : mv.npsOrt >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                      NPS {mv.npsOrt.toFixed(1)} ({mv.anketSayisi} yanıt)
                    </span>
                  ) : <span className="text-gray-300">NPS: veri yok</span>}
                  {mv.enYakinBitis && (
                    <span className={mv.enYakinBitis.kalan <= 60 ? 'text-red-600 font-medium' : mv.enYakinBitis.kalan <= 180 ? 'text-amber-600' : 'text-gray-400'}>
                      Bitiş: {mv.enYakinBitis.bitis}
                      {mv.enYakinBitis.kalan < 0 ? ' (süresi geçti!)' : ` (${mv.enYakinBitis.kalan} gün)`}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold" style={{ color: mv.skor <= 30 ? '#ef4444' : mv.skor <= 60 ? '#f59e0b' : '#10b981' }}>
                  {mv.skor}
                </div>
                <div className="text-xs text-gray-400">/ 100</div>
              </div>
            </div>
            {/* Skor bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${mv.skor}%`, background: mv.skor <= 30 ? '#ef4444' : mv.skor <= 60 ? '#f59e0b' : '#10b981' }} />
            </div>
          </div>
        ))}
        {sirali.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">Henüz müşteri kaydı yok.</div>
        )}
      </div>
    </div>
  )
}
