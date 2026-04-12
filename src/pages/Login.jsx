
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError('E-posta veya şifre hatalı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-semibold text-blue-700 tracking-tight">Logio</div>
          <div className="text-sm text-gray-400 mt-1">Lojistik Operasyon Platformu</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="ad@firma.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
