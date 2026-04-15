
import { addDoc, collection } from 'firebase/firestore'
import { db, auth } from '../firebase'

const MODUL_LABEL = {
  tesisler: 'Tesisler', katlar: 'Katlar', musteriler: 'Müşteriler',
  sozlesmeler: 'Sözleşmeler', projeler: 'Projeler', ihaleler: 'İhaleler',
  grup_sirketleri: 'Grup Şirketleri', kullanicilar: 'Kullanıcılar',
  taseronlar: 'Taşeronlar', rotalar: 'Rotalar', anketler: 'Anketler',
  mhe_ekipmanlar: 'MHE', mhe_atamalari: 'MHE Atama',
  tasinma_planlari: 'Taşınma Planı', mal_sahibi_sozlesmeleri: 'Mal Sahibi Sözleşmesi',
  artis_loglari: 'Artış Logu',
}

export async function auditLog({ modul, islem, kayitId, kayitAd = '', detay = {} }) {
  try {
    const user = auth.currentUser
    if (!user) return
    const tenantId = user.email?.split('@')[1] || 'default'
    await addDoc(collection(db, 'audit_logs'), {
      tenant_id: tenantId,
      kullanici_email: user.email,
      kullanici_id: user.uid,
      modul,
      modul_label: MODUL_LABEL[modul] || modul,
      islem, // 'ekle' | 'guncelle' | 'sil'
      kayit_id: kayitId || '',
      kayit_ad: kayitAd,
      detay,
      tarih: new Date().toISOString(),
      tarih_ts: Date.now(),
    })
  } catch (e) {
    console.warn('Audit log yazılamadı:', e)
  }
}
