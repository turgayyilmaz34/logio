
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { kurlariGetir, kurdanCevir } from '../utils/kurService'

const ASAMALAR = [
  { id: 'hazirlik', label: 'Hazırlık', renk: '#6b7280', bg: 'bg-gray-100' },
  { id: 'gonderildi', label: 'Gönderildi', renk: '#3b82f6', bg: 'bg-blue-100' },
  { id: 'bekleniyor', label: 'Bekleniyor', renk: '#f59e0b', bg: 'bg-amber-100' },
  { id: 'kazanildi', label: 'Kazanıldı', renk: '#10b981', bg: 'bg-green-100' },
  { id: 'kaybedildi', label: 'Kaybedildi', renk: '#ef4444', bg: 'bg-red-100' },
]

export default function IhaleDonusumHunisi() {
  const [ihaleler, setIhaleler] = useState([])
  const [musteriler, setMusteriler] = useState([])
  const [kurlar, setKurlar] = useState(null)
  const [pb, setPb] = useState('USD')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState('hepsi') // hepsi | son_6ay | son_1yil
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [iSnap, mSnap] = await Promise.all([q('ihaleler'), q('musteriler')])
      const kur = await kurlariGetir()
      setKurlar(kur)
      setIhaleler(iSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setMusteriler(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Yükleniyor...</div>

  const musteriAd = id => musteriler.find(m => m.id === id)?.ad || '—'
  const fmtPB = tryVal => `${kurdanCevir(tryVal || 0, 'TRY', pb, kurlar).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${pb}`

  // Dönem filtresi
  const filtreliIhaleler = ihaleler.filter(i => {
    if (filtre === 'hepsi') return true
    const sinir = new Date()
    sinir.setMonth(sinir.getMonth() - (filtre === 'son_6ay' ? 6 : 12))
    return new Date(i.son_basvuru || '2000-01-01') >= sinir
  })

  const kazanilan = filtreliIhaleler.filter(i => i.durum === 'kazanildi')
  const kaybedilen = filtreliIhaleler.filter(i => i.durum === 'kaybedildi')
  const aktif = filtreliIhaleler.filter(i => ['hazirlik', 'gonderildi', 'bekleniyor'].includes(i.durum))

  const kazanmaOrani = (kazanilan.length + kaybedilen.length) > 0
    ? Math.round(kazanilan.length / (kazanilan.length + kaybedilen.length) * 100) : null

  // Pipeline değeri
  const pipelineDegerTRY = aktif.reduce((acc, i) =>
    acc + kurdanCevir(i.tahmini_deger_usd || 0, 'USD', 'TRY', kurlar), 0)

  const kazanilanDegerTRY = kazanilan.reduce((acc, i) =>
    acc + kurdanCevir(i.tahmini_deger_usd || 0, 'USD', 'TRY', kurlar), 0)

  // Huni verisi
  const huniVeri = ASAMALAR.map(a => ({
    ...a,
    sayi: filtreliIhaleler.filter(i => i.durum === a.id).length,
    deger: filtreliIhaleler.filter(i => i.durum === a.id)
      .reduce((acc, i) => acc + kurdanCevir(i.tahmini_deger_usd || 0, 'USD', 'TRY', kurlar), 0)
  }))

  const maxSayi = Math.max(...huniVeri.map(h => h.sayi), 1)

  // Mevcut 3PL analizi
  const rakip3pl = {}
  filtreliIhaleler.forEach(i => {
    if (i.mevcut_3pl) {
      if (!rakip3pl[i.mevcut_3pl]) rakip3pl[i.mevcut_3pl] = { toplam: 0, kazanilan: 0, kaybedilen: 0 }
      rakip3pl[i.mevcut_3pl].toplam++
      if (i.durum === 'kazanildi') rakip3pl[i.mevcut_3pl].kazanilan++
      if (i.durum === 'kaybedildi') rakip3pl[i.mevcut_3pl].kaybedildi++
    }
  })
  const rakipListesi = Object.entries(rakip3pl).sort((a, b) => b[1].toplam - a[1].toplam)

  return (
    <div className="space-y-6">
      {/* Kontroller */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">Dönem:</div>
          {[['hepsi', 'Tümü'], ['son_6ay', 'Son 6 Ay'], ['son_1yil', 'Son 1 Yıl']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltre(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filtre === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">Para Birimi:</div>
          {['TRY', 'USD', 'EUR'].map(p => (
            <button key={p} onClick={() => setPb(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${pb === p ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Özet metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-gray-800">{filtreliIhaleler.length}</div>
          <div className="text-xs text-gray-400 mt-1">Toplam İhale</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className={`text-2xl font-semibold ${kazanmaOrani !== null && kazanmaOrani >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
            {kazanmaOrani !== null ? `%${kazanmaOrani}` : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Kazan Oranı</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-blue-600">{fmtPB(pipelineDegerTRY)}</div>
          <div className="text-xs text-gray-400 mt-1">Aktif Pipeline Değeri</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-green-600">{fmtPB(kazanilanDegerTRY)}</div>
          <div className="text-xs text-gray-400 mt-1">Kazanılan Değer</div>
        </div>
      </div>

      {/* Huni */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-6">Dönüşüm Hunisi</div>
        <div className="space-y-3">
          {huniVeri.map((a, i) => {
            const genislik = Math.max(20, (a.sayi / maxSayi) * 100)
            return (
              <div key={a.id} className="flex items-center gap-4">
                <div className="text-xs text-gray-500 w-20 text-right shrink-0">{a.label}</div>
                <div className="flex-1 relative h-8 flex items-center">
                  <div className="h-8 rounded-lg flex items-center px-3 transition-all"
                    style={{ width: `${genislik}%`, background: a.renk + '33', border: `1px solid ${a.renk}44` }}>
                    <span className="text-xs font-semibold" style={{ color: a.renk }}>
                      {a.sayi} ihale
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 w-28 text-right shrink-0">
                  {a.deger > 0 ? fmtPB(a.deger) : '—'}
                </div>
                {i < huniVeri.length - 2 && huniVeri[i+1].sayi > 0 && a.sayi > 0 && (
                  <div className="text-xs text-gray-300 w-16 text-right shrink-0">
                    %{Math.round(huniVeri[i+1].sayi / a.sayi * 100)} →
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rakip 3PL analizi */}
      {rakipListesi.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Rakip 3PL Analizi</div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2 text-xs text-gray-400">3PL Firması</th>
                <th className="text-right px-5 py-2 text-xs text-gray-400">Karşılaşma</th>
                <th className="text-right px-5 py-2 text-xs text-gray-400">Kazanıldı</th>
                <th className="text-right px-5 py-2 text-xs text-gray-400">Kazan Oranı</th>
              </tr>
            </thead>
            <tbody>
              {rakipListesi.map(([firma, data], i) => {
                const oran = (data.kazanilan + (data.kaybedildi || 0)) > 0
                  ? Math.round(data.kazanilan / (data.kazanilan + (data.kaybedildi || 0)) * 100)
                  : null
                return (
                  <tr key={firma} className={`border-b border-gray-50 hover:bg-gray-50 ${i === rakipListesi.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-5 py-2.5 text-sm font-medium text-gray-800">{firma}</td>
                    <td className="px-5 py-2.5 text-right text-sm text-gray-600">{data.toplam}</td>
                    <td className="px-5 py-2.5 text-right text-sm text-green-600 font-medium">{data.kazanilan}</td>
                    <td className="px-5 py-2.5 text-right">
                      {oran !== null ? (
                        <span className={`text-sm font-semibold ${oran >= 50 ? 'text-green-600' : 'text-red-500'}`}>%{oran}</span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
