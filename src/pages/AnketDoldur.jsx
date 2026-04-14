
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, query, where, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useParams, useSearchParams } from 'react-router-dom'

const T = {
  tr: {
    baslik: 'Müşteri Memnuniyet Anketi',
    nps_soru: 'Bizi bir iş arkadaşınıza veya dostunuza tavsiye etme olasılığınız nedir?',
    nps_dusuk: 'Kesinlikle tavsiye etmem',
    nps_yuksek: 'Kesinlikle tavsiye ederim',
    csat_soru: 'Genel hizmet memnuniyetinizi nasıl değerlendirirsiniz?',
    yorum_soru: 'Görüşlerinizi paylaşmak ister misiniz?',
    yorum_placeholder: 'Yorumunuz (opsiyonel)...',
    gonder: 'Gönder',
    tesekkur: 'Teşekkürler!',
    tesekkur_alt: 'Değerli geri bildiriminiz için teşekkür ederiz.',
    zaten_dolduruldu: 'Bu anket daha önce doldurulmuş.',
    bulunamadi: 'Anket bulunamadı.',
    zorunlu: 'Lütfen NPS puanı seçiniz.',
  },
  en: {
    baslik: 'Customer Satisfaction Survey',
    nps_soru: 'How likely are you to recommend us to a colleague or friend?',
    nps_dusuk: 'Not at all likely',
    nps_yuksek: 'Extremely likely',
    csat_soru: 'How would you rate your overall satisfaction with our service?',
    yorum_soru: 'Would you like to share your thoughts?',
    yorum_placeholder: 'Your comment (optional)...',
    gonder: 'Submit',
    tesekkur: 'Thank you!',
    tesekkur_alt: 'We appreciate your valuable feedback.',
    zaten_dolduruldu: 'This survey has already been completed.',
    bulunamadi: 'Survey not found.',
    zorunlu: 'Please select an NPS score.',
  }
}

export default function AnketDoldur() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'tr'
  const t = T[lang]

  const [anket, setAnket] = useState(null)
  const [durum, setDurum] = useState('yukleniyor') // yukleniyor | bos | dolu | gonderildi | bulunamadi
  const [nps, setNps] = useState(null)
  const [csat, setCsat] = useState(null)
  const [yorum, setYorum] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    const yukle = async () => {
      const snap = await getDocs(query(collection(db, 'anketler'), where('token', '==', token)))
      if (snap.empty) { setDurum('bulunamadi'); return }
      const anketDoc = { id: snap.docs[0].id, ...snap.docs[0].data() }
      setAnket(anketDoc)

      // Daha önce doldurulmuş mu?
      const cSnap = await getDocs(query(collection(db, 'anket_cevaplari'), where('anket_id', '==', anketDoc.id)))
      if (!cSnap.empty) { setDurum('dolu'); return }
      setDurum('bos')
    }
    yukle()
  }, [token])

  const gonder = async () => {
    if (nps === null) return alert(t.zorunlu)
    setGonderiliyor(true)
    await addDoc(collection(db, 'anket_cevaplari'), {
      anket_id: anket.id,
      tenant_id: anket.tenant_id,
      musteri_id: anket.musteri_id,
      nps, csat, yorum,
      dil: lang,
      tarih: new Date().toISOString(),
    })
    await updateDoc(doc(db, 'anketler', anket.id), { durum: 'tamamlandi' })
    setDurum('gonderildi')
    setGonderiliyor(false)
  }

  if (durum === 'yukleniyor') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-400">Yükleniyor...</div>
    </div>
  )

  if (durum === 'bulunamadi') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-gray-300 text-5xl mb-4">🔍</div>
        <div className="text-gray-500">{t.bulunamadi}</div>
      </div>
    </div>
  )

  if (durum === 'dolu') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <div className="text-gray-500">{t.zaten_dolduruldu}</div>
      </div>
    </div>
  )

  if (durum === 'gonderildi') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-4">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t.tesekkur}</h2>
        <p className="text-gray-500">{t.tesekkur_alt}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold text-blue-700 mb-1">Logio</div>
          <h1 className="text-lg font-medium text-gray-800">{t.baslik}</h1>
          {anket?.konu && <div className="text-sm text-gray-400 mt-1">{anket.konu}</div>}
        </div>

        {/* NPS */}
        <div className="mb-8">
          <div className="text-sm font-medium text-gray-700 mb-4">{t.nps_soru}</div>
          <div className="flex gap-1 justify-between">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setNps(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                  nps === n
                    ? n >= 9 ? 'bg-green-500 text-white border-green-500'
                      : n >= 7 ? 'bg-amber-400 text-white border-amber-400'
                      : 'bg-red-400 text-white border-red-400'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{t.nps_dusuk}</span>
            <span>{t.nps_yuksek}</span>
          </div>
        </div>

        {/* CSAT */}
        <div className="mb-8">
          <div className="text-sm font-medium text-gray-700 mb-4">{t.csat_soru}</div>
          <div className="flex gap-3 justify-center">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setCsat(n)}
                className={`text-3xl transition-all hover:scale-110 ${csat >= n ? 'text-amber-400' : 'text-gray-200'}`}>
                ★
              </button>
            ))}
          </div>
          {csat && (
            <div className="text-center text-xs text-gray-400 mt-2">
              {csat === 1 ? (lang === 'tr' ? 'Çok Kötü' : 'Very Poor') :
               csat === 2 ? (lang === 'tr' ? 'Kötü' : 'Poor') :
               csat === 3 ? (lang === 'tr' ? 'Orta' : 'Fair') :
               csat === 4 ? (lang === 'tr' ? 'İyi' : 'Good') :
               (lang === 'tr' ? 'Mükemmel' : 'Excellent')}
            </div>
          )}
        </div>

        {/* Yorum */}
        <div className="mb-8">
          <div className="text-sm font-medium text-gray-700 mb-2">{t.yorum_soru}</div>
          <textarea
            value={yorum}
            onChange={e => setYorum(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
            placeholder={t.yorum_placeholder}
          />
        </div>

        <button
          onClick={gonder}
          disabled={gonderiliyor || nps === null}
          className="w-full bg-blue-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50">
          {gonderiliyor ? '...' : t.gonder}
        </button>
      </div>
    </div>
  )
}
