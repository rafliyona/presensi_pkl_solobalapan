import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Train, Hash, ArrowRight, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function LoginPage() {
  const { siswaList, loadingSiswa, login } = useApp()
  const navigate = useNavigate()

  const [nisInput, setNisInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = nisInput.trim()
    if (!trimmed) {
      setError('Masukkan NIS Anda.')
      return
    }

    setLoading(true)

    try {
      const siswa = siswaList.find(s => s.nis === trimmed)
      if (!siswa) {
        setError('NIS tidak ditemukan. Periksa kembali NIS Anda.')
        return
      }

      login({ role: 'siswa', nis: siswa.nis, nama: siswa.nama, kelas: siswa.kelas })
      navigate('/absen')
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Hero top */}
      <div className="kai-gradient pt-12 pb-20 px-4 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-4 right-16 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-kai-orange-500/10" />

        <div className="max-w-md mx-auto text-center relative z-10">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-5">
            <Train className="text-kai-blue-700" size={40} />
          </div>
          <div className="inline-block bg-kai-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            PKL 2026
          </div>
          <h1 className="text-white text-2xl font-bold leading-tight mb-2">
            Presensi Online PKL
          </h1>
          <p className="text-kai-blue-200 text-sm">
            PT Kereta Api Indonesia (Persero)<br />
            Stasiun Solo Balapan
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 -mt-12 px-4 pb-8 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="card shadow-xl animate-slide-up">
            <h2 className="text-slate-800 font-bold text-lg mb-1">Masuk ke Sistem</h2>
            <p className="text-slate-500 text-sm mb-6">Masukkan Nomor Induk Siswa (NIS) PKL Anda</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="input-nis" className="label">Nomor Induk Siswa (NIS)</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="input-nis"
                    type="text"
                    value={nisInput}
                    onChange={e => { setNisInput(e.target.value); setError('') }}
                    placeholder="Contoh: 24.012384"
                    className="input-field pl-10"
                    autoComplete="off"
                    disabled={loadingSiswa}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-1.5">Format: XX.XXXXXX</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm animate-fade-in">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="btn-login-siswa"
                type="submit"
                disabled={loading || loadingSiswa}
                className="btn-primary w-full py-3.5 text-base"
              >
                {loading || loadingSiswa ? (
                  <LoadingSpinner size="sm" color="white" text={loadingSiswa ? "Memuat data..." : "Memverifikasi..."} />
                ) : (
                  <>
                    Masuk ke Halaman Absen
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Admin link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-xs mb-2">Akses untuk Admin / Pembimbing</p>
              <button
                id="btn-go-admin"
                onClick={() => navigate('/admin')}
                className="text-kai-blue-600 hover:text-kai-blue-800 text-sm font-semibold hover:underline transition-colors"
              >
                Login sebagai Admin →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
