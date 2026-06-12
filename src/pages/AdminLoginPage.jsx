import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Train, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'kai2024',
}

export default function AdminLoginPage() {
  const { login } = useApp()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.')
      return
    }

    setLoading(true)
    // Simulate a small delay for UX
    await new Promise(r => setTimeout(r, 500))

    if (
      username.trim() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      login({ role: 'admin', nama: 'Admin KAI', nis: null })
      navigate('/admin/dashboard')
    } else {
      setError('Username atau password salah. Coba lagi.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Hero */}
      <div className="kai-gradient pt-12 pb-20 px-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-kai-orange-500/10" />

        <div className="max-w-md mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-5">
            <Train className="text-kai-blue-700" size={40} />
          </div>
          <div className="inline-block bg-kai-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            Admin / Pembimbing
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Portal Admin</h1>
          <p className="text-kai-blue-200 text-sm">
            PT KAI Solo Balapan — Dashboard Rekap Presensi PKL
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 -mt-12 px-4 pb-8 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="card shadow-xl animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-kai-blue-50 rounded-xl flex items-center justify-center">
                <Lock className="text-kai-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-slate-800 font-bold text-lg leading-tight">Login Admin</h2>
                <p className="text-slate-500 text-xs">Khusus Admin & Pembimbing PKL KAI</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="label">Username</label>
                <div className="relative">
                  <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="admin-username"
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError('') }}
                    placeholder="Masukkan username"
                    className="input-field pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="label">Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Masukkan password"
                    className="input-field pl-10 pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm animate-fade-in">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                id="btn-admin-login"
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    Masuk ke Dashboard
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <button
                id="btn-back-to-siswa"
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-slate-600 text-sm transition-colors hover:underline"
              >
                ← Kembali ke halaman siswa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
