import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

const TESIS_TIPI_PRIMARY = [
  'Depo (CEVA Operasyon)', 'Cep Depo / Geçici Depolama', 'Aktarma Merkezi / Cross-dock',
  'Müşteri Deposu', 'Antrepo / Gümrüklü Saha', 'Tır Parkı / Açık Saha',
  'Ofis / İdari Bina', 'Fabrika', 'Liman / Rıhtım', 'Soğuk Zincir Hub'
]

const TESIS_TIPI_SECONDARY = [
  'Antrepo / Gümrüklü Saha', 'Ofis / İdari Alan', 'Tır Parkı / Açık Saha',
  'Transfer Noktası', 'Müşteri Deposu Alt Alanı', 'Cep Depo', 'Açık Saha'
]

const OPERATOR_ROLU_PRIMARY = [
  'Kiracı', 'İşletmeci', 'Hizmet Sağlayıcı', 'Malik', 'Karma'
]

const OPERATOR_ROLU_SECONDARY_ONERILER = [
  'Yangın bakım CEVA\'da', 'Ruhsat müşteride', 'İtfaiye başvurusu CEVA',
  'ÇED proje sahibi malik', 'Ruhsat CEVA adına', 'Alt kiracı'
]

const OPERASYON_ETIKETLER = [
  'Askılı Ürün (GOH)', 'Yanıcı / Parlayıcı', 'Su Havzası / Hassas Alan',
  'Antrepo Adayı (TBD)', 'OSB İçinde', 'Ecrimisil Riski'
]

const RACI_SECENEKLER = [
  'CEVA İdari İşler', 'CEVA HSE', 'CEVA Legal', 'CEVA Operasyon',
  'Müşteri', 'Mal Sahibi / Malik', 'Diğer'
]

const SEVIYE_ACIKLAMALARI = {
  0: 'Yok / Bilinmiyor',
  1: 'Var ama geçersiz / süresi geçmiş',
  2: 'Süreçte (başvuru var)',
  3: 'Geçerli ve kapsam uyumlu',
  4: 'Geçerli + denetim döngüsü oturmuş'
}

const bos = {
  ad: '', sehir: '', adres: '', tur: 'kiralik',
  tesis_tipi_primary: '',
  tesis_tipi_secondary: [],
  operator_rolu_primary: '',
  operator_rolu_secondary: [],
  osb_ici: false,
  operasyon_etiketler: [],
  belge_sahipligi: { ruhsat_kimin: '', ced_proje_sahibi: '', itfaiye_basvuru: '' },
  ruhsat: { seviye: null, gecerlilik_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
  ced: { seviye: null, onay_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
  itfaiye: { seviye: null, gecerlilik_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
  raci: {
    ruhsat: { R: [], A: [], C: [], I: [] },
    itfaiye: { R: [], A: [], C: [], I: [] },
    ced: { R: [], A: [], C: [], I: [] },
  },
  kanit: { sozlesme_link: '', ruhsat_link: '', itfaiye_link: '', ced_link: '' },
  notlar: ''
}

function BelgeAlan({ label, deger, onChange }) {
  const handleDosya = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Dosya 2MB\'dan büyük. Lütfen harici link kullanın.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange({ ...deger, belge_base64: ev.target.result, belge_adi: file.name, belge_link: '' })
    }
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      {deger.belge_base64 ? (
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
          <span className="text-xs text-green-700 flex-1">{deger.belge_adi}</span>
          <button onClick={() => onChange({ ...deger, belge_base64: '', belge_adi: '' })} className="text-xs text-red-400">Kaldır</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 hover:border-gray-300 text-center">
            📎 Dosya Yükle (max 2MB)
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleDosya} />
          </label>
          <input
            value={deger.belge_link || ''}
            onChange={e => onChange({ ...deger, belge_link: e.target.value, belge_base64: '' })}
            placeholder="SharePoint / Drive linki"
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
      )}
    </div>
  )
}

function SeviyeSecici({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[0, 1, 2, 3, 4].map(s => (
        <button
          key={s}
          onClick={() => onChange(value === s ? null : s)}
          title={SEVIYE_ACIKLAMALARI[s]}
          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
            value === s
              ? s <= 1 ? 'bg-red-500 text-white border-red-500'
                : s === 2 ? 'bg-amber-500 text-white border-amber-500'
                : s === 3 ? 'bg-green-500 text-white border-green-500'
                : 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {s}
        </button>
      ))}
      {value !== null && value !== undefined && (
        <span className="text-xs text-gray-400 self-center ml-1">{SEVIYE_ACIKLAMALARI[value]}</span>
      )}
    </div>
  )
}

