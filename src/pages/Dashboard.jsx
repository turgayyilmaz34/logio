import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'

function MetrikKart({ label, value, sub, renk }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-semibold ${renk || 'text-gray-800'}`}>{value}</div>
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
    ihaleler: [], musteriler: [], malSahibiSozlesmeleri: []
  })

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = (col) => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [t, k, s, p, i, m, ms] = await Promise.all([
        q('tesisler'), q('katlar'), q('sozlesmeler'),
        q('projeler'), q('ihaleler'), q('musteriler'),
        q('mal_sahibi_sozlesmeleri')
      ])
      setVeri({
        tesisler: t.docs.map(d => ({ id: d.id, ...d.data() })),
        katlar: k.docs.map(d => ({ id: d.id, ...d.data() })),
        sozlesmeler: s.docs.map(d => ({ id: d.id, ...d.data() })),
        projeler: p.docs.map(d => ({ id: d.id, ...d.data() })),
        ihaleler: i.docs.map(d => ({ id: d.id, ...d.data() })),
        musteriler: m.docs.map(d => ({ id: d.id, ...d.data() })),
        malSahibiSozlesmeleri: ms.docs.map(d => ({ id: d.id, ...d.data() })),
      })
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return (
    <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>
  )

  const { tesisler, katlar, sozlesmeler, projeler, ihaleler, musteriler, malSahibiSozlesmeleri } = veri

  // --- Kapasite hesapları ---
  const toplamKullanilabilirM2 = katlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0) + (k.asmakat_var ? k.asmakat_m2 || 0 : 0), 0)

  // Aktif projelerin bağlantılarını almak için proje_kat_baginlantilari lazım
  // Şimdilik basit: aktif projelerin toplam m2'sini projelerden alamayız direkt
  // Dashboard'da tesisler ve katlar özeti gösterelim

  // --- Sözleşme bitiş uyarıları (90 gün içinde) ---
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

  // --- Mal sahibi sözleşme uyarıları ---
  const malSahibiUyarilari = malSahibiSozlesmeleri
    .filter(s => s.bitis)
    .map(s => ({ ...s, kalan: gunKaldi(s.bitis) }))
    .filter(s => s.kalan !== null && s.kalan <= (s.yenileme_uyari_gun || 90))
    .sort((a, b) => a.kalan - b.kalan)
    .map(s => ({
      ad: s.mal_sahibi_adi || '—',
      bilgi: s.kalan < 0 ? `${Math.abs(s.kalan)} gün geçti!` : `${s.kalan} gün kaldı`
    }))

  // --- İhale son başvuru uyarıları ---
  const ihaleUyarilari = ihaleler
    .filter(i => ['hazirlik', 'gonderildi', 'bekleniyor'].includes(i.durum) && i.son_basvuru)
    .map(i => ({ ...i, kalan: gunKaldi(i.son_basvuru) }))
    .filter(i => i.kalan !== null && i.kalan <= 14)
    .sort((a, b) => a.kalan - b.kalan)
    .map(i => ({
      ad: i.ad || '—',
      bilgi: i.kalan < 0 ? 'Geçti!' : i.kalan === 0 ? 'Bugün!' : `${i.kalan} gün`
    }))

  // --- Proje pipeline ---
  const projeOzet = {
    teklif: projeler.filter(p => p.durum === 'teklif').length,
    sozlesme: projeler.filter(p => p.durum === 'sozlesme').length,
    operasyon: projeler.filter(p => p.durum === 'operasyon').length,
    tamamlandi: projeler.filter(p => p.durum === 'tamamlandi').length,
  }

  // --- İhale pipeline ---
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
              label="Tesisler"
              value={tesisler.length}
              sub={`${katlar.length} kat tanımlı`}
            />
            <MetrikKart
              label="Toplam Kullanılabilir Alan"
              value={toplamKullanilabilirM2 > 0 ? `${toplamKullanilabilirM2.toLocaleString('tr-TR')} m²` : '—'}
              sub="Tüm katların toplamı"
            />
            <MetrikKart
              label="Aktif Müşteriler"
              value={musteriler.length}
              sub={`${sozlesmeler.filter(s => s.durum === 'aktif').length} aktif sözleşme`}
            />
            <MetrikKart
              label="Aktif İhaleler"
              value={ihaleOzet.aktif}
              sub={kazanmaOrani !== null ? `%${kazanmaOrani} kazan oranı` : 'Henüz sonuç yok'}
              renk={ihaleOzet.aktif > 0 ? 'text-amber-600' : 'text-gray-800'}
            />
          </div>

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

          {/* Tesis özeti */}
          {tesisler.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Tesisler</div>
              <div className="space-y-2">
                {tesisler.map(t => {
                  const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
                  const toplamM2 = tesisKatlari.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-gray-700">{t.ad}</span>
                        <span className="text-xs text-gray-400 ml-2">{t.sehir}</span>
                        {t.tesis_tipi_primary && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2">{t.tesis_tipi_primary}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                          {toplamM2 > 0 ? `${toplamM2.toLocaleString('tr-TR')} m²` : '—'}
                        </div>
                        <div className="text-xs text-gray-400">{tesisKatlari.length} kat</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Uyarılar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UyariKart
              baslik="⚠️ Sözleşme Bitiş Uyarısı"
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
          </div>
        </>
      )}
    </div>
  )
}
