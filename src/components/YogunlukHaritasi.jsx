
import { useState, useMemo } from 'react'

const RENKLER = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#A855F7', '#F43F5E', '#22C55E', '#EAB308',
]

const GORUNUM_SECENEKLERI = [
  { id: 'sehir_m2', label: 'Şehir → Kullanılabilir m²' },
  { id: 'sehir_doluluk', label: 'Şehir → Doluluk Oranı' },
  { id: 'sektor_musteri', label: 'Sektör → Müşteri Sayısı' },
  { id: 'sektor_sozlesme', label: 'Sektör → Sözleşme Sayısı' },
  { id: 'musteri_m2', label: 'Müşteri → Kullanılan m²' },
  { id: 'tesis_tipi', label: 'Tesis Tipi → m²' },
]

function Balon({ ad, deger, renk, yuzde, alt, onClick, secili }) {
  const boyut = Math.max(80, Math.min(220, 80 + yuzde * 1.4))
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105"
      style={{ width: boyut, height: boyut, minWidth: boyut, minHeight: boyut }}
    >
      <div
        className="w-full h-full rounded-full flex flex-col items-center justify-center relative shadow-lg"
        style={{
          background: secili
            ? `radial-gradient(circle at 35% 35%, ${renk}ff, ${renk}aa)`
            : `radial-gradient(circle at 35% 35%, ${renk}dd, ${renk}88)`,
          border: secili ? `3px solid ${renk}` : '2px solid transparent',
          boxShadow: secili ? `0 0 0 3px ${renk}44, 0 8px 32px ${renk}44` : `0 4px 16px ${renk}33`,
        }}
      >
        <div className="text-white font-bold text-center px-2 leading-tight" style={{ fontSize: boyut > 120 ? 13 : 11 }}>
          {ad.length > 16 ? ad.slice(0, 14) + '…' : ad}
        </div>
        <div className="text-white font-semibold mt-1" style={{ fontSize: boyut > 120 ? 15 : 12 }}>
          {deger}
        </div>
        {alt && boyut > 100 && (
          <div className="text-white/70 text-center px-2 mt-0.5" style={{ fontSize: 10 }}>
            {alt}
          </div>
        )}
      </div>
    </div>
  )
}

