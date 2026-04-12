
export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Özet Metrikler */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Toplam Alan', value: '—', sub: 'Tesis tanımlayın' },
          { label: 'Dolu Alan', value: '—', sub: 'Proje girin' },
          { label: 'Boş Alan', value: '—', sub: 'Maliyet yiyor' },
          { label: 'Günlük Boşluk Maliyeti', value: '—', sub: 'USD' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{m.label}</div>
            <div className="text-2xl font-semibold text-gray-800">{m.value}</div>
            <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Bilgi */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-blue-700">
        <div className="font-medium mb-1">Başlamak için</div>
        <div className="text-blue-600 space-y-1">
          <div>1 → Tesisler menüsünden tesis tanımlayın</div>
          <div>2 → Sözleşmeler menüsünden müşteri sözleşmesi ekleyin</div>
          <div>3 → Projeler menüsünden proje oluşturun</div>
        </div>
      </div>
    </div>
  )
}
