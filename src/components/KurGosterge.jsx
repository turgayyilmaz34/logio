
import { useState, useEffect } from 'react'
import { kurlariGetir } from '../utils/kurService'

export default function KurGosterge() {
  const [kurlar, setKurlar] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    kurlariGetir().then(k => {
      setKurlar(k)
      setYukleniyor(false)
    })
  }, [])

  if (yukleniyor || !kurlar) return null

  return (
    <div className="flex items-center gap-4 text-xs text-gray-400 px-3 py-2">
      <span>USD/TRY <span className="text-gray-600 font-medium">{kurlar.USD_TRY?.toFixed(2)}</span></span>
      <span>EUR/TRY <span className="text-gray-600 font-medium">{kurlar.EUR_TRY?.toFixed(2)}</span></span>
      <span>EUR/USD <span className="text-gray-600 font-medium">{kurlar.EUR_USD?.toFixed(4)}</span></span>
      <span className="text-gray-300">{kurlar.guncelleme ? new Date(kurlar.guncelleme).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
    </div>
  )
}
