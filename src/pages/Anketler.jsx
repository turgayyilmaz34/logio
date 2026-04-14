
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore'
import { db, auth } from '../firebase'

const NPS_RENK = (n) => n >= 9 ? 'bg-green-50 text-green-700' : n >= 7 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
const NPS_ETIKET = (n) => n >= 9 ? 'Promoter' : n >= 7 ? 'Pasif' : 'Detractor'

function NpsBadge({ skor }) {
  if (skor === null || skor === undefined) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NPS_RENK(skor)}`}>
      {skor} · {NPS_ETIKET(skor)}
    </span>
  )
}

function CsatYildiz({ skor }) {
  if (!skor) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className="text-xs text-amber-500">
      {'★'.repeat(skor)}{'☆'.repeat(5 - skor)}
    </span>
  )
}

export default function Anketler() {
  const [anketler, setAnketler] = useState([])
  const [cevaplar, setCevaplar] = useState([])
  const [musteriler, setMusteriler] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktifTab, setAktifTab] = useState('liste')
  const [yeniAcik, setYeniAcik] = useState(false)
  const [form, setForm] = useState({ musteri_id: '', konu: '', dil: 'tr' })
  const [kopyalandi, setKopyalandi] = useState(null)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'
  const siteUrl = window.location.origin

  const yukle = async () => {
    setLoading(true)
    const [aSnap, cSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, 'anketler'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'anket_cevaplari'), where('tenant_id', '==', tenantId))),
      getDocs(query(collection(db, 'musteriler'), where('tenant_id', '==', tenantId))),
    ])
    setAnketler(aSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setCevaplar(cSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMusteriler(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const musteriAd = (id) => musteriler.find(m => m.id === id)?.ad || '—'

  const anketCevabi = (anketId) => cevaplar.find(c => c.anket_id === anketId)

  const yeniAnketOlustur = async () => {
    if (!form.musteri_id) return alert('Müşteri seçimi zorunludur.')
    const token = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await addDoc(collection(db, 'anketler'), {
      tenant_id: tenantId,
      musteri_id: form.musteri_id,
      konu: form.konu,
      dil: form.dil,
      token,
      olusturma_tarihi: new Date().toISOString(),
      durum: 'bekliyor',
    })
    setYeniAcik(false)
    setForm({ musteri_id: '', konu: '', dil: 'tr' })
    yukle()
  }

  const linkKopyala = (token, dil) => {
    const link = `${siteUrl}/anket/${token}?lang=${dil}`
    navigator.clipboard.writeText(link)
    setKopyalandi(token)
    setTimeout(() => setKopyalandi(null), 2000)
  }

  // Dashboard hesapları
  const doluCevaplar = cevaplar.filter(c => c.nps !== undefined && c.nps !== null)
  const npsOrtalama = doluCevaplar.length > 0
    ? Math.round(doluCevaplar.reduce((acc, c) => acc + c.nps, 0) / doluCevaplar.length * 10) / 10
    : null
  const csatOrtalama = doluCevaplar.filter(c => c.csat).length > 0
    ? Math.round(doluCevaplar.filter(c => c.csat).reduce((acc, c) => acc + c.csat, 0) / doluCevaplar.filter(c => c.csat).length * 10) / 10
    : null

  const promoter = doluCevaplar.filter(c => c.nps >= 9).length
  const pasif = doluCevaplar.filter(c => c.nps >= 7 && c.nps < 9).length
  const detractor = doluCevaplar.filter(c => c.nps < 7).length
  const npsScore = doluCevaplar.length > 0
    ? Math.round((promoter - detractor) / doluCevaplar.length * 100)
    : null

  // Müşteri bazında skor
  const musteriSkor = musteriler.map(m => {
    const mCevaplar = doluCevaplar.filter(c => {
      const anket = anketler.find(a => a.id === c.anket_id)
      return anket?.musteri_id === m.id
    })
    if (mCevaplar.length === 0) return null
    const npsOrt = Math.round(mCevaplar.reduce((acc, c) => acc + c.nps, 0) / mCevaplar.length * 10) / 10
    const csatOrt = mCevaplar.filter(c => c.csat).length > 0
      ? Math.round(mCevaplar.filter(c => c.csat).reduce((acc, c) => acc + c.csat, 0) / mCevaplar.filter(c => c.csat).length * 10) / 10
      : null
    return { musteri: m, nps: npsOrt, csat: csatOrt, sayi: mCevaplar.length }
  }).filter(Boolean).sort((a, b) => b.nps - a.nps)

  if (loading) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Anketler</h1>
          <p className="text-sm text-gray-400 mt-0.5">{anketler.length} anket · {doluCevaplar.length} yanıt</p>
        </div>
        <button onClick={() => setYeniAcik(true)}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          + Yeni Anket
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[['liste', 'Anket Listesi'], ['dashboard', 'Dashboard']].map(([id, label]) => (
          <button key={id} onClick={() => setAktifTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${aktifTab === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ANKET LİSTESİ */}
      {aktifTab === 'liste' && (
        <div>
          {anketler.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="text-gray-300 text-4xl mb-3">📋</div>
              <div className="text-sm font-medium text-gray-500">Henüz anket oluşturulmadı</div>
              <button onClick={() => setYeniAcik(true)}
                className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
                + İlk Anketi Oluştur
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Konu</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Dil</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Oluşturulma</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">NPS</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">CSAT</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {anketler.sort((a, b) => b.olusturma_tarihi?.localeCompare(a.olusturma_tarihi || '') || 0).map((a, i) => {
                    const cevap = anketCevabi(a.id)
                    return (
                      <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === anketler.length - 1 ? 'border-0' : ''}`}>
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{musteriAd(a.musteri_id)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{a.konu || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {a.dil === 'tr' ? 'TR' : 'EN'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400">
                          {a.olusturma_tarihi ? new Date(a.olusturma_tarihi).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          {cevap ? <NpsBadge skor={cevap.nps} /> : <span className="text-xs text-gray-300">Bekleniyor</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {cevap ? <CsatYildiz skor={cevap.csat} /> : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => linkKopyala(a.token, a.dil)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${kopyalandi === a.token ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {kopyalandi === a.token ? '✓ Kopyalandı' : 'Linki Kopyala'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD */}
      {aktifTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Özet metrikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">NPS Skoru</div>
              <div className={`text-3xl font-bold ${npsScore === null ? 'text-gray-300' : npsScore >= 30 ? 'text-green-600' : npsScore >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {npsScore !== null ? npsScore : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">Net Promoter Score</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Ortalama NPS</div>
              <div className="text-2xl font-semibold text-gray-800">{npsOrtalama !== null ? npsOrtalama : '—'}</div>
              <div className="text-xs text-gray-400 mt-1">{doluCevaplar.length} yanıt</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Ortalama CSAT</div>
              <div className="text-2xl font-semibold text-amber-500">{csatOrtalama !== null ? `${csatOrtalama}/5` : '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Müşteri memnuniyeti</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Yanıt Oranı</div>
              <div className="text-2xl font-semibold text-gray-800">
                {anketler.length > 0 ? `%${Math.round(doluCevaplar.length / anketler.length * 100)}` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">{anketler.length} gönderildi</div>
            </div>
          </div>

          {/* Promoter/Pasif/Detractor */}
          {doluCevaplar.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">NPS Dağılımı</div>
              <div className="flex gap-0 rounded-lg overflow-hidden h-8">
                {promoter > 0 && (
                  <div className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${promoter / doluCevaplar.length * 100}%` }}>
                    {promoter > 0 && `${Math.round(promoter / doluCevaplar.length * 100)}%`}
                  </div>
                )}
                {pasif > 0 && (
                  <div className="bg-amber-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${pasif / doluCevaplar.length * 100}%` }}>
                    {pasif > 0 && `${Math.round(pasif / doluCevaplar.length * 100)}%`}
                  </div>
                )}
                {detractor > 0 && (
                  <div className="bg-red-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${detractor / doluCevaplar.length * 100}%` }}>
                    {detractor > 0 && `${Math.round(detractor / doluCevaplar.length * 100)}%`}
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>Promoter ({promoter})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full inline-block"></span>Pasif ({pasif})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block"></span>Detractor ({detractor})</span>
              </div>
            </div>
          )}

          {/* Müşteri bazında skor */}
          {musteriSkor.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri Bazında</div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Müşteri</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ort. NPS</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ort. CSAT</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Yanıt</th>
                  </tr>
                </thead>
                <tbody>
                  {musteriSkor.map((m, i) => (
                    <tr key={m.musteri.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === musteriSkor.length - 1 ? 'border-0' : ''}`}>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{m.musteri.ad}</td>
                      <td className="px-5 py-3.5"><NpsBadge skor={m.nps} /></td>
                      <td className="px-5 py-3.5"><CsatYildiz skor={m.csat} /></td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{m.sayi} yanıt</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Son yorumlar */}
          {cevaplar.filter(c => c.yorum).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Son Yorumlar</div>
              <div className="space-y-3">
                {cevaplar.filter(c => c.yorum).slice(-5).reverse().map(c => {
                  const anket = anketler.find(a => a.id === c.anket_id)
                  return (
                    <div key={c.id} className="border-l-2 border-blue-200 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">{musteriAd(anket?.musteri_id)}</span>
                        <NpsBadge skor={c.nps} />
                        {c.csat && <CsatYildiz skor={c.csat} />}
                      </div>
                      <div className="text-sm text-gray-700 italic">"{c.yorum}"</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {doluCevaplar.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="text-gray-300 text-4xl mb-3">📊</div>
              <div className="text-sm font-medium text-gray-500">Henüz yanıt yok</div>
              <div className="text-xs text-gray-400 mt-1">Anket gönderin, yanıtlar burada görünecek</div>
            </div>
          )}
        </div>
      )}

      {/* Yeni Anket Modal */}
      {yeniAcik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Yeni Anket Oluştur</h2>
              <button onClick={() => setYeniAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri *</label>
                <select value={form.musteri_id} onChange={e => setForm(f => ({ ...f, musteri_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin...</option>
                  {musteriler.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Konu / Proje (opsiyonel)</label>
                <input value={form.konu} onChange={e => setForm(f => ({ ...f, konu: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Q1 2026 Depolama Hizmeti" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Anket Dili</label>
                <div className="flex gap-2">
                  {[['tr', '🇹🇷 Türkçe'], ['en', '🇬🇧 English']].map(([val, label]) => (
                    <button key={val} onClick={() => setForm(f => ({ ...f, dil: val }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.dil === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                Oluşturulduktan sonra link kopyalayıp müşteriye gönderebilirsiniz.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setYeniAcik(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
              <button onClick={yeniAnketOlustur} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
