import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Train, LayoutDashboard, User } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Navbar() {
  const { session, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin')
    } else {
      navigate('/')
    }
  }

  return (
    <header className="sticky top-0 z-50 kai-gradient shadow-lg shadow-kai-blue-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Train className="text-kai-blue-700" size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                PT KAI Solo Balapan
              </h1>
              <p className="text-kai-blue-200 text-xs leading-tight">Presensi PKL 2026</p>
            </div>
          </div>

          {/* Center badge - orange accent */}
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-1.5 border border-white/20">
            <div className="w-2 h-2 rounded-full bg-kai-orange-400 animate-pulse-slow" />
            <span className="text-white text-xs font-medium">Sistem Aktif</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {session && (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                  {session.role === 'admin' ? (
                    <LayoutDashboard size={14} className="text-kai-orange-300" />
                  ) : (
                    <User size={14} className="text-kai-orange-300" />
                  )}
                  <span className="text-white text-xs font-medium max-w-32 truncate">
                    {session.role === 'admin' ? 'Admin' : session.nama?.split(' ')[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  id="btn-logout"
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white
                             px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold
                             border border-white/20 hover:border-white/40"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Orange bottom accent line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-kai-orange-400 to-transparent opacity-60" />
    </header>
  )
}
