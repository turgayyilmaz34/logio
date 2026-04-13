import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import MalSahibiSozlesmesi from './MalSahibiSozlesmesi'

const ALAN_TIPLERI = [
  'Kuru Depo', 'Soğuk Depo', 'Derin Dondurma', 'Tehlikeli Madde',
  'Yangına Duyarlı', 'Gümrüklü', 'Yüksek Raflı', 'Dolu Zemin',
  'Baskı / Paketleme', 'Ofis Alanı'
]

const bos = {
  kat_adi: '', sozlesme_m2: '', kullanilabilir_m2: '',
  tavan_yuksekligi: '', alan_tipleri: [],
  asmakat_var: false, asmakat_m2: '', asmakat_aciklama: '',
}

export default function KatlarPanel({ tesisId, tenantId }) {
  const [katlar, setKatlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(bos)
  const [formAcik, setFormAcik] = useState(false)
  const [duzenleId, setDuzenleId] = useState(null)
  const [acikKatId, setAcikKatId] = useState(null)

  const yukle = async () => {
    const q = query(collection(db, 'katlar'),
      where('tesis_id', '==', tesisId),
      where('tenant_id', '==', tenantId))
    const snap = await getDocs(q)
    setKatlar(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { yukle() }, [tesisId])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleAlanTipi = (tip) => setForm(f => ({
    ...f, alan_tipleri: f.alan_tipleri.includes(tip)
      ? f.alan_tipleri.filter(t => t !== tip)
      : [...f.alan_tipleri, tip]
  }))

  const handleKaydet = async () => {
    if (!form.kat_adi) return alert('Kat adı zorunludur.')
    const veri = {
      ...form, tesis_id: tesisId, tenant_id: tenantId,
      sozlesme_m2: Number(form.sozlesme_m2) || 0,
      kullanilabilir_m2: Number(form.kullanilabilir_m2) || 0,
      tavan_yuksekligi: Number(form.tavan_yuksekligi) || 0,
      asmakat_m2: form.asmakat_var ? Number(form.asmakat_m2) || 0 : 0,
    }
    if (duzenleId) {
      await updateDoc(doc(db, 'katlar', duzenleId), veri)
    } else {
      await addDoc(collection(db, 'katlar'), veri)
    }
    setForm(bos); setFormAcik(false); setDuzenleId(null)
    yukle()
  }

  const handleDuzenle = (kat) => {
    setForm({
      kat_adi: kat.kat_adi || '', sozlesme_m2: kat.sozlesme_m2 || '',
      kullanilabilir_m2: kat.kullanilabilir_m2 || '', tavan_yuksekligi: kat.tavan_yuksekligi || '',
      alan_tipleri: kat.alan_tipleri || [], asmakat_var: kat.asmakat_var || false,
      asmakat_m2: kat.asmakat_m2 || '', asmakat_aciklama: kat.asmakat_aciklama || '',
    })
    setDuzenleId(kat.id); setFormAcik(true)
  }

  const handleSil = async (id) => {
    if (!window.confirm('Bu katı silmek istediğinize emin misiniz?')) return
    await deleteDoc(doc(db, 'katlar', id))
    yukle()
  }

  // Toplam kullanılabilir m² hesabı
  const toplamKullanilabilir = katlar.reduce((acc, k) => acc + (k.kullanilabilir_m2 || 0) + (k.asmakat_var ? k.asmakat_m2 || 0 : 0), 0)
  const toplamSozlesme = katlar.reduce((acc, k) => acc + (k.sozlesme_m2 || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Katlar {katlar.length > 0 && `(${katlar.length})`}
          </div>
          {katlar.length > 0 && (
            <div className="flex gap-3 text-xs text-gray-400">
              <span>Sözleşme: <span className="text-gray-600 font-medium">{toplamSozlesme.toLocaleString('tr-TR')} m²</span></span>
              <span>Kullanılabilir: <span className="text-gray-600 font-medium">{toplamKullanilabilir.toLocaleString('tr-TR')} m²</span></span>
            </div>
          )}
        </div>
        <button onClick={() => { setForm(bos); setDuzenleId(null); setFormAcik(!formAcik) }}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          + Kat Ekle
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="space-y-2 mb-3">
          {katlar.map(kat => (
            <div key={kat.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Kat satırı */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{kat.kat_adi}</div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">
                        Sözleşme: <span className="text-gray-600">{(kat.sozlesme_m2 || 0).toLocaleString('tr-TR')} m²</span>
                      </span>
                      <span className="text-xs text-gray-400">
                        Kullanılabilir: <span className="text-gray-600 font-medium">{(kat.kullanilabilir_m2 || 0).toLocaleString('tr-TR')} m²</span>
                      </span>
                      {kat.tavan_yuksekligi > 0 && (
                        <span className="text-xs text-gray-400">Tavan: <span className="text-gray-600">{kat.tavan_yuksekligi}m</span></span>
                      )}
                      {kat.asmakat_var && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                          Asmakat {kat.asmakat_m2 > 0 ? `${kat.asmakat_m2} m²` : ''}
                        </span>
                      )}
                    </div>
                    {kat.alan_tipleri?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kat.alan_tipleri.map(t => (
                          <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setAcikKatId(acikKatId === kat.id ? null : kat.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${acikKatId === kat.id ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {acikKatId === kat.id ? 'Gizle' : 'Mal Sahibi Söz.'}
                    </button>
                    <button onClick={() => handleDuzenle(kat)} className="text-xs text-gray-400 hover:text-gray-600">Düzenle</button>
                    <button onClick={() => handleSil(kat.id)} className="text-xs text-red-400 hover:text-red-600">Sil</button>
                  </div>
                </div>

                {/* Mal Sahibi Sözleşmesi */}
                {acikKatId === kat.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <MalSahibiSozlesmesi katId={kat.id} tenantId={tenantId} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kat ekleme formu */}
      {formAcik && (
        <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-3">
          <div className="text-xs font-medium text-blue-700">{duzenleId ? 'Katı Düzenle' : 'Yeni Kat'}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Kat Adı *</label>
              <input value={form.kat_adi} onChange={e => set('kat_adi', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="Zemin Kat, 1. Kat..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sözleşme m²</label>
              <input type="number" value={form.sozlesme_m2} onChange={e => set('sozlesme_m2', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="5000" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kullanılabilir m²</label>
              <input type="number" value={form.kullanilabilir_m2} onChange={e => set('kullanilabilir_m2', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="4800" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tavan Yüksekliği (m)</label>
              <input type="number" step="0.1" value={form.tavan_yuksekligi} onChange={e => set('tavan_yuksekligi', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="8.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Alan Tipleri</label>
            <div className="flex flex-wrap gap-1.5">
              {ALAN_TIPLERI.map(tip => (
                <button key={tip} onClick={() => toggleAlanTipi(tip)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.alan_tipleri.includes(tip) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>{tip}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.asmakat_var} onChange={e => set('asmakat_var', e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-600 font-medium">Asmakat var</span>
            </label>
            {form.asmakat_var && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Asmakat m²</label>
                  <input type="number" value={form.asmakat_m2} onChange={e => set('asmakat_m2', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Açıklama</label>
                  <input value={form.asmakat_aciklama} onChange={e => set('asmakat_aciklama', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setFormAcik(false); setForm(bos); setDuzenleId(null) }}
              className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-50 rounded-lg">İptal</button>
            <button onClick={handleKaydet} className="text-xs px-4 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
              {duzenleId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