function BarGrafik({ veri, renk, birim }) {
  const max = Math.max(...veri.map(v => v.deger), 1)
  return (
    <div className="space-y-2">
      {veri.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-xs text-gray-600 w-32 shrink-0 text-right truncate" title={item.ad}>{item.ad}</div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full flex items-center pl-2 transition-all duration-700"
              style={{
                width: `${Math.max(3, (item.deger / max) * 100)}%`,
                background: `linear-gradient(90deg, ${RENKLER[i % RENKLER.length]}cc, ${RENKLER[i % RENKLER.length]}88)`,
              }}
            >
              {(item.deger / max) > 0.15 && (
                <span className="text-white text-xs font-medium">{item.degerLabel || item.deger.toLocaleString('tr-TR')}</span>
              )}
            </div>
          </div>
          {(item.deger / max) <= 0.15 && (
            <div className="text-xs text-gray-500 w-16">{item.degerLabel || item.deger.toLocaleString('tr-TR')}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function YogunlukHaritasi({ tesisler, katlar, musteriler, sozlesmeler, projeler, projeBaginlantilari }) {
  const [gorunum, setGorunum] = useState('sehir_m2')
  const [secili, setSecili] = useState(null)
  const [gosterim, setGosterim] = useState('balon') // balon | bar

  const aktifProjeler = projeler.filter(p => ['operasyon', 'sozlesme'].includes(p.durum))
  const aktifIds = new Set(aktifProjeler.map(p => p.id))

  const veri = useMemo(() => {
    const grupla = (items, keyFn, degerFn, altFn) => {
      const map = {}
      items.forEach(item => {
        const key = keyFn(item)
        if (!key) return
        if (!map[key]) map[key] = { ad: key, deger: 0, alt: altFn ? altFn(key) : '' }
        map[key].deger += degerFn(item)
      })
      return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 15)
    }

    switch (gorunum) {
      case 'sehir_m2': {
        const map = {}
        katlar.forEach(k => {
          const tesis = tesisler.find(t => t.id === k.tesis_id)
          const sehir = tesis?.sehir || 'Bilinmiyor'
          if (!map[sehir]) map[sehir] = { ad: sehir, deger: 0 }
          map[sehir].deger += k.kullanilabilir_m2 || 0
        })
        return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 12)
          .map(v => ({ ...v, degerLabel: `${v.deger.toLocaleString('tr-TR')} m²`, alt: 'kullanılabilir alan' }))
      }

      case 'sehir_doluluk': {
        const map = {}
        katlar.forEach(k => {
          const tesis = tesisler.find(t => t.id === k.tesis_id)
          const sehir = tesis?.sehir || 'Bilinmiyor'
          if (!map[sehir]) map[sehir] = { ad: sehir, toplam: 0, kullanilan: 0 }
          map[sehir].toplam += k.kullanilabilir_m2 || 0
          const katKullanilan = projeBaginlantilari
            .filter(b => aktifIds.has(b.proje_id) && b.kat_id === k.id)
            .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)
          map[sehir].kullanilan += katKullanilan
        })
        return Object.values(map)
          .filter(v => v.toplam > 0)
          .map(v => ({
            ad: v.ad,
            deger: Math.round(v.kullanilan / v.toplam * 100),
            degerLabel: `%${Math.round(v.kullanilan / v.toplam * 100)}`,
            alt: `${v.kullanilan.toLocaleString()} / ${v.toplam.toLocaleString()} m²`
          }))
          .sort((a, b) => b.deger - a.deger).slice(0, 12)
      }

      case 'sektor_musteri': {
        const map = {}
        musteriler.forEach(m => {
          const sektorler = m.sektor || ['Belirtilmemiş']
          sektorler.forEach(s => {
            if (!map[s]) map[s] = { ad: s, deger: 0 }
            map[s].deger += 1
          })
        })
        return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 12)
          .map(v => ({ ...v, degerLabel: `${v.deger} müşteri`, alt: 'müşteri sayısı' }))
      }

      case 'sektor_sozlesme': {
        const map = {}
        sozlesmeler.forEach(s => {
          const musteri = musteriler.find(m => m.id === s.musteri_id)
          const sektorler = musteri?.sektor || ['Belirtilmemiş']
          sektorler.forEach(sek => {
            if (!map[sek]) map[sek] = { ad: sek, deger: 0 }
            map[sek].deger += 1
          })
        })
        return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 12)
          .map(v => ({ ...v, degerLabel: `${v.deger} sözleşme`, alt: 'sözleşme sayısı' }))
      }

      case 'musteri_m2': {
        const map = {}
        projeBaginlantilari.filter(b => aktifIds.has(b.proje_id)).forEach(b => {
          const proje = projeler.find(p => p.id === b.proje_id)
          const soz = sozlesmeler.find(s => s.id === proje?.sozlesme_id)
          const musteri = musteriler.find(m => m.id === soz?.musteri_id)
          const ad = musteri?.ad || 'Bağlantısız'
          if (!map[ad]) map[ad] = { ad, deger: 0 }
          map[ad].deger += b.kullanilan_m2 || 0
        })
        return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 12)
          .map(v => ({ ...v, degerLabel: `${v.deger.toLocaleString('tr-TR')} m²`, alt: 'aktif kullanım' }))
      }

      case 'tesis_tipi': {
        const map = {}
        katlar.forEach(k => {
          const tesis = tesisler.find(t => t.id === k.tesis_id)
          const tip = tesis?.tesis_tipi_primary || 'Belirtilmemiş'
          if (!map[tip]) map[tip] = { ad: tip, deger: 0 }
          map[tip].deger += k.kullanilabilir_m2 || 0
        })
        return Object.values(map).sort((a, b) => b.deger - a.deger).slice(0, 12)
          .map(v => ({ ...v, degerLabel: `${v.deger.toLocaleString('tr-TR')} m²`, alt: 'kullanılabilir alan' }))
      }

      default: return []
    }
  }, [gorunum, tesisler, katlar, musteriler, sozlesmeler, projeler, projeBaginlantilari])

  const toplam = veri.reduce((acc, v) => acc + v.deger, 0)
  const seciliVeri = veri.find(v => v.ad === secili)

  return (
    <div className="space-y-5">
      {/* Kontroller */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Görünüm</div>
            <div className="flex flex-wrap gap-2">
              {GORUNUM_SECENEKLERI.map(g => (
                <button key={g.id} onClick={() => { setGorunum(g.id); setSecili(null) }}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${gorunum === g.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setGosterim('balon')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${gosterim === 'balon' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>
              ◉ Balon
            </button>
            <button onClick={() => setGosterim('bar')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${gosterim === 'bar' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>
              ▬ Bar
            </button>
          </div>
        </div>
      </div>

      {/* Görselleştirme */}
      {veri.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">📊</div>
          <div className="text-sm text-gray-400">Bu görünüm için yeterli veri yok.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {gosterim === 'balon' ? (
            <div className="p-6">
              <div className="flex flex-wrap gap-4 justify-center items-center min-h-64">
                {veri.map((item, i) => (
                  <Balon
                    key={item.ad}
                    ad={item.ad}
                    deger={item.degerLabel || item.deger}
                    alt={item.alt}
                    renk={RENKLER[i % RENKLER.length]}
                    yuzde={toplam > 0 ? (item.deger / toplam) * 100 : 0}
                    secili={secili === item.ad}
                    onClick={() => setSecili(secili === item.ad ? null : item.ad)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <BarGrafik
                veri={veri.map((v, i) => ({ ...v, renk: RENKLER[i % RENKLER.length] }))}
                birim=""
              />
            </div>
          )}
        </div>
      )}

      {/* Seçili detay */}
      {seciliVeri && (
        <div className="bg-white rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ background: RENKLER[veri.findIndex(v => v.ad === secili) % RENKLER.length] }} />
            <div className="font-medium text-gray-800">{seciliVeri.ad}</div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">{seciliVeri.degerLabel || seciliVeri.deger}</div>
              <div className="text-xs text-gray-400 mt-0.5">{GORUNUM_SECENEKLERI.find(g => g.id === gorunum)?.label.split('→')[1]?.trim()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">%{toplam > 0 ? Math.round(seciliVeri.deger / toplam * 100) : 0}</div>
              <div className="text-xs text-gray-400 mt-0.5">Toplam içindeki pay</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-800">#{veri.findIndex(v => v.ad === secili) + 1}</div>
              <div className="text-xs text-gray-400 mt-0.5">Sıralama</div>
            </div>
          </div>
          {seciliVeri.alt && (
            <div className="text-xs text-gray-400 mt-3 text-center">{seciliVeri.alt}</div>
          )}
        </div>
      )}

      {/* Özet tablo */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Detay Tablo</div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2 text-xs text-gray-400">#</th>
              <th className="text-left px-5 py-2 text-xs text-gray-400">{GORUNUM_SECENEKLERI.find(g => g.id === gorunum)?.label.split('→')[0]?.trim()}</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400">{GORUNUM_SECENEKLERI.find(g => g.id === gorunum)?.label.split('→')[1]?.trim()}</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400">Pay</th>
            </tr>
          </thead>
          <tbody>
            {veri.map((item, i) => (
              <tr key={item.ad}
                onClick={() => setSecili(secili === item.ad ? null : item.ad)}
                className={`border-b border-gray-50 cursor-pointer transition-colors ${secili === item.ad ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <td className="px-5 py-2.5 text-xs text-gray-400">{i + 1}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RENKLER[i % RENKLER.length] }} />
                    <span className="text-sm text-gray-700">{item.ad}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-sm text-gray-700 text-right font-medium">{item.degerLabel || item.deger}</td>
                <td className="px-5 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${toplam > 0 ? (item.deger / toplam) * 100 : 0}%`, background: RENKLER[i % RENKLER.length] }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8">%{toplam > 0 ? Math.round(item.deger / toplam * 100) : 0}</span>
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
