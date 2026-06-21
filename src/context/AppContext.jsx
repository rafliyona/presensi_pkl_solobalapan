import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSiswa, getAbsensiByNISAndDate, getPengajuanByNISAndDate, getTabunganCuti } from '../utils/supabase'
import { getTodayString } from '../utils/timeUtils'

const AppContext = createContext(null)

const SESSION_KEY = 'kai_session'

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)      // { role, nis, nama, kelas }
  const [siswaList, setSiswaList] = useState([])
  const [todayRecord, setTodayRecord] = useState(null) // absensi hari ini
  const [todayPengajuan, setTodayPengajuan] = useState(null) // pengajuan ketidakhadiran hari ini
  const [tabunganCuti, setTabunganCuti] = useState(null) // { saldo_cuti, ... }
  const [loadingSiswa, setLoadingSiswa] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) setSession(JSON.parse(saved))
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [])

  // Load siswa list
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSiswa()
        setSiswaList(data || [])
      } catch (err) {
        console.error('Failed to load siswa:', err)
        // Fallback to hardcoded data if Supabase not set up yet
        setSiswaList([
          { nis: '24.012384', nama: 'Fadly Dava Rizkyanto', kelas: 'XI TJKT A' },
          { nis: '24.012393', nama: 'Muhammad Evan Setya Nugroho', kelas: 'XI TJKT A' },
          { nis: '24.012397', nama: 'Muhammad Rafli Yona Saputro', kelas: 'XI TJKT A' },
          { nis: '24.012403', nama: 'Rafi Nadhif Ariyanto', kelas: 'XI TJKT A' },
        ])
      } finally {
        setLoadingSiswa(false)
      }
    }
    load()
  }, [])

  // Load today's absensi, pengajuan & tabungan cuti when session changes
  const loadTodayData = useCallback(async () => {
    if (!session || session.role !== 'siswa') {
      setTodayRecord(null)
      setTodayPengajuan(null)
      setTabunganCuti(null)
      return
    }
    const today = getTodayString()
    try {
      const [record, pengajuan, cuti] = await Promise.all([
        getAbsensiByNISAndDate(session.nis, today),
        getPengajuanByNISAndDate(session.nis, today),
        getTabunganCuti(session.nis),
      ])
      setTodayRecord(record)
      setTodayPengajuan(pengajuan)
      setTabunganCuti(cuti)
    } catch (err) {
      console.error('Failed to load today data:', err)
      setTodayRecord(null)
      setTodayPengajuan(null)
      setTabunganCuti(null)
    }
  }, [session])

  useEffect(() => {
    loadTodayData()
  }, [loadTodayData])

  const refreshTabunganCuti = useCallback(async () => {
    if (!session || session.role !== 'siswa') return
    try {
      const cuti = await getTabunganCuti(session.nis)
      setTabunganCuti(cuti)
    } catch (err) {
      console.error('Failed to refresh tabungan cuti:', err)
    }
  }, [session])

  const login = (userData) => {
    setSession(userData)
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
  }

  const logout = () => {
    setSession(null)
    setTodayRecord(null)
    setTodayPengajuan(null)
    setTabunganCuti(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const refreshTodayRecord = () => loadTodayData()

  return (
    <AppContext.Provider value={{
      session,
      siswaList,
      loadingSiswa,
      todayRecord,
      todayPengajuan,
      tabunganCuti,
      isDemoMode,
      setIsDemoMode,
      login,
      logout,
      refreshTodayRecord,
      refreshTabunganCuti,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
