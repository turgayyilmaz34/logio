import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore'
import { exportMultiSheet } from '../utils/exportExcel'
import { db, auth } from '../firebase'

// Sabit uyumluluk matrisi — kullanıcı bu kuralları yönetir
const UYUMLULUK_RENK = {
  uyumlu: 'bg-green-100 text-green-700',
  dikkat: 'bg-amber-100 text-amber-700',
  uyumsuz: 'bg-red-100 text-red-700',
}

const DEFAULT_KURALLAR = [
  { a: 'Otomotiv', b: 'Beyaz Eşya', durum: 'uyumlu' },
  { a: 'Otomotiv', b: 'Tekstil', durum: 'uyumlu' },
  { a: 'Otomotiv', b: 'Elektronik', durum: 'uyumlu' },
  { a: 'Gıda — Kuru', b: 'Kozmetik', durum: 'dikkat' },
  { a: 'Gıda — Kuru', b: 'Gıda — Soğuk', durum: 'uyumlu' },
  { a: 'Gıda — Kuru', b: 'İlaç', durum: 'dikkat' },
  { a: 'Gıda — Kuru', b: 'Kimyasal', durum: 'uyumsuz' },
  { a: 'Gıda — Kuru', b: 'Tehlikeli Madde', durum: 'uyumsuz' },
  { a: 'Gıda — Kuru', b: 'Otomotiv', durum: 'dikkat' },
  { a: 'Gıda — Kuru', b: 'Lastik', durum: 'uyumsuz' },
  { a: 'İlaç', b: 'Kimyasal', durum: 'uyumsuz' },
  { a: 'Tehlikeli Madde', b: 'Tekstil', durum: 'uyumsuz' },
  { a: 'Tehlikeli Madde', b: 'Lastik', durum: 'dikkat' },
]

function uyumlulukKontrol(urunTipA, urunTipB, kurallar) {
  if (!urunTipA || !urunTipB || urunTipA === urunTipB) return null
  const kural = kurallar.find(k =>
    (k.a === urunTipA && k.b === urunTipB) ||
    (k.a === urunTipB && k.b === urunTipA)
  )
  return kural?.durum || null
}

