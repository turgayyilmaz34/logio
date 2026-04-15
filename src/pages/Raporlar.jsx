import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { exportMultiSheet } from '../utils/exportExcel'
import { useRole, canSeeMali, isOperasyon } from '../hooks/useRole'
import YogunlukHaritasi from '../components/YogunlukHaritasi'
import M2MaliyetRaporu from '../components/M2MaliyetRaporu'

const TABS_FULL = [
  { id: 'ciro', label: 'Ciro & Marj' },
  { id: 'kapasite', label: 'Kapasite & Doluluk' },
  { id: 'ihale', label: 'İhale Analizi' },
  { id: 'yogunluk', label: 'Yoğunluk Haritası' },
  { id: 'm2_maliyet', label: 'm² Maliyet' },
]

function MetrikKart({ label, value, sub, renk }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-semibold ${renk || 'text-gray-800'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function Tablo({ basliklar, satirlar, bos }) {
  if (satirlar.length === 0) return (
    <div className="text-center py-8 text-sm text-gray-400">{bos || 'Veri bulunamadı.'}</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {basliklar.map(b => (
              <th key={b} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              {satir.map((hucre, j) => (
                <td key={j} className="px-4 py-3 text-sm text-gray-700">{hucre}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Raporlar() {
  const { rol } = useRole()
  const TABS = isOperasyon(rol) ? TABS_FULL.filter(t => t.id === 'kapasite') : TABS_FULL
  const [aktifTab, setAktifTab] = useState('ciro')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [veri, setVeri] = useState({
    sozlesmeler: [], musteriler: [], projeler: [],
    ihaleler: [], tesisler: [], katlar: [],
    projeBaginlantilari: []
  })

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = (col) => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [s, m, p, i, t, k, pb] = await Promise.all([
        q('sozlesmeler'), q('musteriler'), q('projeler'),
        q('ihaleler'), q('tesisler'), q('katlar'),
        q('proje_kat_baginlantilari'),
      ])
      setVeri({
        sozlesmeler: s.docs.map(d => ({ id: d.id, ...d.data() })),
        musteriler: m.docs.map(d => ({ id: d.id, ...d.data() })),
        projeler: p.docs.map(d => ({ id: d.id, ...d.data() })),
        ihaleler: i.docs.map(d => ({ id: d.id, ...d.data() })),
        tesisler: t.docs.map(d => ({ id: d.id, ...d.data() })),
        katlar: k.docs.map(d => ({ id: d.id, ...d.data() })),
        projeBaginlantilari: pb.docs.map(d => ({ id: d.id, ...d.data() })),
      })
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>

  const { sozlesmeler, musteriler, projeler, ihaleler, tesisler, katlar, projeBaginlantilari } = veri

  const musteriAd = (id) => musteriler.find(m => m.id === id)?.ad || '—'

  // CİRO & MARJ
  const TIP_LABEL = { depolama: 'Depolama', transport: 'Transport', vas: 'VAS', karma: 'Karma' }

  const musteriCiro = musteriler.map(m => {
    const mSoz = sozlesmeler.filter(s => s.musteri_id === m.id)
    const aktif = mSoz.filter(s => s.durum === 'aktif').length
    return { musteriAd: m.ad, toplamSozlesme: mSoz.length, aktifSozlesme: aktif, risk: m.risk_sinifi || '—' }
  }).filter(m => m.toplamSozlesme > 0).sort((a, b) => b.toplamSozlesme - a.toplamSozlesme)

  const sozlesmeBitis = sozlesmeler
    .filter(s => s.durum === 'aktif' && s.bitis)
    .map(s => {
      const kalan = Math.ceil((new Date(s.bitis) - new Date()) / (1000 * 60 * 60 * 24))
      return { ...s, kalan }
    })
    .filter(s => s.kalan <= 180)
    .sort((a, b) => a.kalan - b.kalan)

  // KAPASİTE & DOLULUK
  const aktifProjeler = projeler.filter(p => ['operasyon', 'sozlesme'].includes(p.durum))
  const aktifIds = new Set(aktifProjeler.map(p => p.id))
  const kullanilanM2 = projeBaginlantilari
    .filter(b => aktifIds.has(b.proje_id))
    .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)

  const tesisRapor = tesisler.map(t => {
    const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
    const toplamM2 = tesisKatlari.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
    const tesisKatIds = new Set(tesisKatlari.map(k => k.id))
    const kullanilanT = projeBaginlantilari
      .filter(b => aktifIds.has(b.proje_id) && tesisKatIds.has(b.kat_id))
      .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)
    const bosM2 = Math.max(0, toplamM2 - kullanilanT)
    const doluYuzde = toplamM2 > 0 ? Math.round(kullanilanT / toplamM2 * 100) : 0
    return { tesis: t, toplamM2, kullanilanT, bosM2, doluYuzde }
  }).filter(t => t.toplamM2 > 0)

  const toplamKullanilabilir = katlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
  const bosM2Toplam = Math.max(0, toplamKullanilabilir - kullanilanM2)
  const genelDoluluk = toplamKullanilabilir > 0 ? Math.round(kullanilanM2 / toplamKullanilabilir * 100) : 0

  // İHALE ANALİZİ
  const kazanilan = ihaleler.filter(i => i.durum === 'kazanildi').length
  const kaybedilen = ihaleler.filter(i => i.durum === 'kaybedildi').length
  const aktifIhale = ihaleler.filter(i => ['hazirlik', 'gonderildi', 'bekleniyor'].includes(i.durum)).length
  const kazanmaOrani = (kazanilan + kaybedilen) > 0
    ? Math.round(kazanilan / (kazanilan + kaybedilen) * 100) : null

  const ihaleMusteri = musteriler.map(m => {
    const mIh = ihaleler.filter(i => i.musteri_id === m.id)
    const kaz = mIh.filter(i => i.durum === 'kazanildi').length
    const kay = mIh.filter(i => i.durum === 'kaybedildi').length
    return { ad: m.ad, toplam: mIh.length, kazanildi: kaz, kaybedildi: kay, aktif: mIh.filter(i => ['hazirlik','gonderildi','bekleniyor'].includes(i.durum)).length }
  }).filter(m => m.toplam > 0).sort((a, b) => b.toplam - a.toplam)

  const rakip3pl = {}
  ihaleler.forEach(i => {
    if (i.mevcut_3pl) rakip3pl[i.mevcut_3pl] = (rakip3pl[i.mevcut_3pl] || 0) + 1
  })
  const rakipListesi = Object.entries(rakip3pl).sort((a, b) => b[1] - a[1])

  const handleExport = () => {
    const ciData = musteriCiro.map(m => ({
      'Müşteri': m.musteriAd, 'Toplam Sözleşme': m.toplamSozlesme,
      'Aktif Sözleşme': m.aktifSozlesme, 'Risk': m.risk,
    }))
    const kapData = tesisRapor.map(t => ({
      'Tesis': t.tesis.ad, 'Şehir': t.tesis.sehir,
      'Toplam m²': t.toplamM2, 'Kullanılan m²': t.kullanilanT,
      'Boş m²': t.bosM2, 'Doluluk %': t.doluYuzde,
    }))
    const ihData = ihaleler.map(i => ({
      'İhale': i.ad, 'Müşteri': musteriAd(i.musteri_id),
      'Durum': i.durum, 'Mevcut 3PL': i.mevcut_3pl || '',
      'Tahmini Değer': i.tahmini_deger_usd || '',
    }))
    exportMultiSheet([
      { name: 'Müşteri Bazında', data: ciData },
      { name: 'Kapasite', data: kapData },
      { name: 'İhaleler', data: ihData },
    ], 'raporlar')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Raporlar</h1>
          <p className="text-sm text-gray-400 mt-0.5">Mevcut veriden anlık analiz</p>
        </div>
        <button onClick={handleExport}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↓ Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setAktifTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${aktifTab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CİRO & MARJ */}
      {aktifTab === 'ciro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetrikKart label="Toplam Sözleşme" value={sozlesmeler.length} sub={`${sozlesmeler.filter(s => s.durum === 'aktif').length} aktif`} />
            <MetrikKart label="Toplam Müşteri" value={musteriler.length} sub={`${musteriCiro.length} sözleşmeli`} />
            <MetrikKart label="Aktif Proje" value={aktifProjeler.length} sub={`${projeler.filter(p => p.durum === 'operasyon').length} operasyonda`} renk="text-green-600" />
            <MetrikKart label="Sözleşmesiz Proje" value={projeler.filter(p => !p.sozlesme_id && ['teklif','sozlesme','operasyon'].includes(p.durum)).length} sub="Bağlantı gerekiyor" renk="text-amber-600" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Sözleşme Tipi Dağılımı</div>
            <div className="grid grid-cols-4 gap-4">
              {['depolama', 'transport', 'vas', 'karma'].map(tip => {
                const sayi = sozlesmeler.filter(s => s.tip === tip).length
                const aktif = sozlesmeler.filter(s => s.tip === tip && s.durum === 'aktif').length
                return (
                  <div key={tip} className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-semibold text-gray-700">{sayi}</div>
                    <div className="text-xs text-gray-400 mt-1">{TIP_LABEL[tip]}</div>
                    {aktif > 0 && <div className="text-xs text-green-600 mt-0.5">{aktif} aktif</div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri Bazında</div>
            </div>
            <Tablo
              basliklar={['Müşteri', 'Toplam Sözleşme', 'Aktif', 'Risk']}
              satirlar={musteriCiro.map(m => [m.musteriAd, m.toplamSozlesme, m.aktifSozlesme, m.risk])}
              bos="Henüz sözleşmeli müşteri yok."
            />
          </div>

          {sozlesmeBitis.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">180 Gün İçinde Biten Sözleşmeler</div>
              </div>
              <Tablo
                basliklar={['Sözleşme', 'Müşteri', 'Bitiş', 'Kalan Gün']}
                satirlar={sozlesmeBitis.map(s => [
                  s.ad || s.id.slice(0, 8),
                  musteriAd(s.musteri_id),
                  s.bitis,
                  <span className={s.kalan < 0 ? 'text-red-600 font-medium' : s.kalan <= 30 ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                    {s.kalan < 0 ? `${Math.abs(s.kalan)} gün geçti!` : `${s.kalan} gün`}
                  </span>
                ])}
              />
            </div>
          )}
        </div>
      )}

      {/* KAPASİTE & DOLULUK */}
      {aktifTab === 'kapasite' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetrikKart label="Toplam Alan" value={toplamKullanilabilir > 0 ? `${toplamKullanilabilir.toLocaleString('tr-TR')} m²` : '—'} sub={`${tesisler.length} tesis`} />
            <MetrikKart label="Kullanılan" value={kullanilanM2 > 0 ? `${kullanilanM2.toLocaleString('tr-TR')} m²` : '—'} sub={`%${genelDoluluk} doluluk`} renk={genelDoluluk >= 80 ? 'text-green-600' : genelDoluluk >= 50 ? 'text-amber-600' : 'text-red-500'} />
            <MetrikKart label="Boş Alan" value={toplamKullanilabilir > 0 ? `${bosM2Toplam.toLocaleString('tr-TR')} m²` : '—'} sub={`%${100 - genelDoluluk} boşluk`} renk={bosM2Toplam > 0 ? 'text-red-500' : 'text-green-600'} />
            <MetrikKart label="Aktif Projeler" value={aktifProjeler.length} sub="Operasyon + Sözleşme" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tesis Bazında Doluluk</div>
            </div>
            <div className="divide-y divide-gray-50">
              {tesisRapor.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">Henüz tesis veya kat tanımlı değil.</div>
              ) : tesisRapor.map(({ tesis, toplamM2, kullanilanT, bosM2, doluYuzde }) => (
                <div key={tesis.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-800 text-sm">{tesis.ad}</span>
                      <span className="text-xs text-gray-400 ml-2">{tesis.sehir}</span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{kullanilanT.toLocaleString('tr-TR')} m²</span> dolu /
                      <span className={`font-medium ml-1 ${bosM2 > 0 ? 'text-red-500' : 'text-green-600'}`}>{bosM2.toLocaleString('tr-TR')} m²</span> boş
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${doluYuzde >= 80 ? 'bg-green-500' : doluYuzde >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${doluYuzde}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">%{doluYuzde} dolu · {toplamM2.toLocaleString('tr-TR')} m² toplam</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* İHALE ANALİZİ */}
      {aktifTab === 'ihale' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetrikKart label="Toplam İhale" value={ihaleler.length} />
            <MetrikKart label="Aktif" value={aktifIhale} renk="text-amber-600" />
            <MetrikKart label="Kazanıldı" value={kazanilan} renk="text-green-600" />
            <MetrikKart label="Kazan Oranı" value={kazanmaOrani !== null ? `%${kazanmaOrani}` : '—'} sub={`${kazanilan} kazan / ${kaybedilen} kayıp`} renk={kazanmaOrani !== null && kazanmaOrani >= 50 ? 'text-green-600' : 'text-amber-600'} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri Bazında İhale</div>
            </div>
            <Tablo
              basliklar={['Müşteri', 'Toplam', 'Aktif', 'Kazanıldı', 'Kaybedildi']}
              satirlar={ihaleMusteri.map(m => [m.ad, m.toplam, m.aktif, m.kazanildi, m.kaybedildi])}
              bos="Henüz ihale kaydı yok."
            />
          </div>

          {rakipListesi.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mevcut 3PL Analizi</div>
              </div>
              <Tablo
                basliklar={['3PL Firması', 'Karşılaşma Sayısı']}
                satirlar={rakipListesi.map(([ad, sayi]) => [ad, sayi])}
              />
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tüm İhaleler</div>
            </div>
            <Tablo
              basliklar={['İhale', 'Müşteri', 'Durum', 'Son Başvuru', 'Tahmini Değer']}
              satirlar={ihaleler.sort((a, b) => (b.son_basvuru || '').localeCompare(a.son_basvuru || '')).map(i => [
                i.ad || '—',
                musteriAd(i.musteri_id),
                i.durum,
                i.son_basvuru || '—',
                i.tahmini_deger_usd ? `$${Number(i.tahmini_deger_usd).toLocaleString()}` : '—'
              ])}
              bos="Henüz ihale kaydı yok."
            />
          </div>
        </div>
      )}

      {/* m² MALİYET */}
      {aktifTab === 'm2_maliyet' && (
        <M2MaliyetRaporu />
      )}

      {/* YOĞUNLUK HARİTASI */}
      {aktifTab === 'yogunluk' && (
        <YogunlukHaritasi
          tesisler={tesisler}
          katlar={katlar}
          musteriler={musteriler}
          sozlesmeler={sozlesmeler}
          projeler={projeler}
          projeBaginlantilari={projeBaginlantilari}
        />
      )}
    </div>
  )
}
