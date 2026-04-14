import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid 
} from 'recharts'
import { AlertTriangle, TrendingUp, Home, Box, Layers, Activity } from 'lucide-react'

export default function Raporlar() {
  const [tesisler, setTesisler] = useState([])
  const [sozlesmeler, setSozlesmeler] = useState([])
  const [loading, setLoading] = useState(true)
  const [hedefOran, setHedefOran] = useState(1.5)

  useEffect(() => {
    const yukle = async () => {
      try {
        const [tSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'tesisler')),
          getDocs(collection(db, 'sozlesmeler'))
        ])
        setTesisler(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setSozlesmeler(sSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error("Veri çekme hatası:", err)
      } finally {
        setLoading(false)
      }
    }
    yukle()
  }, [])

  const analizVerisi = tesisler.map(t => {
    const toplamAlan = (t.katlar || []).reduce((s, k) => s + Number(k.alan || 0), 0)
    const bas = new Date(t.kira_baslangic || Date.now())
    const bit = new Date(t.kira_bitis || Date.now())
    const tesisSureAy = Math.max(1, (bit - bas) / (1000 * 60 * 60 * 24 * 30))
    const tesisKapasitePuani = toplamAlan * tesisSureAy

    const ilgiliSozlesmeler = sozlesmeler.filter(s => s.tesis_id === t.id)
    const musteriDolulukPuani = ilgiliSozlesmeler.reduce((sum, s) => {
      return sum + (Number(s.alan_sqm || 0) * Number(s.sure_ay || 12))
    }, 0)

    const ratio = tesisKapasitePuani > 0 ? (musteriDolulukPuani / tesisKapasitePuani) : 0
    
    return {
      name: t.ad,
      ratio: Number(ratio.toFixed(2)),
      isletme: t.isletme_modeli === 'multi_user' ? 'Multiuser' : 'Dedicated',
      mulkiyet: t.mulkiyet_tipi === 'oz_mal' ? 'Öz Mal' : 'Kiralık',
      yapi: t.yapi_tipi === 'celik' ? 'Çelik' : 'Betonarme',
      alan: toplamAlan,
      status: ratio > hedefOran ? 'KRİTİK' : ratio > 1 ? 'RİSKLİ' : 'GÜVENLİ'
    }
  })

  const radarData = [
    { subject: 'Lokasyon', A: 120, fullMark: 150 },
    { subject: 'Teknoloji', A: 98, fullMark: 150 },
    { subject: 'Enerji', A: 86, fullMark: 150 },
    { subject: 'Emniyet', A: 99, fullMark: 150 },
    { subject: 'Verimlilik', A: 110, fullMark: 150 },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Activity className="animate-spin text-blue-600" size={40} />
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Analiz Hazırlanıyor...</span>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">White Space Risk Map</h1>
          <p className="text-slate-400 font-medium italic">Asset & Portfolio Strategic Analytics</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex items-center gap-6">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hedef Eşik Değeri (Ratio)</span>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="0.5" max="2.5" step="0.1" 
                value={hedefOran} onChange={e => setHedefOran(Number(e.target.value))}
                className="w-40 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-2xl font-black text-blue-600">{hedefOran}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[40px] shadow-xl border border-white">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg mb-10 flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-600" /> Tesis Verimlilik Endeksi
          </h3>
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analizVerisi}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="ratio" radius={[12, 12, 12, 12]} barSize={50}>
                  {analizVerisi.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.ratio > hedefOran ? '#EF4444' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
            <h3 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-[10px] mb-8">Teknik Risk Radarı</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Radar name="Skor" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Kritik Tesis</span>
              <div className="text-3xl font-black text-red-500 mt-1">{analizVerisi.filter(r => r.ratio > hedefOran).length}</div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">Boş Kapasite</span>
              <div classNam
