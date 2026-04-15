import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { db, auth } from '../firebase'

const ISLEM_RENK = {
  ekle: 'bg-green-50 text-green-700',
  guncelle: 'bg-blue-50 text-blue-700',
  sil: 'bg-red-50 text-red-600',
}
const ISLEM_LABEL = { ekle: '+ Eklendi', guncelle: '✎ Güncellendi', sil: '✕ Silindi' }

const MODULLER = [
  'tesisler', 'katlar', 'musteriler', 'sozlesmeler', 'projeler',
  'ihaleler', 'grup_sirketleri', 'kullanicilar', 'taseronlar',
  'rotalar', 'anketler', 'mhe_ekipmanlar', 'mhe_atamalari',
  'tasinma_planlari', 'mal_sahibi_sozlesmeleri',
]

const MODUL_LABEL = {
  tesisler: 'Tesisler', katlar: 'Katlar', musteriler: 'Müşteriler',
  sozlesmeler: 'Sözleşmeler', projeler: 'Projeler', ihaleler: 'İhaleler',
  grup_sirketleri: 'Grup Şirketleri', kullanicilar: 'Kullanıcılar',
  taseronlar: 'Taşeronlar', rotalar: 'Rotalar', anketler: 'Anketler',
  mhe_ekipmanlar: 'MHE', mhe_atamalari: 'MHE Atama',
  tasinma_planlari: 'Taşınma Planı', mal_sahibi_sozlesmeleri: 'Mal Sahibi Sözleşmesi',
}

function zaman(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLog() {
  const [kayitlar, setKayitlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modulFiltre, setModulFiltre] = useState('')
  const [islemFiltre, setIslemFiltre] = useState('')
  const [aramaFiltre, setAramaFiltre] = useState('')
  const [limit_, setLimit_] = useState(100)

  const tenantId = auth.currentUser?.email?.split('@')[1] || 'default'

  const yukle = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'audit_logs'),
          where('tenant_id', '==', tenantId),
          limit(500)
        )
      )
      setKayitlar(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.tarih_ts || 0) - (a.tarih_ts || 0)))
    } catch (e) {
      console.error('Audit log yüklenemedi:', e)
    }
    setLoading(false)
  }

  useEffect(() => { yukle() }, [])

  const filtreli = kayitlar.filter(k =>
    (!modulFiltre || k.modul === modulFiltre) &&
    (!islemFiltre || k.islem === islemFiltre) &&
    (!aramaFiltre ||
      k.kayit_ad?.toLowerCase().includes(aramaFiltre.toLowerCase()) ||
      k.kullanici_email?.toLowerCase().includes(aramaFiltre.toLowerCase()) ||
      k.modul_label?.toLowerCase().includes(aramaFiltre.toLowerCase())
    )
  ).slice(0, limit_)

  // İstatistikler
  const bugun = new Date().toISOString().slice(0, 10)
  const bugunSayisi = kayitlar.filter(k => k.tarih?.startsWith(bugun)).length
  const silmeSayisi = kayitlar.filter(k => k.islem === 'sil').length
  const eklemeSayisi = kayitlar.filter(k => k.islem === 'ekle').length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {kayitlar.length} kayıt · Bugün {bugunSayisi} işlem
          </p>
        </div>
        <button onClick={yukle} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ↻ Yenile
        </button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-green-600">{eklemeSayisi}</div>
          <div className="text-xs text-gray-400 mt-1">Toplam Ekleme</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-blue-600">
            {kayitlar.filter(k => k.islem === 'guncelle').length}
          </div>
          <div className="text-xs text-gray-400 mt-1">Toplam Güncelleme</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-semibold text-red-500">{silmeSayisi}</div>
          <div className="text-xs text-gray-400 mt-1">Toplam Silme</div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input value={aramaFiltre} onChange={e => setAramaFiltre(e.target.value)}
          placeholder="Kayıt adı, kullanıcı, modül..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-56" />
        <select value={modulFiltre} onChange={e => setModulFiltre(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
          <option value="">Tüm Modüller</option>
          {MODULLER.map(m => <option key={m} value={m}>{MODUL_LABEL[m] || m}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['', 'Hepsi'], ['ekle', 'Ekleme'], ['guncelle', 'Güncelleme'], ['sil', 'Silme']].map(([val, label]) => (
            <button key={val} onClick={() => setIslemFiltre(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${islemFiltre === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filtreli.length} sonuç</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yükleniyor...</div>
      ) : kayitlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-gray-300 text-4xl mb-3">📋</div>
          <div className="text-sm text-gray-500">Henüz audit log kaydı yok.</div>
          <div className="text-xs text-gray-400 mt-1">İşlemler yapıldıkça burada görünecek.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Zaman</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">İşlem</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Modül</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Kayıt</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((k, i) => (
                <tr key={k.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === filtreli.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{zaman(k.tarih)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ISLEM_RENK[k.islem] || 'bg-gray-100 text-gray-600'}`}>
                      {ISLEM_LABEL[k.islem] || k.islem}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">{k.modul_label || k.modul}</td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-gray-700">{k.kayit_ad || '—'}</div>
                    {k.kayit_id && <code className="text-xs text-gray-300 font-mono">{k.kayit_id.slice(0, 8)}…</code>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{k.kullanici_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {kayitlar.length > limit_ && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button onClick={() => setLimit_(l => l + 100)}
                className="text-xs text-blue-600 hover:text-blue-800">
                Daha fazla göster ({kayitlar.length - limit_} kayıt daha)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