function ProjeKart({ proje, musteriAd, sozlesmeAd, onDragStart, uyarilar }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, proje)}
      className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 truncate">{proje.ad}</div>
          <div className="text-xs text-gray-400 truncate">{musteriAd}</div>
          {proje.alan_tipleri?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {proje.alan_tipleri.slice(0, 2).map(t => (
                <span key={t} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}
        </div>
        {uyarilar?.length > 0 && (
          <span className="text-amber-500 text-sm shrink-0" title={uyarilar.join(', ')}>⚠️</span>
        )}
      </div>
    </div>
  )
}

function TesisKolonu({ tesis, katlar, projelerBurada, tumProjeler, musteriler, sozlesmeler, kurallar, onDrop, onDragOver, onDragLeave, dragOver }) {
  const toplamM2 = katlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0), 0)

  const musteriAd = (sozId) => {
    const soz = sozlesmeler.find(s => s.id === sozId)
    return musteriler.find(m => m.id === soz?.musteri_id)?.ad || '—'
  }

  // Uyumluluk uyarıları
  const getUyarilar = (proje) => {
    const uyarilar = []
    projelerBurada.forEach(diger => {
      if (diger.id === proje.id) return
      const urunA = proje.alan_tipleri?.[0]
      const urunB = diger.alan_tipleri?.[0]
      const durum = uyumlulukKontrol(urunA, urunB, kurallar)
      if (durum === 'uyumsuz') uyarilar.push(`${diger.ad} ile uyumsuz!`)
      if (durum === 'dikkat') uyarilar.push(`${diger.ad} ile dikkatli ol`)
    })
    return uyarilar
  }

  return (
    <div
      className={`flex-1 min-w-64 max-w-80 rounded-xl border-2 transition-all ${dragOver === tesis.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
      onDrop={e => onDrop(e, tesis.id)}
      onDragOver={e => onDragOver(e, tesis.id)}
      onDragLeave={onDragLeave}
    >
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="font-medium text-gray-800 text-sm">{tesis.ad}</div>
        <div className="text-xs text-gray-400 mt-0.5">{tesis.sehir} · {toplamM2.toLocaleString('tr-TR')} m²</div>
        <div className="text-xs text-gray-500 mt-1">
          {projelerBurada.length} proje
          {projelerBurada.length > 0 && (
            <span className="ml-2">
              {projelerBurada.reduce((acc, p) => {
                const kat = katlar.find(k => k.id === p._kat_id)
                return acc + (kat?.kullanilabilir_m2 || 0)
              }, 0).toLocaleString()} m² planlı
            </span>
          )}
        </div>
      </div>
      <div className="p-3 space-y-2 min-h-32">
        {projelerBurada.map(p => (
          <ProjeKart
            key={p.id}
            proje={p}
            musteriAd={musteriAd(p.sozlesme_id)}
            uyarilar={getUyarilar(p)}
            onDragStart={(e, proje) => e.dataTransfer.setData('projeId', proje.id)}
          />
        ))}
        {dragOver === tesis.id && (
          <div className="border-2 border-dashed border-blue-300 rounded-lg h-12 flex items-center justify-center text-xs text-blue-400">
            Buraya bırak
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasinmaPlani() {
  const [planlar, setPlanlar] = useState([])
  const [aktifPlan, setAktifPlan] = useState(null)
  const [projeler, setProjeler] = useState([])
  const [tesisler, setTesisler] = useState([])
  const [katlar, setKatlar] = useState([])
  const [musteriler, setMusteriler] = useState([])
  const [sozlesmeler, setSozlesmeler] = useState([])
  const [kurallar, setKurallar] = useState(DEFAULT_KURALLAR)
  const [yerlesim, setYerlesim] = useState({}) // { projeId: tesisId }
  const [dragOver, setDragOver] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifSekme, setAktifSekme] = useState('plan') // plan | kurallar
  const [yeniPlanAd, setYeniPlanAd] = useState('')
  const [planModalAcik, setPlanModalAcik] = useState(false)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setYukleniyor(true)
    const q = col => getDocs(query(collection(db, col), where('tenant_id', '==', tenantId)))
    const [plSnap, prSnap, tSnap, kSnap, mSnap, sSnap] = await Promise.all([
      getDocs(query(collection(db, 'tasinma_planlari'), where('tenant_id', '==', tenantId))),
      q('projeler'), q('tesisler'), q('katlar'), q('musteriler'), q('sozlesmeler')
    ])
    setPlanlar(plSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setProjeler(prSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => ['teklif','sozlesme','operasyon'].includes(p.durum)))
    setTesisler(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setKatlar(kSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMusteriler(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSozlesmeler(sSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const yeniPlanOlustur = async () => {
    if (!yeniPlanAd.trim()) return alert('Plan adı zorunludur.')
    const ref = await addDoc(collection(db, 'tasinma_planlari'), {
      ad: yeniPlanAd, tenant_id: tenantId,
      durum: 'taslak', olusturma: new Date().toISOString(),
      yerlesim: {}
    })
    setPlanModalAcik(false)
    setYeniPlanAd('')
    await yukle()
    // Yeni planı seç
    setAktifPlan({ id: ref.id, ad: yeniPlanAd, yerlesim: {}, durum: 'taslak' })
    setYerlesim({})
  }

  const planSec = (plan) => {
    setAktifPlan(plan)
    setYerlesim(plan.yerlesim || {})
  }

  const yerlesimKaydet = async () => {
    if (!aktifPlan) return
    await updateDoc(doc(db, 'tasinma_planlari', aktifPlan.id), { yerlesim })
    alert('Plan kaydedildi.')
  }

  const planSil = async (id) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'tasinma_planlari', id))
    if (aktifPlan?.id === id) { setAktifPlan(null); setYerlesim({}) }
    yukle()
  }

  const handleDrop = (e, tesisId) => {
    e.preventDefault()
    const projeId = e.dataTransfer.getData('projeId')
    if (!projeId) return
    setYerlesim(prev => ({ ...prev, [projeId]: tesisId }))
    setDragOver(null)
  }

  const handleDragOver = (e, tesisId) => {
    e.preventDefault()
    setDragOver(tesisId)
  }

  const projelerTesiste = (tesisId) =>
    projeler.filter(p => yerlesim[p.id] === tesisId)

  const atanmamisProjeler = projeler.filter(p => !yerlesim[p.id])

  const musteriAd = (sozId) => {
    const soz = sozlesmeler.find(s => s.id === sozId)
    return musteriler.find(m => m.id === soz?.musteri_id)?.ad || '—'
  }

  // Kural yönetimi
  const URUN_TIPLERI = ['Otomotiv', 'Gıda — Kuru', 'Gıda — Soğuk', 'İlaç', 'Kozmetik', 'Kimyasal', 'Tehlikeli Madde', 'Elektronik', 'Tekstil', 'Lastik', 'Beyaz Eşya', 'Mobilya']

  const kuralEkle = (a, b, durum) => {
    setKurallar(prev => {
      const filtered = prev.filter(k => !((k.a === a && k.b === b) || (k.a === b && k.b === a)))
      return [...filtered, { a, b, durum }]
    })
  }

  const [kuralForm, setKuralForm] = useState({ a: '', b: '', durum: 'uyumlu' })


  const handleExport = () => {
    if (!aktifPlan) return alert('Önce bir plan seçin.')
    const musteriAd_ = (sozId) => {
      const soz = sozlesmeler.find(s => s.id === sozId)
      return musteriler.find(m => m.id === soz?.musteri_id)?.ad || '—'
    }
    const planData = projeler.map(p => ({
      'Proje': p.ad || '',
      'Müşteri': musteriAd_(p.sozlesme_id),
      'Proje Durumu': p.durum || '',
      'Atanan Tesis': tesisler.find(t => t.id === yerlesim[p.id])?.ad || 'Atanmamış',
      'Tesis Şehir': tesisler.find(t => t.id === yerlesim[p.id])?.sehir || '',
      'Alan Tipleri': (p.alan_tipleri || []).join(', '),
    }))

    const uyumData = []
    projeler.forEach(p => {
      const pTesis = yerlesim[p.id]
      if (!pTesis) return
      projeler.forEach(diger => {
        if (diger.id <= p.id) return
        if (yerlesim[diger.id] !== pTesis) return
        const durum = uyumlulukKontrol(p.alan_tipleri?.[0], diger.alan_tipleri?.[0], kurallar)
        if (!durum) return
        uyumData.push({
          'Tesis': tesisler.find(t => t.id === pTesis)?.ad || '',
          'Proje A': p.ad, 'Proje B': diger.ad,
          'Uyumluluk': durum === 'uyumlu' ? '✓ Uyumlu' : durum === 'dikkat' ? '⚠ Dikkat' : '✕ Uyumsuz',
        })
      })
    })

    exportMultiSheet([
      { name: aktifPlan.ad, data: planData },
      { name: 'Uyumluluk Kontrol', data: uyumData },
    ], `tasinma_${aktifPlan.ad.replace(/\s/g, '_')}`)
  }

  if (yukleniyor) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Taşınma Planı</h1>
          <p className="text-sm text-gray-400 mt-0.5">Projeleri tesisler arasında sürükle-bırak ile yerleştir</p>
        </div>
        <div className="flex items-center gap-3">
          {aktifPlan && (
            <button onClick={yerlesimKaydet}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              💾 Kaydet
            </button>
          )}
          {aktifPlan && (
            <button onClick={handleExport}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              ↓ Excel
            </button>
          )}
          <button onClick={() => setPlanModalAcik(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
            + Yeni Plan
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[['plan', 'Yerleştirme'], ['kurallar', 'Uyumluluk Kuralları']].map(([id, label]) => (
          <button key={id} onClick={() => setAktifSekme(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${aktifSekme === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {aktifSekme === 'plan' && (
        <div>
          {/* Plan seçimi */}
          {planlar.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {planlar.map(plan => (
                <div key={plan.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${aktifPlan?.id === plan.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => planSec(plan)}>
                  <span>{plan.ad}</span>
                  <button onClick={e => { e.stopPropagation(); planSil(plan.id) }}
                    className={`text-xs ${aktifPlan?.id === plan.id ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}>×</button>
                </div>
              ))}
            </div>
          )}

          {!aktifPlan ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="text-gray-300 text-4xl mb-3">📋</div>
              <div className="text-sm font-medium text-gray-500">Plan seçin veya yeni plan oluşturun</div>
              <button onClick={() => setPlanModalAcik(true)}
                className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
                + Yeni Plan Oluştur
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {/* Atanmamış projeler */}
              <div className="flex-shrink-0 w-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200"
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('projeId'); setYerlesim(prev => { const n = { ...prev }; delete n[id]; return n }); setDragOver(null) }}
                onDragOver={e => { e.preventDefault(); setDragOver('unassigned') }}
                onDragLeave={() => setDragOver(null)}>
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="font-medium text-gray-600 text-sm">Atanmamış Projeler</div>
                  <div className="text-xs text-gray-400">{atanmamisProjeler.length} proje</div>
                </div>
                <div className="p-3 space-y-2 min-h-32">
                  {atanmamisProjeler.map(p => (
                    <ProjeKart key={p.id} proje={p} musteriAd={musteriAd(p.sozlesme_id)} uyarilar={[]}
                      onDragStart={(e, proje) => e.dataTransfer.setData('projeId', proje.id)} />
                  ))}
                </div>
              </div>

              {/* Tesis kolonları */}
              {tesisler.map(t => (
                <TesisKolonu
                  key={t.id}
                  tesis={t}
                  katlar={katlar.filter(k => k.tesis_id === t.id)}
                  projelerBurada={projelerTesiste(t.id)}
                  tumProjeler={projeler}
                  musteriler={musteriler}
                  sozlesmeler={sozlesmeler}
                  kurallar={kurallar}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragOver(null)}
                  dragOver={dragOver}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {aktifSekme === 'kurallar' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Yeni Kural Ekle</div>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ürün A</label>
                <select value={kuralForm.a} onChange={e => setKuralForm(f => ({ ...f, a: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin...</option>
                  {URUN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ürün B</label>
                <select value={kuralForm.b} onChange={e => setKuralForm(f => ({ ...f, b: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin...</option>
                  {URUN_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Uyumluluk</label>
                <div className="flex gap-1">
                  {[['uyumlu', '✅ Uyumlu'], ['dikkat', '⚠️ Dikkat'], ['uyumsuz', '❌ Uyumsuz']].map(([val, label]) => (
                    <button key={val} onClick={() => setKuralForm(f => ({ ...f, durum: val }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border ${kuralForm.durum === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { if (kuralForm.a && kuralForm.b) { kuralEkle(kuralForm.a, kuralForm.b, kuralForm.durum); setKuralForm({ a: '', b: '', durum: 'uyumlu' }) } }}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800">
                Ekle
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tanımlı Kurallar ({kurallar.length})</div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-2 text-xs text-gray-400">Ürün A</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-400">Ürün B</th>
                  <th className="text-left px-5 py-2 text-xs text-gray-400">Durum</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {kurallar.map((k, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-sm text-gray-700">{k.a}</td>
                    <td className="px-5 py-2.5 text-sm text-gray-700">{k.b}</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${UYUMLULUK_RENK[k.durum]}`}>
                        {k.durum === 'uyumlu' ? '✅ Uyumlu' : k.durum === 'dikkat' ? '⚠️ Dikkat' : '❌ Uyumsuz'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <button onClick={() => setKurallar(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-red-400 hover:text-red-600">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {planModalAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Yeni Taşınma Planı</h2>
              <button onClick={() => setPlanModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan Adı *</label>
              <input value={yeniPlanAd} onChange={e => setYeniPlanAd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="Q3 2026 Taşınma Planı v1" autoFocus />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setPlanModalAcik(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
              <button onClick={yeniPlanOlustur} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
