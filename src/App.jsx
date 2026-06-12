import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import AbsenPage from './pages/AbsenPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

function ProtectedSiswa({ children }) {
  const { session } = useApp()
  if (!session || session.role !== 'siswa') return <Navigate to="/" replace />
  return children
}

function ProtectedAdmin({ children }) {
  const { session } = useApp()
  if (!session || session.role !== 'admin') return <Navigate to="/admin" replace />
  return children
}

function AppRoutes() {
  const { session } = useApp()

  return (
    <Routes>
      {/* Siswa routes */}
      <Route
        path="/"
        element={session?.role === 'siswa' ? <Navigate to="/absen" replace /> : <LoginPage />}
      />
      <Route
        path="/absen"
        element={
          <ProtectedSiswa>
            <AbsenPage />
          </ProtectedSiswa>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={session?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />}
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdmin>
            <AdminDashboardPage />
          </ProtectedAdmin>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
              style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
            },
          }}
        />
      </BrowserRouter>
    </AppProvider>
  )
}
