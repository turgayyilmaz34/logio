
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { kurlariGetir, kurdanCevir } from '../utils/kurService'

const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR']

function satirRenk(gercek, hedef) {
  if (!hedef || !gercek) return ''
  const oran = gercek / hedef
  if (oran <= 0.9) return 'text-green-600'
  if (oran <= 1.0) return 'text-amber-600'
  return 'text-red-600'
}

function HedefInput({ value, onChange, pb }) {
  const [edit, setEdit] = useState(false)
  const [temp, setTemp] = useState(value || '')
  if (edit) return (
    <div className="flex items-center gap-1">
      <input
        type="number" step="0.01"
        value={temp}
        onChange={e => setTemp(e.target.value)}
        className="w-20 px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none"
        autoFocus
        onBlur={() => { onChange(Number(temp) || null); setEdit(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(Number(temp) || null); setEdit(false) } if (e.key === 'Escape') setEdit(false) }}
      />
      <span className="text-xs text-gray-400">{pb}</span>
    </div>
  )
  return (
    <span
      onClick={() => { setTemp(value || ''); setEdit(true) }}
      className="cursor-pointer text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
      title="Tıkla ve hedef fiyat gir"
    >
      {value ? `${value} ${pb}` : 'Hedef gir'}
    </span>
  )
}