function RaciSatir({ konu, deger, onChange }) {
  const toggle = (rol, secenek) => {
    const mevcut = deger[rol] || []
    const yeni = mevcut.includes(secenek) ? mevcut.filter(x => x !== secenek) : [...mevcut, secenek]
    onChange({ ...deger, [rol]: yeni })
  }
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="text-xs font-medium text-gray-600 mb-2">{konu}</div>
      {['R', 'A', 'C', 'I'].map(rol => (
        <div key={rol} className="flex items-start gap-2 mb-1.5">
          <span className="text-xs font-bold text-gray-400 w-4 mt-1">{rol}</span>
          <div className="flex flex-wrap gap-1">
            {RACI_SECENEKLER.map(s => (
              <button
                key={s}
                onClick={() => toggle(rol, s)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  (deger[rol] || []).includes(s)
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TesisModal({ tesis, onKaydet, onKapat }) {
  const [form, setForm] = useState(tesis ? {
    ad: tesis.ad || '', sehir: tesis.sehir || '', adres: tesis.adres || '',
    tur: tesis.tur || 'kiralik',
    tesis_tipi_primary: tesis.tesis_tipi_primary || '',
    tesis_tipi_secondary: tesis.tesis_tipi_secondary || [],
    operator_rolu_primary: tesis.operator_rolu_primary || '',
    operator_rolu_secondary: tesis.operator_rolu_secondary || [],
    osb_ici: tesis.osb_ici || false,
    operasyon_etiketler: tesis.operasyon_etiketler || [],
    belge_sahipligi: tesis.belge_sahipligi || { ruhsat_kimin: '', ced_proje_sahibi: '', itfaiye_basvuru: '' },
    ruhsat: tesis.ruhsat || { seviye: null, gecerlilik_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
    ced: tesis.ced || { seviye: null, onay_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
    itfaiye: tesis.itfaiye || { seviye: null, gecerlilik_tarihi: '', belge_link: '', belge_base64: '', belge_adi: '' },
    raci: tesis.raci || { ruhsat: { R: [], A: [], C: [], I: [] }, itfaiye: { R: [], A: [], C: [], I: [] }, ced: { R: [], A: [], C: [], I: [] } },
    kanit: tesis.kanit || { sozlesme_link: '', ruhsat_link: '', itfaiye_link: '', ced_link: '' },
    notlar: tesis.notlar || ''
  } : { ...bos })

  const [aktifTab, setAktifTab] = useState('genel')
  const [yeniSecondaryRol, setYeniSecondaryRol] = useState('')

  const [grupSirketleri, setGrupSirketleri] = useState([])

  useEffect(() => {
    const yukle = async () => {
      const snap = await getDocs(collection(db, 'grup_sirketleri'))
      const hepsi = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Hiyerarşik sıralama: ana şirket + altındaki alt şirketler
      const sirali = []
      const analar = hepsi.filter(s => !s.parent_id).sort((a, b) => a.ad.localeCompare(b.ad))
      analar.forEach(ana => {
        sirali.push({ ...ana, _indent: false })
        hepsi.filter(s => s.parent_id === ana.id).sort((a, b) => a.ad.localeCompare(b.ad)).forEach(alt => {
          sirali.push({ ...alt, _indent: true, _parent_ad: ana.ad })
        })
      })
      // Ana şirkete bağlı olmayanlar da ekle
      hepsi.filter(s => s.parent_id && !analar.find(a => a.id === s.parent_id)).forEach(s => {
        sirali.push({ ...s, _indent: false })
      })
      setGrupSirketleri(sirali)
    }
    yukle()
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setNested = (key, subkey, val) => setForm(f => ({ ...f, [key]: { ...f[key], [subkey]: val } }))

  const toggleSecondary = (key, val) => setForm(f => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
  }))

  const handleKaydet = () => {
    if (!form.ad || !form.sehir) return alert('Ad ve şehir zorunludur.')
    onKaydet(form)
  }

  const tabs = [
    { id: 'genel', label: 'Genel' },
    { id: 'roller', label: 'Roller & Etiketler' },
    { id: 'uyum', label: 'Uyum & Belgeler' },
    { id: 'raci', label: 'RACI' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">{tesis ? 'Tesis Düzenle' : 'Yeni Tesis'}</h2>
            {tesis?.id && <code className="text-xs text-gray-300 font-mono">{tesis.id}</code>}
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAktifTab(t.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                aktifTab === t.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* GENEL */}
          {aktifTab === 'genel' && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg">
                Toplam m² kat tanımlamalarından otomatik hesaplanır.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tesis Adı *</label>
                <input value={form.ad} onChange={e => set('ad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="İzmir Depo A" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">TUR Kodu — Tesis Kodu (opsiyonel)</label>
                <input value={form.tur_kodu || ''} onChange={e => set('tur_kodu', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder="IST-001, IZM-DEP-A..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Şehir *</label>
                  <input value={form.sehir} onChange={e => set('sehir', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="İzmir" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İşleten / İmzalayan Şirket</label>
                <select value={form.isletici_sirket_id} onChange={e => set('isletici_sirket_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option value="">Seçin (opsiyonel)...</option>
                  {grupSirketleri.map(s => (
                    <option key={s.id} value={s.id} disabled={!s.parent_id && grupSirketleri.some(x => x.parent_id === s.id)}>
                      {s._indent ? `  └ ${s.ad}` : s.ad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tür</label>
                  <div className="flex gap-2">
                    {[['kiralik', 'Kiralık'], ['musteri_tesisi', 'Müşteri Tesisi']].map(([val, label]) => (
                      <button key={val} onClick={() => set('tur', val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          form.tur === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Adres</label>
                <input value={form.adres} onChange={e => set('adres', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="Mahalle, ilçe..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tesis Tipi (Primary)</label>
                  <select value={form.tesis_tipi_primary} onChange={e => set('tesis_tipi_primary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="">Seçin...</option>
                    {TESIS_TIPI_PRIMARY.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="osb" checked={form.osb_ici} onChange={e => set('osb_ici', e.target.checked)} className="rounded" />
                  <label htmlFor="osb" className="text-sm text-gray-600">OSB İçinde</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tesis Tipi (Secondary — çoklu)</label>
                <div className="flex flex-wrap gap-1.5">
                  {TESIS_TIPI_SECONDARY.map(t => (
                    <button key={t} onClick={() => toggleSecondary('tesis_tipi_secondary', t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.tesis_tipi_secondary.includes(t) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={form.notlar} onChange={e => set('notlar', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
          )}

          {/* ROLLER & ETİKETLER */}
          {aktifTab === 'roller' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Operatör Rolü (Primary)</label>
                <div className="flex flex-wrap gap-2">
                  {OPERATOR_ROLU_PRIMARY.map(r => (
                    <button key={r} onClick={() => set('operator_rolu_primary', r)}
                      className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        form.operator_rolu_primary === r ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Operatör Rolü (Secondary / Hibrit notlar)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {OPERATOR_ROLU_SECONDARY_ONERILER.map(r => (
                    <button key={r} onClick={() => toggleSecondary('operator_rolu_secondary', r)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.operator_rolu_secondary.includes(r) ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{r}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={yeniSecondaryRol} onChange={e => setYeniSecondaryRol(e.target.value)}
                    placeholder="Özel not ekle..."
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"
                    onKeyDown={e => { if (e.key === 'Enter' && yeniSecondaryRol.trim()) { toggleSecondary('operator_rolu_secondary', yeniSecondaryRol.trim()); setYeniSecondaryRol('') }}} />
                  <button onClick={() => { if (yeniSecondaryRol.trim()) { toggleSecondary('operator_rolu_secondary', yeniSecondaryRol.trim()); setYeniSecondaryRol('') }}}
                    className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">Ekle</button>
                </div>
                {form.operator_rolu_secondary.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.operator_rolu_secondary.map(r => (
                      <span key={r} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {r}
                        <button onClick={() => toggleSecondary('operator_rolu_secondary', r)} className="text-purple-400 hover:text-purple-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Operasyon Etiketleri</label>
                <div className="flex flex-wrap gap-1.5">
                  {OPERASYON_ETIKETLER.map(e => (
                    <button key={e} onClick={() => toggleSecondary('operasyon_etiketler', e)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.operasyon_etiketler.includes(e) ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Belge Sahipliği</label>
                <div className="space-y-2">
                  {[
                    ['ruhsat_kimin', 'Ruhsat kimin adına?'],
                    ['ced_proje_sahibi', 'ÇED proje sahibi kim?'],
                    ['itfaiye_basvuru', 'İtfaiye başvurusunu kim yapmış?']
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-0.5">{label}</label>
                      <input value={form.belge_sahipligi[key] || ''}
                        onChange={e => setNested('belge_sahipligi', key, e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        placeholder="CEVA İdari İşler, Malik, Müşteri..." />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UYUM & BELGELER */}
          {aktifTab === 'uyum' && (
            <div className="space-y-5">
              <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                Seviye: 0=Yok · 1=Geçersiz · 2=Süreçte · 3=Geçerli · 4=Tam uyumlu+döngü
              </div>

              {/* Ruhsat */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Çalışma Ruhsatı</div>
                <SeviyeSecici value={form.ruhsat.seviye} onChange={v => setNested('ruhsat', 'seviye', v)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Geçerlilik Tarihi</label>
                    <input type="date" value={form.ruhsat.gecerlilik_tarihi || ''}
                      onChange={e => setNested('ruhsat', 'gecerlilik_tarihi', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Yenileme Uyarısı (gün)</label>
                    <input type="number" value={form.ruhsat.uyari_gun || ''}
                      onChange={e => setNested('ruhsat', 'uyari_gun', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="30" />
                  </div>
                </div>
                <BelgeAlan label="Belge" deger={form.ruhsat} onChange={v => set('ruhsat', { ...form.ruhsat, ...v })} />
              </div>

              <div className="border-t border-gray-100" />

              {/* ÇED */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">ÇED Raporu</div>
                <SeviyeSecici value={form.ced.seviye} onChange={v => setNested('ced', 'seviye', v)} />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Onay Tarihi</label>
                  <input type="date" value={form.ced.onay_tarihi || ''}
                    onChange={e => setNested('ced', 'onay_tarihi', e.target.value)}
                    className="w-full max-w-xs px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <BelgeAlan label="Belge" deger={form.ced} onChange={v => set('ced', { ...form.ced, ...v })} />
              </div>

              <div className="border-t border-gray-100" />

              {/* İtfaiye */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">İtfaiye Raporu / Yangın Uygunluğu</div>
                <SeviyeSecici value={form.itfaiye.seviye} onChange={v => setNested('itfaiye', 'seviye', v)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Geçerlilik Tarihi</label>
                    <input type="date" value={form.itfaiye.gecerlilik_tarihi || ''}
                      onChange={e => setNested('itfaiye', 'gecerlilik_tarihi', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Yenileme Uyarısı (gün)</label>
                    <input type="number" value={form.itfaiye.uyari_gun || ''}
                      onChange={e => setNested('itfaiye', 'uyari_gun', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" placeholder="30" />
                  </div>
                </div>
                <BelgeAlan label="Belge" deger={form.itfaiye} onChange={v => set('itfaiye', { ...form.itfaiye, ...v })} />
              </div>

              <div className="border-t border-gray-100" />

              {/* Kanıt Linkleri */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Kanıt Linkleri</div>
                {[
                  ['sozlesme_link', 'Sözleşme (SharePoint/Drive)'],
                  ['ruhsat_link', 'Ruhsat Linki'],
                  ['itfaiye_link', 'İtfaiye Raporu Linki'],
                  ['ced_link', 'ÇED Belgesi Linki']
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-0.5">{label}</label>
                    <input value={form.kanit[key] || ''}
                      onChange={e => setNested('kanit', key, e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder="https://..." />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RACI */}
          {aktifTab === 'raci' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                R=Yapan · A=Sorumlu · C=Danışılan · I=Bilgilendirilen
              </div>
              <RaciSatir konu="Çalışma Ruhsatı" deger={form.raci.ruhsat}
                onChange={v => set('raci', { ...form.raci, ruhsat: v })} />
              <RaciSatir konu="İtfaiye / Yangın" deger={form.raci.itfaiye}
                onChange={v => set('raci', { ...form.raci, itfaiye: v })} />
              <RaciSatir konu="ÇED / Çevre" deger={form.raci.ced}
                onChange={v => set('raci', { ...form.raci, ced: v })} />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">İptal</button>
          <button onClick={handleKaydet} className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800">
            {tesis ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
