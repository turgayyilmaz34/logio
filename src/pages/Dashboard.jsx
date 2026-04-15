import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'

function MetrikKart({ label, value, sub, renk, badge }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-semibold ${renk || 'text-gray-800'}`}>{value}</div>
      {badge && (
        <div className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${badge.renk}`}>
          {badge.text}
        </div>
      )}
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function UyariKart({ baslik, items, renk }) {
  if (!items || items.length === 0) return null
  return (
    <div className={`rounded-xl border p-4 ${renk}`}>
      <div className="text-xs font-medium mb-2 uppercase tracking-wide">{baslik}</div>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span>{item.ad}</span>
            <span className="font-medium">{item.bilgi}</span>
          </div>
        ))}
        {items.length > 5 && <div className="text-xs opacity-60">+{items.length - 5} daha...</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [yukleniyor, setYukleniyor] = useState(true)
  const [veri, setVeri] = useState({
    tesisler: [], katlar: [], sozlesmeler: [], projeler: [],
    ihaleler: [], musteriler: [], malSahibiSozlesmeleri: [],
    projeBaginlantilari: [],
    mheEkipmanlar: []
  })

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = (col) => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [t, k, s, p, i, m, ms, pb] = await Promise.all([
        q('tesisler'), q('katlar'), q('sozlesmeler'),
        q('projeler'), q('ihaleler'), q('musteriler'),
        q('mal_sahibi_sozlesmeleri'), q('proje_kat_baginlantilari')
      ])
      setVeri({
        tesisler: t.docs.map(d => ({ id: d.id, ...d.data() })),
        katlar: k.docs.map(d => ({ id: d.id, ...d.data() })),
        sozlesmeler: s.docs.map(d => ({ id: d.id, ...d.data() })),
        projeler: p.docs.map(d => ({ id: d.id, ...d.data() })),
        ihaleler: i.docs.map(d => ({ id: d.id, ...d.data() })),
        musteriler: m.docs.map(d => ({ id: d.id, ...d.data() })),
        malSahibiSozlesmeleri: ms.docs.map(d => ({ id: d.id, ...d.data() })),
        projeBaginlantilari: pb.docs.map(d => ({ id: d.id, ...d.data() })),
      })
      // MHE ayrı çek
      try {
        const mheSnap = await getDocs(query(collection(db, 'mhe_ekipmanlar'), where('tenant_id', '==', tenantId)))
        setVeri(prev => ({ ...prev, mheEkipmanlar: mheSnap.docs.map(d => ({ id: d.id, ...d.data() })) }))
      } catch {}
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return (
    <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>
  )

  const { tesisler, katlar, sozlesmeler, projeler, ihaleler, musteriler, malSahibiSozlesmeleri, projeBaginlantilari, mheEkipmanlar = [] } = veri

  // --- Kapasite hesapları ---
  // Toplam kullanılabilir (asmakat hariç — asmakat bonus)
  const toplamKullanilabilirM2 = katlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)

  // Aktif projelerin kullandığı m² (asmakat hariç, sadece doluluk)
  const aktifProjeler = projeler.filter(p => p.durum === 'operasyon' || p.durum === 'sozlesme')
  const aktifProjeIds = new Set(aktifProjeler.map(p => p.id))
  const kullanildanM2 = projeBaginlantilari
    .filter(b => aktifProjeIds.has(b.proje_id))
    .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)

  const bosM2 = Math.max(0, toplamKullanilabilirM2 - kullanildanM2)
  const doluYuzde = toplamKullanilabilirM2 > 0
    ? Math.round((kullanildanM2 / toplamKullanilabilirM2) * 100)
    : 0
  const bosYuzde = 100 - doluYuzde

  const doluluRenk = doluYuzde >= 80 ? 'text-green-600'
    : doluYuzde >= 50 ? 'text-amber-600'
    : 'text-red-500'

  const bosBadgeRenk = bosYuzde > 30 ? 'bg-red-50 text-red-600'
    : bosYuzde > 10 ? 'bg-amber-50 text-amber-700'
    : 'bg-green-50 text-green-700'

  // --- Sözleşme bitiş uyarıları ---
  const bugun = new Date()
  const gunKaldi = (tarih) => tarih ? Math.ceil((new Date(tarih) - bugun) / (1000 * 60 * 60 * 24)) : null

  const sozlesmeUyarilari = sozlesmeler
    .filter(s => s.durum === 'aktif' && s.bitis)
    .map(s => ({ ...s, kalan: gunKaldi(s.bitis) }))
    .filter(s => s.kalan !== null && s.kalan <= 90)
    .sort((a, b) => a.kalan - b.kalan)
    .map(s => ({
      ad: s.ad || s.id.slice(0, 8),
      bilgi: s.kalan < 0 ? `${Math.abs(s.kalan)} gün geçti!` : `${s.kalan} gün kaldı`
    }))

  const malSahibiUyarilari = malSahibiSozlesmeleri
    .filter(s => s.bitis)
    .map(s => ({ ...s, kalan: gunKaldi(s.bitis) }))
    .filter(s => s.kalan !== null && s.kalan <= (s.yenileme_uyari_gun || 90))
    .sort((a, b) => a.kalan - b.kalan)
    .map(s => ({
      ad: s.mal_sahibi_adi || '—',
      bilgi: s.kalan < 0 ? `${Math.abs(s.kalan)} gün geçti!` : `${s.kalan} gün kaldı`
    }))

  const ihaleUyarilari = ihaleler
    .filter(i => ['hazirlik', 'gonderildi', 'bekleniyor'].includes(i.durum) && i.son_basvuru)
    .map(i => ({ ...i, kalan: gunKaldi(i.son_basvuru) }))
    .filter(i => i.kalan !== null && i.kalan <= 14)
    .sort((a, b) => a.kalan - b.kalan)
    .map(i => ({
      ad: i.ad || '—',
      bilgi: i.kalan < 0 ? 'Geçti!' : i.kalan === 0 ? 'Bugün!' : `${i.kalan} gün`
    }))

  // --- Ruhsat / İtfaiye / ÇED bitiş uyarıları ---
  const belgeSuresiUyarilari = tesisler.flatMap(t => {
    const uyarilar = []
    const kontrol = (belge, ad) => {
      if (!belge) return
      const tarih = belge.gecerlilik_tarihi || belge.onay_tarihi
      if (!tarih) return
      const kalan = gunKaldi(tarih)
      const uyariGun = Number(belge.uyari_gun) || 90
      if (kalan !== null && kalan <= uyariGun) {
        uyarilar.push({
          ad: `${t.ad} — ${ad}`,
          bilgi: kalan < 0 ? `${Math.abs(kalan)} gün geçti!` : kalan === 0 ? 'Bugün!' : `${kalan} gün kaldı`
        })
      }
    }
    kontrol(t.ruhsat, 'Ruhsat')
    kontrol(t.itfaiye, 'İtfaiye')
    kontrol(t.ced, 'ÇED')
    return uyarilar
  })

  // --- MHE kira bitiş uyarıları (30 gün) ---
  const mheUyarilari = (mheEkipmanlar || [])
    .filter(e => e.bitis)
    .map(e => ({ ...e, kalan: gunKaldi(e.bitis) }))
    .filter(e => e.kalan !== null && e.kalan <= 30)
    .sort((a, b) => a.kalan - b.kalan)
    .map(e => ({
      ad: `${e.tip}${e.marka ? ' — ' + e.marka : ''}`,
      bilgi: e.kalan < 0 ? `${Math.abs(e.kalan)} gün geçti!` : e.kalan === 0 ? 'Bugün!' : `${e.kalan} gün`
    }))

  // --- Sözleşmesiz aktif projeler ---
  const sozlesmesizProjeler = projeler
    .filter(p => !p.sozlesme_id && ['teklif', 'sozlesme', 'operasyon'].includes(p.durum))
    .map(p => ({ ad: p.ad || '—', bilgi: p.durum === 'operasyon' ? 'Operasyonda!' : p.durum }))

  // --- Proje & ihale pipeline ---
  const projeOzet = {
    teklif: projeler.filter(p => p.durum === 'teklif').length,
    sozlesme: projeler.filter(p => p.durum === 'sozlesme').length,
    operasyon: projeler.filter(p => p.durum === 'operasyon').length,
    tamamlandi: projeler.filter(p => p.durum === 'tamamlandi').length,
  }

  const ihaleOzet = {
    aktif: ihaleler.filter(i => ['hazirlik', 'gonderildi', 'bekleniyor'].includes(i.durum)).length,
    kazanildi: ihaleler.filter(i => i.durum === 'kazanildi').length,
    kaybedildi: ihaleler.filter(i => i.durum === 'kaybedildi').length,
  }
  const kazanmaOrani = (ihaleOzet.kazanildi + ihaleOzet.kaybedildi) > 0
    ? Math.round(ihaleOzet.kazanildi / (ihaleOzet.kazanildi + ihaleOzet.kaybedildi) * 100) : null

  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const hicVeriYok = tesisler.length === 0 && musteriler.length === 0 && sozlesmeler.length === 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">{tarih}</p>
      </div>

      {hicVeriYok ? (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-blue-700">
          <div className="font-medium mb-1">Başlamak için</div>
          <div className="text-blue-600 space-y-1">
            <div>1 → Tesisler menüsünden tesis ve kat tanımlayın</div>
            <div>2 → Müşteriler menüsünden müşteri ekleyin</div>
            <div>3 → Sözleşmeler menüsünden sözleşme oluşturun</div>
            <div>4 → Projeler menüsünden proje açın</div>
          </div>
        </div>
      ) : (
        <>
          {/* Özet metrikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetrikKart
              label="Toplam Alan"
              value={toplamKullanilabilirM2 > 0 ? `${toplamKullanilabilirM2.toLocaleString('tr-TR')} m²` : '—'}
              sub={`${katlar.length} kat · ${tesisler.length} tesis`}
            />
            <MetrikKart
              label="Dolu Alan"
              value={kullanildanM2 > 0 ? `${kullanildanM2.toLocaleString('tr-TR')} m²` : '—'}
              sub={toplamKullanilabilirM2 > 0 ? `%${doluYuzde} doluluk` : '—'}
              renk={doluluRenk}
            />
            <MetrikKart
              label="Boş Alan"
              value={toplamKullanilabilirM2 > 0 ? `${bosM2.toLocaleString('tr-TR')} m²` : '—'}
              sub={toplamKullanilabilirM2 > 0 ? `%${bosYuzde} boşluk` : '—'}
              badge={toplamKullanilabilirM2 > 0 ? { text: bosM2 > 0 ? 'Maliyet yiyor' : 'Tam dolu', renk: bosBadgeRenk } : null}
            />
            <MetrikKart
              label="Aktif İhaleler"
              value={ihaleOzet.aktif}
              sub={kazanmaOrani !== null ? `%${kazanmaOrani} kazan oranı` : 'Henüz sonuç yok'}
              renk={ihaleOzet.aktif > 0 ? 'text-amber-600' : 'text-gray-800'}
            />
          </div>

          {/* Doluluk bar */}
          {toplamKullanilabilirM2 > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kapasite Durumu</div>
                <div className="text-xs text-gray-500">
                  <span className="text-gray-700 font-medium">{kullanildanM2.toLocaleString('tr-TR')} m²</span> dolu /
                  <span className={`font-medium ml-1 ${bosM2 > 0 ? 'text-red-500' : 'text-green-600'}`}>{bosM2.toLocaleString('tr-TR')} m²</span> boş
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${doluYuzde >= 80 ? 'bg-green-500' : doluYuzde >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                  style={{ width: `${doluYuzde}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className={`font-medium ${doluluRenk}`}>%{doluYuzde} dolu</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Tesis bazında doluluk */}
          {tesisler.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Tesis Bazında</div>
              <div className="space-y-3">
                {tesisler.map(t => {
                  const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
                  const tesisToplamM2 = tesisKatlari.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
                  const tesisKatIds = new Set(tesisKatlari.map(k => k.id))
                  const tesisKullanilan = projeBaginlantilari
                    .filter(b => aktifProjeIds.has(b.proje_id) && tesisKatIds.has(b.kat_id))
                    .reduce((acc, b) => acc + (b.kullanilan_m2 || 0), 0)
                  const tesisBos = Math.max(0, tesisToplamM2 - tesisKullanilan)
                  const tesisDolu = tesisToplamM2 > 0 ? Math.round((tesisKullanilan / tesisToplamM2) * 100) : 0

                  return (
                    <div key={t.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{t.ad}</span>
                          <span className="text-xs text-gray-400">{t.sehir}</span>
                          {t.tur_kodu && <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t.tur_kodu}</span>}
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          <span className="font-medium text-gray-700">{tesisKullanilan.toLocaleString('tr-TR')} m²</span>
                          {' '} dolu ·
                          <span className={`font-medium ml-1 ${tesisBos > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {tesisBos.toLocaleString('tr-TR')} m²
                          </span>
                          {' '} boş
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${tesisDolu >= 80 ? 'bg-green-500' : tesisDolu >= 50 ? 'bg-amber-500' : tesisToplamM2 === 0 ? 'bg-gray-200' : 'bg-red-400'}`}
                          style={{ width: `${tesisDolu}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">%{tesisDolu} dolu · {tesisKatlari.length} kat · {tesisToplamM2.toLocaleString('tr-TR')} m² toplam</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Proje pipeline */}
          {projeler.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Proje Pipeline</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ['Teklif', projeOzet.teklif, 'text-gray-600'],
                  ['Sözleşme', projeOzet.sozlesme, 'text-blue-600'],
                  ['Operasyon', projeOzet.operasyon, 'text-green-600'],
                  ['Tamamlandı', projeOzet.tamamlandi, 'text-teal-600'],
                ].map(([label, sayi, renk]) => (
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-semibold ${renk}`}>{sayi}</div>
                    <div className="text-xs text-gray-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sozlesmesizProjeler.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-amber-700 font-medium text-sm">⚠️ {sozlesmesizProjeler.length} sözleşmesiz aktif proje</span>
              <div className="flex flex-wrap gap-2">
                {sozlesmesizProjeler.map((p, i) => (
                  <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.ad} — {p.bilgi}</span>
                ))}
              </div>
            </div>
          )}

          {/* Uyarılar */}
          {belgeSuresiUyarilari.length > 0 && (
            <div className="mb-4">
              <UyariKart
                baslik="🏛️ Ruhsat / İtfaiye / ÇED Bitiş"
                items={belgeSuresiUyarilari}
                renk="border-purple-200 bg-purple-50 text-purple-800"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <UyariKart
              baslik="⚠️ Sözleşme Bitiş"
              items={sozlesmeUyarilari}
              renk="border-amber-200 bg-amber-50 text-amber-800"
            />
            <UyariKart
              baslik="🔑 Mal Sahibi Kira Bitiş"
              items={malSahibiUyarilari}
              renk="border-orange-200 bg-orange-50 text-orange-800"
            />
            <UyariKart
              baslik="🏆 İhale Son Başvuru"
              items={ihaleUyarilari}
              renk="border-red-200 bg-red-50 text-red-800"
            />
            <UyariKart
              baslik="🏗️ MHE Kira Bitiş"
              items={mheUyarilari}
              renk="border-violet-200 bg-violet-50 text-violet-800"
            />
          </div>
        </>
      )}
    </div>
  )
}