export default function M2MaliyetRaporu() {
  const [veri, setVeri] = useState([]) // [{ tesis, katlar: [{kat, malSahibiSoz}] }]
  const [kurlar, setKurlar] = useState(null)
  const [gosterimPB, setGosterimPB] = useState('USD')
  const [acikTesisler, setAcikTesisler] = useState({})
  const [hedefler, setHedefler] = useState({}) // { tesisId: fiyat }
  const [yukleniyor, setYukleniyor] = useState(true)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const [tSnap, kSnap, msSnap, kurVeri] = await Promise.all([
        getDocs(query(collection(db, 'tesisler'), where('tenant_id', '==', tenantId))),
        getDocs(query(collection(db, 'katlar'), where('tenant_id', '==', tenantId))),
        getDocs(query(collection(db, 'mal_sahibi_sozlesmeleri'), where('tenant_id', '==', tenantId))),
        kurlariGetir(),
      ])

      const tesisler = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const katlar = kSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const malSahibiSoz = msSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setKurlar(kurVeri)

      // Tesis bazında grupla
      const gruplu = tesisler.map(t => {
        const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
        const katVerisi = tesisKatlari.map(k => {
          // Bu kata ait en güncel mal sahibi sözleşmesini bul
          const katSozlesmeleri = malSahibiSoz
            .filter(ms => ms.kat_id === k.id)
            .sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''))
          const aktifSoz = katSozlesmeleri[0] || null
          return { kat: k, soz: aktifSoz }
        })
        return { tesis: t, katlar: katVerisi }
      }).filter(t => t.katlar.length > 0)

      setVeri(gruplu)

      // Hedefleri Firestore'dan yükle
      try {
        const hSnap = await getDoc(doc(db, 'sistem', `m2_hedefler_${tenantId}`))
        if (hSnap.exists()) setHedefler(hSnap.data())
      } catch {}

      setYukleniyor(false)
    }
    yukle()
  }, [])

  const hedefKaydet = async (yeni) => {
    setHedefler(yeni)
    try {
      await setDoc(doc(db, 'sistem', `m2_hedefler_${tenantId}`), yeni)
    } catch {}
  }

  const hedefDegistir = (tesisId, deger) => {
    const yeni = { ...hedefler, [tesisId]: deger }
    hedefKaydet(yeni)
  }

  // Kat için m² maliyet hesabı
  const katM2Maliyet = (kat, soz, pb) => {
    if (!soz) return null
    const sozM2 = kat.sozlesme_m2 || 0
    const kulM2 = kat.kullanilabilir_m2 || 0
    if (!sozM2 && !kulM2) return null

    // Aylık toplam kira
    let aylikToplamKaynakPB = 0
    const kaynakPB = soz.para_birimi || 'TRY'

    if (soz.m2_birim_fiyat > 0) {
      aylikToplamKaynakPB = soz.m2_birim_fiyat * sozM2
    } else if (soz.sabit_tutar > 0) {
      aylikToplamKaynakPB = soz.sabit_tutar
    } else {
      return null
    }

    // Hedef para birimine çevir
    const aylikToplam = kurdanCevir(aylikToplamKaynakPB, kaynakPB, pb, kurlar)

    return {
      sozlesmeM2Fiyat: sozM2 > 0 ? Math.round(aylikToplam / sozM2 * 100) / 100 : null,
      kullanilabilirM2Fiyat: kulM2 > 0 ? Math.round(aylikToplam / kulM2 * 100) / 100 : null,
      aylikToplam,
      kaynakPB,
      sozM2,
      kulM2,
    }
  }

  // Tesis özet hesabı
  const tesisOzet = (tesisVeri, pb) => {
    let toplamAylik = 0
    let toplamSozM2 = 0
    let toplamKulM2 = 0
    let herhangiSoz = false

    tesisVeri.katlar.forEach(({ kat, soz }) => {
      if (!soz) return
      herhangiSoz = true
      const h = katM2Maliyet(kat, soz, pb)
      if (!h) return
      toplamAylik += h.aylikToplam
      toplamSozM2 += h.sozM2
      toplamKulM2 += h.kulM2
    })

    if (!herhangiSoz) return null

    return {
      aylikToplam: Math.round(toplamAylik * 100) / 100,
      sozlesmeM2Fiyat: toplamSozM2 > 0 ? Math.round(toplamAylik / toplamSozM2 * 100) / 100 : null,
      kullanilabilirM2Fiyat: toplamKulM2 > 0 ? Math.round(toplamAylik / toplamKulM2 * 100) / 100 : null,
      toplamSozM2,
      toplamKulM2,
    }
  }

  const toggleTesis = (id) => setAcikTesisler(p => ({ ...p, [id]: !p[id] }))

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Yükleniyor...</div>

  if (veri.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div className="text-gray-300 text-4xl mb-3">📐</div>
      <div className="text-sm text-gray-400">m² maliyet hesabı için önce tesise kat ve mal sahibi sözleşmesi ekleyin.</div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Kontroller */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-xs text-gray-400 mb-1">Görüntüleme Para Birimi</div>
          <div className="flex gap-1">
            {PARA_BIRIMLERI.map(pb => (
              <button key={pb} onClick={() => setGosterimPB(pb)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${gosterimPB === pb ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {pb}
              </button>
            ))}
          </div>
        </div>
        {kurlar && (
          <div className="text-xs text-gray-400">
            USD/TRY: <span className="text-gray-600 font-medium">{kurlar.USD_TRY?.toFixed(2)}</span>
            {' · '}EUR/TRY: <span className="text-gray-600 font-medium">{kurlar.EUR_TRY?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Özet tablo başlık */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <div className="col-span-3">Tesis</div>
            <div className="col-span-2 text-right">Toplam Kira/ay</div>
            <div className="col-span-2 text-right">Sözleşme m²</div>
            <div className="col-span-2 text-right">Kullanılabilir m²</div>
            <div className="col-span-2 text-right">Hedef (Sözl. m²)</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        {veri.map(tesisVeri => {
          const ozet = tesisOzet(tesisVeri, gosterimPB)
          const hedef = hedefler[tesisVeri.tesis.id]
          const acik = acikTesisler[tesisVeri.tesis.id]

          return (
            <div key={tesisVeri.tesis.id}>
              {/* Tesis satırı */}
              <div
                className="px-5 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleTesis(tesisVeri.tesis.id)}
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{acik ? '▼' : '▶'}</span>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{tesisVeri.tesis.ad}</div>
                        <div className="text-xs text-gray-400">{tesisVeri.tesis.sehir} · {tesisVeri.katlar.length} kat</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    {ozet ? (
                      <span className="text-sm font-semibold text-gray-800">
                        {ozet.aylikToplam.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} {gosterimPB}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 text-right">
                    {ozet?.sozlesmeM2Fiyat ? (
                      <div>
                        <span className={`text-sm font-semibold ${satirRenk(ozet.sozlesmeM2Fiyat, hedef)}`}>
                          {ozet.sozlesmeM2Fiyat.toFixed(2)} {gosterimPB}
                        </span>
                        <div className="text-xs text-gray-400">{ozet.toplamSozM2.toLocaleString()} m²</div>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 text-right">
                    {ozet?.kullanilabilirM2Fiyat ? (
                      <div>
                        <span className={`text-sm font-semibold ${satirRenk(ozet.kullanilabilirM2Fiyat, hedef)}`}>
                          {ozet.kullanilabilirM2Fiyat.toFixed(2)} {gosterimPB}
                        </span>
                        <div className="text-xs text-gray-400">{ozet.toplamKulM2.toLocaleString()} m²</div>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 text-right" onClick={e => e.stopPropagation()}>
                    <HedefInput
                      value={hedef}
                      onChange={v => hedefDegistir(tesisVeri.tesis.id, v)}
                      pb={gosterimPB}
                    />
                    {hedef && ozet?.sozlesmeM2Fiyat && (
                      <div className={`text-xs font-medium mt-0.5 ${satirRenk(ozet.sozlesmeM2Fiyat, hedef)}`}>
                        {ozet.sozlesmeM2Fiyat <= hedef
                          ? `✓ ${((1 - ozet.sozlesmeM2Fiyat / hedef) * 100).toFixed(1)}% altında`
                          : `⚠ ${((ozet.sozlesmeM2Fiyat / hedef - 1) * 100).toFixed(1)}% üstünde`
                        }
                      </div>
                    )}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              </div>

              {/* Kat detayları */}
              {acik && (
                <div className="bg-gray-50/50">
                  <div className="px-5 py-2 border-b border-gray-100">
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 ml-6">
                      <div className="col-span-3">Kat</div>
                      <div className="col-span-2 text-right">Aylık Kira</div>
                      <div className="col-span-2 text-right">Sözl. m² fiyatı</div>
                      <div className="col-span-2 text-right">Kul. m² fiyatı</div>
                      <div className="col-span-2 text-right">Kaynak fiyat</div>
                      <div className="col-span-1"></div>
                    </div>
                  </div>
                  {tesisVeri.katlar.map(({ kat, soz }) => {
                    const h = katM2Maliyet(kat, soz, gosterimPB)
                    return (
                      <div key={kat.id} className="px-5 py-3 border-b border-gray-50 last:border-0">
                        <div className="grid grid-cols-12 gap-2 items-center ml-6">
                          <div className="col-span-3">
                            <div className="text-xs font-medium text-gray-700">{kat.kat_adi}</div>
                            {kat.tur_kodu && <code className="text-xs text-gray-400 font-mono">{kat.tur_kodu}</code>}
                          </div>
                          <div className="col-span-2 text-right text-xs text-gray-600">
                            {h ? `${h.aylikToplam.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${gosterimPB}` : '—'}
                          </div>
                          <div className="col-span-2 text-right">
                            {h?.sozlesmeM2Fiyat ? (
                              <div>
                                <span className={`text-xs font-semibold ${satirRenk(h.sozlesmeM2Fiyat, hedef)}`}>
                                  {h.sozlesmeM2Fiyat.toFixed(2)} {gosterimPB}
                                </span>
                                <div className="text-xs text-gray-400">{h.sozM2.toLocaleString()} m²</div>
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </div>
                          <div className="col-span-2 text-right">
                            {h?.kullanilabilirM2Fiyat ? (
                              <div>
                                <span className={`text-xs font-semibold ${satirRenk(h.kullanilabilirM2Fiyat, hedef)}`}>
                                  {h.kullanilabilirM2Fiyat.toFixed(2)} {gosterimPB}
                                </span>
                                <div className="text-xs text-gray-400">{h.kulM2.toLocaleString()} m²</div>
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </div>
                          <div className="col-span-2 text-right text-xs text-gray-400">
                            {soz ? (
                              soz.m2_birim_fiyat > 0
                                ? `${soz.m2_birim_fiyat} ${soz.para_birimi}/m²`
                                : soz.sabit_tutar > 0
                                ? `${soz.sabit_tutar.toLocaleString()} ${soz.para_birimi} sabit`
                                : 'Sözleşme var, fiyat girilmemiş'
                            ) : <span className="text-gray-300">Sözleşme yok</span>}
                          </div>
                          <div className="col-span-1"></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Genel özet */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Portföy Özeti</div>
        <div className="grid grid-cols-3 gap-6">
          {(() => {
            let toplamAylik = 0, toplamSozM2 = 0, toplamKulM2 = 0
            veri.forEach(t => {
              const o = tesisOzet(t, gosterimPB)
              if (!o) return
              toplamAylik += o.aylikToplam
              toplamSozM2 += o.toplamSozM2
              toplamKulM2 += o.toplamKulM2
            })
            return (
              <>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-semibold text-gray-800">
                    {toplamAylik.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Toplam Aylık Kira ({gosterimPB})</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-semibold text-blue-700">
                    {toplamSozM2 > 0 ? (toplamAylik / toplamSozM2).toFixed(2) : '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Portföy Ort. (Sözleşme m², {gosterimPB})</div>
                  <div className="text-xs text-gray-400">{toplamSozM2.toLocaleString()} m²</div>
                </div>
                <div className="text-center p-4 bg-teal-50 rounded-xl">
                  <div className="text-2xl font-semibold text-teal-700">
                    {toplamKulM2 > 0 ? (toplamAylik / toplamKulM2).toFixed(2) : '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Portföy Ort. (Kullanılabilir m², {gosterimPB})</div>
                  <div className="text-xs text-gray-400">{toplamKulM2.toLocaleString()} m²</div>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-lg">
        💡 <strong>Hedef fiyat</strong> tesis bazında — "Hedef gir" yazısına tıkla, istediğin {gosterimPB} değerini gir. Mevcut fiyat hedefin altındaysa yeşil, üstündeyse kırmızı görünür. Hedefler kaydedilir.
      </div>
    </div>
  )
}
