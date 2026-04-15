
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'

function gunKaldi(tarih) {
  if (!tarih) return null
  return Math.ceil((new Date(tarih) - new Date()) / (1000 * 60 * 60 * 24))
}

function SkorHalka({ skor, renk, boyut = 80 }) {
  const r = boyut / 2 - 8
  const cevre = 2 * Math.PI * r
  const dolu = (skor / 100) * cevre
  return (
    <svg width={boyut} height={boyut} viewBox={`0 0 ${boyut} ${boyut}`}>
      <circle cx={boyut/2} cy={boyut/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8"/>
      <circle cx={boyut/2} cy={boyut/2} r={r} fill="none" stroke={renk} strokeWidth="8"
        strokeDasharray={`${dolu} ${cevre}`} strokeLinecap="round"
        transform={`rotate(-90 ${boyut/2} ${boyut/2})`}/>
      <text x={boyut/2} y={boyut/2 + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill={renk}>{skor}</text>
    </svg>
  )
}

function skorRenk(skor) {
  if (skor >= 75) return '#10b981'
  if (skor >= 50) return '#f59e0b'
  return '#ef4444'
}

function skorLabel(skor) {
  if (skor >= 75) return 'Sağlıklı'
  if (skor >= 50) return 'Dikkat'
  return 'Riskli'
}

export default function PortfoySaglikSkoru() {
  const [veri, setVeri] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  useEffect(() => {
    const yukle = async () => {
      const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
      const [tSnap, kSnap, sSnap, mSnap, msSnap, prSnap, pbSnap, anSnap, cSnap] = await Promise.all([
        q('tesisler'), q('katlar'), q('sozlesmeler'), q('musteriler'),
        q('mal_sahibi_sozlesmeleri'), q('projeler'), q('proje_kat_baginlantilari'),
        q('anketler'), q('anket_cevaplari'),
      ])
      const tesisler = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const katlar = kSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const sozlesmeler = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const musteriler = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const malSahibiSoz = msSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const projeler = prSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const baglantilar = pbSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const anketler = anSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const cevaplar = cSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const aktifIds = new Set(projeler.filter(p => ['operasyon','sozlesme'].includes(p.durum)).map(p => p.id))

      const tesisSkoru = tesisler.map(t => {
        const tesisKatlari = katlar.filter(k => k.tesis_id === t.id)
        const toplamM2 = tesisKatlari.reduce((a, k) => a + (k.kullanilabilir_m2 || 0), 0)
        const katIdSet = new Set(tesisKatlari.map(k => k.id))
        const kullanilanM2 = baglantilar
          .filter(b => aktifIds.has(b.proje_id) && katIdSet.has(b.kat_id))
          .reduce((a, b) => a + (b.kullanilan_m2 || 0), 0)
        const doluluk = toplamM2 > 0 ? kullanilanM2 / toplamM2 : 0

        // 1. Doluluk skoru (0-25)
        const dolulukSkor = Math.round(doluluk * 25)

        // 2. Sözleşme sağlığı — biten sözleşme yok mu? (0-25)
        const tesSoz = sozlesmeler.filter(s =>
          s.durum === 'aktif' && (s.dep_kat_ids || []).some(id => katIdSet.has(id))
        )
        const kritikBitis = tesSoz.filter(s => {
          const k = gunKaldi(s.bitis)
          return k !== null && k <= 60
        }).length
        const sozSkor = Math.max(0, 25 - kritikBitis * 8)

        // 3. Ruhsat/belge durumu (0-25)
        const ruhsatSeviye = t.ruhsat?.seviye ?? null
        const itfaiyeSeviye = t.itfaiye?.seviye ?? null
        const belgeSkor = ruhsatSeviye !== null && itfaiyeSeviye !== null
          ? Math.round(((ruhsatSeviye + itfaiyeSeviye) / 8) * 25)
          : 0

        // 4. Müşteri NPS skoru (0-25)
        const ilgiliMusteriler = [...new Set(tesSoz.map(s => s.musteri_id))]
        const musNPS = ilgiliMusteriler.map(mid => {
          const mAnket = anketler.filter(a => a.musteri_id === mid)
          const mCevap = cevaplar.filter(c => mAnket.some(a => a.id === c.anket_id) && c.nps !== undefined)
          if (mCevap.length === 0) return null
          return mCevap.reduce((a, c) => a + c.nps, 0) / mCevap.length
        }).filter(x => x !== null)
        const ortNPS = musNPS.length > 0 ? musNPS.reduce((a, b) => a + b, 0) / musNPS.length : null
        const npsSkor = ortNPS !== null ? Math.round((ortNPS / 10) * 25) : 12 // bilinmiyorsa orta

        const toplamSkor = Math.min(100, dolulukSkor + sozSkor + belgeSkor + npsSkor)

        return {
          tesis: t,
          toplamSkor,
          detay: {
            doluluk: { skor: dolulukSkor, max: 25, label: 'Doluluk', deger: `%${Math.round(doluluk * 100)}` },
            sozlesme: { skor: sozSkor, max: 25, label: 'Sözleşme', deger: kritikBitis > 0 ? `${kritikBitis} kritik` : 'Stabil' },
            belge: { skor: belgeSkor, max: 25, label: 'Ruhsat/Belge', deger: ruhsatSeviye !== null ? `${ruhsatSeviye}/4` : 'Girilmemiş' },
            nps: { skor: npsSkor, max: 25, label: 'Müşteri NPS', deger: ortNPS !== null ? ortNPS.toFixed(1) : 'Veri yok' },
          },
          toplamM2, kullanilanM2,
        }
      }).filter(t => t.toplamM2 > 0).sort((a, b) => a.toplamSkor - b.toplamSkor)

      setVeri(tesisSkoru)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  if (yukleniyor) return <div className="text-sm text-gray-400 py-8 text-center">Hesaplanıyor...</div>

  const portfoyOrt = veri.length > 0 ? Math.round(veri.reduce((a, t) => a + t.toplamSkor, 0) / veri.length) : 0

  return (
    <div className="space-y-6">
      {/* Portföy skoru */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center gap-8">
        <div className="text-center">
          <SkorHalka skor={portfoyOrt} renk={skorRenk(portfoyOrt)} boyut={100} />
          <div className="text-xs text-gray-400 mt-2">Portföy Skoru</div>
          <div className={`text-xs font-medium mt-0.5`} style={{ color: skorRenk(portfoyOrt) }}>{skorLabel(portfoyOrt)}</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600 mb-3">Skor 4 kriterden oluşur (her biri max 25 puan):</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>📊 Doluluk oranı (aktif proje m² / toplam m²)</div>
            <div>📋 Sözleşme sağlığı (60 gün içinde biten var mı?)</div>
            <div>🏛️ Ruhsat & belge seviyesi (0-4 skala)</div>
            <div>💬 Müşteri NPS ortalaması</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-green-600">{veri.filter(t => t.toplamSkor >= 75).length}</div>
            <div className="text-xs text-green-600">Sağlıklı</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-amber-600">{veri.filter(t => t.toplamSkor >= 50 && t.toplamSkor < 75).length}</div>
            <div className="text-xs text-amber-600">Dikkat</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-lg font-semibold text-red-600">{veri.filter(t => t.toplamSkor < 50).length}</div>
            <div className="text-xs text-red-600">Riskli</div>
          </div>
        </div>
      </div>

      {/* Tesis kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {veri.map(t => (
          <div key={t.tesis.id} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-medium text-gray-800">{t.tesis.ad}</div>
                <div className="text-xs text-gray-400">{t.tesis.sehir}</div>
              </div>
              <div className="flex items-center gap-3">
                <SkorHalka skor={t.toplamSkor} renk={skorRenk(t.toplamSkor)} boyut={60} />
                <div>
                  <div className="text-xs font-medium" style={{ color: skorRenk(t.toplamSkor) }}>{skorLabel(t.toplamSkor)}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.values(t.detay).map(d => (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="text-xs text-gray-500 w-28 shrink-0">{d.label}</div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(d.skor / d.max) * 100}%`, background: skorRenk((d.skor / d.max) * 100) }} />
                  </div>
                  <div className="text-xs text-gray-500 w-16 text-right">{d.deger}</div>
                  <div className="text-xs font-medium text-gray-400 w-8 text-right">{d.skor}/{d.max}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
