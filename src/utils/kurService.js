import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const KUR_DOC = 'sistem/kurlar'
const CACHE_SURE_MS = 60 * 60 * 1000 // 1 saat

export async function kurlariGetir() {
  // Önce Firestore cache'e bak
  try {
    const snap = await getDoc(doc(db, 'sistem', 'kurlar'))
    if (snap.exists()) {
      const data = snap.data()
      const yas = Date.now() - (data.guncelleme_ts || 0)
      if (yas < CACHE_SURE_MS) {
        return data.kurlar // { USD_TRY, EUR_TRY, EUR_USD }
      }
    }
  } catch {}

  // Cache yoksa veya eskiyse API'den çek
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const json = await res.json()
    const kurlar = {
      USD_TRY: json.rates?.TRY || 0,
      EUR_TRY: (json.rates?.TRY / json.rates?.EUR) || 0,
      EUR_USD: 1 / (json.rates?.EUR || 1),
      guncelleme: new Date().toISOString(),
    }
    // Firestore'a yaz
    await setDoc(doc(db, 'sistem', 'kurlar'), {
      kurlar,
      guncelleme_ts: Date.now()
    })
    return kurlar
  } catch (e) {
    console.error('Kur çekme hatası:', e)
    // Fallback — makul sabit değerler (kullanıcıya uyarı gösterilmeli)
    return {
      USD_TRY: 32.0,
      EUR_TRY: 34.5,
      EUR_USD: 1.08,
      guncelleme: null,
      fallback: true,
    }
  }
}

export function kurdanCevir(tutar, kaynakPB, hedefPB, kurlar) {
  if (!kurlar || kaynakPB === hedefPB) return tutar
  const n = Number(tutar) || 0

  // TRY bazlı çevrim
  const tryye = {
    TRY: n,
    USD: n * (kurlar.USD_TRY || 1),
    EUR: n * (kurlar.EUR_TRY || 1),
  }

  const tryTutar = tryye[kaynakPB] || n
  const sonuc = {
    TRY: tryTutar,
    USD: tryTutar / (kurlar.USD_TRY || 1),
    EUR: tryTutar / (kurlar.EUR_TRY || 1),
  }

  return Math.round(sonuc[hedefPB] * 100) / 100
}
