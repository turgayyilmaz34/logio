import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { kurlariGetir, kurdanCevir } from '../utils/kurService'

const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

function FirsatInput({ value, onChange, pb }) {
  const [edit, setEdit] = useState(false)
  const [temp, setTemp] = useState(value || '')
  if (edit) return (
    <div className="flex items-center gap-1">
      <input type="number" step="0.01" value={temp}
        onChange={e => setTemp(e.target.value)}
        className="w-20 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none"
        autoFocus
        onBlur={() => { onChange(Number(temp) || null); setEdit(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(Number(temp) || null); setEdit(false) } if (e.key === 'Escape') setEdit(false) }}
      />
      <span className="text-xs text-gray-400">{pb}/m²</span>
    </div>
  )
  return (
    <span onClick={() => { setTemp(value || ''); setEdit(true) }}
      className="cursor-pointer text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
      title="Doldurulursa ne kazan kazanırsın? m² başına hedef gelir gir.">
      {value ? `${value} ${pb}/m²` : '+ Hedef gelir'}
    </span>
  )
}

export default function WhiteSpaceRaporu() {
  const [veri, setVeri] = useState(null)
  const [kurlar, setKurlar] = useState(null)
  const [pb, setPb] = useState('USD')
  const [firsatFiyatlar, setFirsatFiyatlar] = useState({}) // { tesisId: fiyat }
  const [yenilemeOlasiliklari, setYenilemeOlasiliklari] = useState({}) // { sozlesmeId: oran }
  const [acikPotansiyel, setAcikPotansiyel] = useState({})
  const [yukleniyor, setYukleniyor] = useState(true)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [tSnap, kSnap, msSnap, prSnap, pbSnap, sozSnap, mSnap] = await Promise.all([
        q('tesisler'), q('katlar'), q('mal_sahibi_sozlesmeleri'),
        q('projeler'), q('proje_kat_baginlantilari'),
        q('sozlesmeler'), q('musteriler'),
      ])

      const tesisler = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const katlar = kSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const malSahibiSoz = msSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const projeler = prSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const baglantilar = pbSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const sozlesmeler = sozSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const musteriler = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const kur = await kurlariGetir()
      setKurlar(kur)

      const aktifProjeler = projeler.filter(p => ['operasyon', 'sozlesme'].includes(p.durum))
      const aktifIds = new Set(aktifProjeler.map(p => p.id))

      // Tesis bazında hesapla
      const tesisVerisi = tesisler.map(t => {
        const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
        const toplamKulM2 = tesisKatlari.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
        const toplamSozM2 = tesisKatlari.reduce((acc, k) => acc + (k.sozlesme_m2 || 0), 0)

        // Aktif proje kullanımı
        const katIdSet = new Set(tesisKatlari.map(k => k.id))
        const kullanilanM2 = baglantilar
          .filter(b => aktifIds.has(b.proje_id) && katIdSet.has(b.kat_id))
          .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)

        const bosM2 = Math.max(0, toplamKulM2 - kullanilanM2)
        const doluYuzde = toplamKulM2 > 0 ? Math.round(kullanilanM2 / toplamKulM2 * 100) : 0

        // Mal sahibi m² maliyeti
        let aylikMalSahibiKiraTRY = 0
        tesisKatlari.forEach(k => {
          const katSoz = malSahibiSoz
            .filter(ms => ms.kat_id === k.id)
            .sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''))[0]
          if (!katSoz) return
          let aylikTRY = 0
          if (katSoz.m2_birim_fiyat > 0) {
            aylikTRY = kurdanCevir(katSoz.m2_birim_fiyat * (k.sozlesme_m2 || 0), katSoz.para_birimi || 'TRY', 'TRY', kur)
          } else if (katSoz.sabit_tutar > 0) {
            aylikTRY = kurdanCevir(katSoz.sabit_tutar, katSoz.para_birimi || 'TRY', 'TRY', kur)
          }
          aylikMalSahibiKiraTRY += aylikTRY
        })

        // Boş alan maliyeti
        const toplamM2Ref = toplamSozM2 || toplamKulM2
        const m2MaliyetTRY = toplamM2Ref > 0 ? aylikMalSahibiKiraTRY / toplamM2Ref : 0
        const bosAlanMaliyetTRY = m2MaliyetTRY * bosM2

        // 180 gün içinde biten sözleşmeler — potansiyel boşalacak
        const potansiyel = []
        sozlesmeler
          .filter(s => s.durum === 'aktif' && s.bitis)
          .forEach(s => {
            const kalan = gunKaldi(s.bitis)
            if (kalan === null || kalan > 180) return

            // Bu sözleşmeye bağlı projeler hangi katlarda?
            const sozProjeleri = projeler.filter(p => p.sozlesme_id === s.id && aktifIds.has(p.id))
            let sozM2 = 0
            sozProjeleri.forEach(p => {
              baglantilar
                .filter(b => b.proje_id === p.id && katIdSet.has(b.kat_id))
                .forEach(b => { sozM2 += b.kullanilan_m2 || 0 })
            })

            if (sozM2 === 0) return

            const musteri = musteriler.find(m => m.id === s.musteri_id)
            const potMaliyetTRY = m2MaliyetTRY * sozM2

            potansiyel.push({
              sozId: s.id,
              sozAd: s.ad || s.id.slice(0, 8),
              musteriAd: musteri?.ad || '—',
              m2: sozM2,
              kalan,
              bitis: s.bitis,
              maliyetTRY: potMaliyetTRY,
            })
          })

        return {
          tesis: t,
          toplamKulM2, toplamSozM2, kullanilanM2, bosM2, doluYuzde,
          aylikMalSahibiKiraTRY, m2MaliyetTRY, bosAlanMaliyetTRY,
          potansiyel,
        }
      }).filter(t => t.toplamKulM2 > 0)

      setVeri(tesisVerisi)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Yükleniyor...</div>
  if (!veri || veri.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div className="text-gray-300 text-4xl mb-3">📐</div>
      <div className="text-sm text-gray-400">White space analizi için tesis, kat ve mal sahibi sözleşmesi gerekiyor.</div>
    </div>
  )

  const fmt = (n) => n?.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) || '0'
  const fmtPB = (tryVal) => kurdanCevir(tryVal || 0, 'TRY', pb, kurlar)
  const fmtPBStr = (tryVal) => `${fmtPB(tryVal).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${pb}`

  // Portföy toplamları
  const toplamBosM2 = veri.reduce((acc, t) => acc + t.bosM2, 0)
  const toplamBosMaliyet = veri.reduce((acc, t) => acc + t.bosAlanMaliyetTRY, 0)
  const toplamPotM2 = veri.reduce((acc, t) => acc + t.potansiyel.reduce((a, p) => a + p.m2, 0), 0)
  const toplamPotMaliyet = veri.reduce((acc, t) => acc + t.potansiyel.reduce((a, p) => a + p.maliyetTRY, 0), 0)

  return (
    <div className="space-y-6">
      {/* Para birimi seçici */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-xs text-gray-400 mb-1">Para Birimi</div>
          <div className="flex gap-1">
            {PARA_BIRIMLERI.map(p => (
              <button key={p} onClick={() => setPb(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${pb === p ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {kurlar && (
          <div className="text-xs text-gray-400">
            USD/TRY: <span className="font-medium text-gray-600">{kurlar.USD_TRY?.toFixed(2)}</span>
            {' · '}EUR/TRY: <span className="font-medium text-gray-600">{kurlar.EUR_TRY?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <div className="text-xs text-red-400 uppercase tracking-wide mb-2">Şu An Boş Alan</div>
          <div className="text-2xl font-semibold text-red-600">{fmt(toplamBosM2)} m²</div>
          <div className="text-xs text-red-400 mt-1">Aktif projesiz alan</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <div className="text-xs text-red-400 uppercase tracking-wide mb-2">Aylık Boş Maliyet</div>
          <div className="text-2xl font-semibold text-red-600">{fmtPBStr(toplamBosMaliyet)}</div>
          <div className="text-xs text-red-400 mt-1">Yıllık: {fmtPBStr(toplamBosMaliyet * 12)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
          <div className="text-xs text-amber-500 uppercase tracking-wide mb-2">180 Gün Potansiyel</div>
          <div className="text-2xl font-semibold text-amber-600">{fmt(toplamPotM2)} m²</div>
          <div className="text-xs text-amber-400 mt-1">Sözleşmesi bitecek alan</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
          <div className="text-xs text-amber-500 uppercase tracking-wide mb-2">Potansiyel Maliyet</div>
          <div className="text-2xl font-semibold text-amber-600">{fmtPBStr(toplamPotMaliyet)}</div>
          <div className="text-xs text-amber-400 mt-1">Yenilemezse aylık kayıp</div>
        </div>
      </div>

      {/* Tesis bazında detay */}
      <div className="space-y-4">
        {veri.filter(t => t.bosM2 > 0 || t.potansiyel.length > 0).map(t => {
          const firsatFiyat = firsatFiyatlar[t.tesis.id]
          const aylikFirsat = firsatFiyat ? kurdanCevir(firsatFiyat, pb, 'TRY', kurlar) * t.bosM2 : null
          const yillikFirsat = aylikFirsat ? aylikFirsat * 12 : null
          const net = aylikFirsat ? aylikFirsat - t.bosAlanMaliyetTRY : null

          return (
            <div key={t.tesis.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Tesis başlık */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-medium text-gray-800">{t.tesis.ad}</div>
                    <div className="text-xs text-gray-400">{t.tesis.sehir} · {fmt(t.toplamKulM2)} m² toplam · %{t.doluYuzde} dolu</div>
                    {t.aylikMalSahibiKiraTRY === 0 && t.bosM2 > 0 && (
                      <div className="text-xs text-amber-600 mt-0.5">⚠️ Mal sahibi sözleşmesi girilmemiş — maliyet hesaplanamıyor</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Boş Alan</div>
                      <div className="text-lg font-semibold text-red-600">{fmt(t.bosM2)} m²</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Aylık Maliyet</div>
                      <div className="text-lg font-semibold text-red-600">{fmtPBStr(t.bosAlanMaliyetTRY)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Yıllık Projeksiyon</div>
                      <div className="text-sm font-semibold text-red-500">{fmtPBStr(t.bosAlanMaliyetTRY * 12)}</div>
                    </div>
                  </div>
                </div>

                {/* Doluluk bar */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${t.doluYuzde >= 80 ? 'bg-green-500' : t.doluYuzde >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                        style={{ width: `${t.doluYuzde}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">%{t.doluYuzde}</span>
                  </div>
                </div>
              </div>

              {/* Fırsat analizi */}
              {t.bosM2 > 0 && (
                <div className="px-5 py-3 bg-blue-50/50 border-b border-gray-100">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <span className="text-xs text-gray-500">Hedef gelir fiyatı: </span>
                      <FirsatInput
                        value={firsatFiyat}
                        onChange={v => setFirsatFiyatlar(prev => ({ ...prev, [t.tesis.id]: v }))}
                        pb={pb}
                      />
                    </div>
                    {aylikFirsat !== null && (
                      <>
                        <div className="text-xs text-gray-500">
                          Aylık gelir: <span className="font-medium text-green-600">{fmtPBStr(aylikFirsat)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Yıllık gelir: <span className="font-medium text-green-600">{fmtPBStr(yillikFirsat)}</span>
                        </div>
                        <div className={`text-xs font-medium ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Net/ay: {net >= 0 ? '+' : ''}{fmtPBStr(net)}
                          {net < 0 && ' (fiyat maliyetin altında!)'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Potansiyel boşalacak alan */}
              {t.potansiyel.length > 0 && (
                <div className="px-5 py-3">
                  <button
                    onClick={() => setAcikPotansiyel(p => ({ ...p, [t.tesis.id]: !p[t.tesis.id] }))}
                    className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">
                    {acikPotansiyel[t.tesis.id] ? '▼' : '▶'}
                    {t.potansiyel.length} sözleşme 180 gün içinde bitiyor
                    ({fmt(t.potansiyel.reduce((a, p) => a + p.m2, 0))} m² potansiyel boşalacak)
                  </button>

                  {acikPotansiyel[t.tesis.id] && (
                    <div className="mt-3 space-y-2">
                      {t.potansiyel.map(pot => {
                        const oran = yenilemeOlasiliklari[pot.sozId] ?? 70
                        const yenilenmezM2 = pot.m2 * (1 - oran / 100)
                        const yenilenmezMaliyet = t.m2MaliyetTRY * yenilenmezM2

                        return (
                          <div key={pot.sozId} className="bg-amber-50 rounded-lg px-4 py-3">
                            <div className="flex items-start justify-between flex-wrap gap-3">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{pot.musteriAd}</div>
                                <div className="text-xs text-gray-500">{pot.sozAd}</div>
                                <div className={`text-xs font-medium mt-0.5 ${pot.kalan <= 30 ? 'text-red-600' : pot.kalan <= 60 ? 'text-amber-600' : 'text-gray-500'}`}>
                                  Bitiş: {pot.bitis} ({pot.kalan} gün kaldı)
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">{fmt(pot.m2)} m² · {fmtPBStr(pot.maliyetTRY)}/ay maliyet</div>
                              </div>
                            </div>

                            {/* Yenileme olasılığı slider */}
                            <div className="mt-3 flex items-center gap-3">
                              <span className="text-xs text-gray-500 whitespace-nowrap">Yenileme olasılığı:</span>
                              <input type="range" min="0" max="100" step="10"
                                value={oran}
                                onChange={e => setYenilemeOlasiliklari(p => ({ ...p, [pot.sozId]: Number(e.target.value) }))}
                                className="flex-1 h-1.5 accent-blue-600" />
                              <span className="text-xs font-medium text-blue-600 w-8">%{oran}</span>
                              {oran < 100 && (
                                <span className="text-xs text-amber-700">
                                  ≈ {fmt(yenilenmezM2)} m² boşalabilir → {fmtPBStr(yenilenmezMaliyet)}/ay maliyet
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mal sahibi sözleşmesi eksik tesisler uyarısı */}
      {veri.filter(t => t.bosM2 > 0 && t.aylikMalSahibiKiraTRY === 0).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="text-xs font-medium text-amber-700">
            ⚠️ Aşağıdaki tesisler için mal sahibi sözleşmesi girilmemiş — white space maliyeti eksik hesaplanıyor:{' '}
            {veri.filter(t => t.bosM2 > 0 && t.aylikMalSahibiKiraTRY === 0).map(t => t.tesis.ad).join(', ')}
          </div>
        </div>
      )}

      {/* Boş alanı olmayan tesisler özet */}
      {veri.filter(t => t.bosM2 === 0 && t.potansiyel.length === 0).length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3">
          <div className="text-xs font-medium text-green-700">
            ✓ Boş alanı olmayan tesisler:{' '}
            {veri.filter(t => t.bosM2 === 0 && t.potansiyel.length === 0).map(t => t.tesis.ad).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}
