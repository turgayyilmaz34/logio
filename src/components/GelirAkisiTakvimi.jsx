
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { kurlariGetir, kurdanCevir } from '../utils/kurService'

const AYLAR_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function GelirAkisiTakvimi() {
  const [veri, setVeri] = useState(null)
  const [kurlar, setKurlar] = useState(null)
  const [pb, setPb] = useState('USD')
  const [yukleniyor, setYukleniyor] = useState(true)
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [sSnap, mSnap, kSnap, msSnap] = await Promise.all([
        q('sozlesmeler'), q('musteriler'), q('katlar'), q('mal_sahibi_sozlesmeleri'),
      ])
      const kur = await kurlariGetir()
      setKurlar(kur)

      const sozlesmeler = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const musteriler = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const katlar = kSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const malSahibiSoz = msSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const musteriAd = id => musteriler.find(m => m.id === id)?.ad || '—'

      // Önümüzdeki 12 ay
      const bugun = new Date()
      const aylar = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1)
        return { yil: d.getFullYear(), ay: d.getMonth(), label: `${AYLAR_TR[d.getMonth()]} ${d.getFullYear()}` }
      })

      // Her ay için: aktif sözleşme sayısı, tahmini gelir, biten sözleşmeler, artış olan sözleşmeler
      const aylikVeri = aylar.map(({ yil, ay, label }) => {
        const ayBaslangic = new Date(yil, ay, 1)
        const ayBitis = new Date(yil, ay + 1, 0)

        // Bu ay aktif olan sözleşmeler
        const aktif = sozlesmeler.filter(s => {
          if (!s.baslangic || !s.bitis) return s.durum === 'aktif'
          const bas = new Date(s.baslangic)
          const bit = new Date(s.bitis)
          return bas <= ayBitis && bit >= ayBaslangic
        })

        // Bu ay biten sözleşmeler
        const biten = sozlesmeler.filter(s => {
          if (!s.bitis) return false
          const bit = new Date(s.bitis)
          return bit.getFullYear() === yil && bit.getMonth() === ay
        })

        // Bu ay artış klözü olan sözleşmeler
        const artisli = sozlesmeler.filter(s => {
          if (!s.artis_var || !s.artis_belirli_tarih) return false
          const artis = new Date(s.artis_belirli_tarih)
          return artis.getFullYear() === yil && artis.getMonth() === ay
        })

        // Tahmini aylık gelir
        const gelirTRY = aktif.reduce((acc, s) => {
          if (s.dep_m2_birim_fiyat > 0) {
            const m2 = (s.dep_kat_ids || [])
              .map(kid => katlar.find(k => k.id === kid))
              .filter(Boolean)
              .reduce((a, k) => a + (k.sozlesme_m2 || k.kullanilabilir_m2 || 0), 0)
            return acc + kurdanCevir(s.dep_m2_birim_fiyat * m2, s.para_birimi || 'USD', 'TRY', kur)
          }
          if (s.dep_sabit_baz > 0) return acc + kurdanCevir(s.dep_sabit_baz, s.para_birimi || 'USD', 'TRY', kur)
          return acc
        }, 0)

        return {
          label, yil, ay,
          aktifSayi: aktif.length,
          gelirTRY,
          biten: biten.map(s => ({ ad: s.ad || '—', musteri: musteriAd(s.musteri_id), gelirTRY: 0 })),
          artisli: artisli.map(s => ({ ad: s.ad || '—', musteri: musteriAd(s.musteri_id) })),
        }
      })

      setVeri(aylikVeri)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Hesaplanıyor...</div>
  if (!veri) return null

  const maxGelir = Math.max(...veri.map(a => a.gelirTRY), 1)
  const fmtPB = tryVal => `${kurdanCevir(tryVal || 0, 'TRY', pb, kurlar).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${pb}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-400">Para Birimi:</div>
        {['TRY', 'USD', 'EUR'].map(p => (
          <button key={p} onClick={() => setPb(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${pb === p ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Bar grafik */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">12 Aylık Gelir Projeksiyonu</div>
        <div className="flex items-end gap-2 h-40">
          {veri.map((a, i) => {
            const yukseklik = maxGelir > 0 ? Math.max(4, (a.gelirTRY / maxGelir) * 100) : 4
            const buAy = i === 0
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-500">{a.gelirTRY > 0 ? fmtPB(a.gelirTRY) : ''}</div>
                <div className="w-full relative group">
                  <div
                    className={`w-full rounded-t-lg transition-all ${buAy ? 'bg-blue-600' : a.biten.length > 0 ? 'bg-amber-400' : 'bg-blue-200'}`}
                    style={{ height: `${yukseklik}px` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded-lg p-2 whitespace-nowrap">
                    <div className="font-medium">{a.label}</div>
                    <div>{a.aktifSayi} aktif sözleşme</div>
                    {a.biten.length > 0 && <div className="text-amber-300">{a.biten.length} sözleşme bitiyor!</div>}
                    {a.artisli.length > 0 && <div className="text-green-300">{a.artisli.length} artış klözü</div>}
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-center leading-tight">{AYLAR_TR[a.ay]}</div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded inline-block"></span>Bu ay</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded inline-block"></span>Gelecek aylar</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded inline-block"></span>Sözleşme bitiş riski</span>
        </div>
      </div>

      {/* Detay tablo */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Aylık Detay</div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2 text-xs text-gray-400">Ay</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400">Aktif Sözleşme</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400">Tahmini Gelir</th>
              <th className="text-left px-5 py-2 text-xs text-gray-400">Olaylar</th>
            </tr>
          </thead>
          <tbody>
            {veri.map((a, i) => (
              <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                <td className="px-5 py-2.5 text-sm font-medium text-gray-800">{a.label}</td>
                <td className="px-5 py-2.5 text-right text-sm text-gray-600">{a.aktifSayi}</td>
                <td className="px-5 py-2.5 text-right text-sm font-semibold text-gray-800">{a.gelirTRY > 0 ? fmtPB(a.gelirTRY) : '—'}</td>
                <td className="px-5 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {a.biten.map((s, j) => (
                      <span key={j} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        ⚠ {s.musteri} bitiyor
                      </span>
                    ))}
                    {a.artisli.map((s, j) => (
                      <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        ↑ {s.musteri} artış
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
