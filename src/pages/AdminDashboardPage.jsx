import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, Download, RefreshCw, Users, CheckCircle, Clock, AlertCircle, FileSpreadsheet, FileText, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllAbsensi, getHariLibur, addHariLibur, deleteHariLibur, updateAbsensiJenis, getAllPengajuan, updateStatusPengajuan, getAllTabunganCuti, getRiwayatCuti, kurangiTabunganCuti } from '../utils/supabase'
import { getTodayString, formatDateID, formatDateShortID } from '../utils/timeUtils'
import AttendanceTable from '../components/AttendanceTable'
import PengajuanTable from '../components/PengajuanTable'
import Navbar from '../components/Navbar'

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-kai-blue-50 border-kai-blue-100 text-kai-blue-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  }
  const iconColors = {
    blue: 'bg-kai-blue-100 text-kai-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [absensiData, setAbsensiData] = useState([])
  const [pengajuanData, setPengajuanData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPengajuan, setLoadingPengajuan] = useState(true)
  const today = getTodayString()
  const [filterDate, setFilterDate] = useState(today)
  const [filterSearch, setFilterSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('absensi') // 'absensi' | 'pengajuan' | 'tabungan_cuti'

  // State Tabungan Cuti
  const [tabunganCutiData, setTabunganCutiData] = useState([])
  const [riwayatCutiData, setRiwayatCutiData] = useState([])
  const [loadingTabungan, setLoadingTabungan] = useState(false)

  // State Hari Libur / Piket
  const [hariLiburList, setHariLiburList] = useState([])
  const [newLiburDate, setNewLiburDate] = useState('')
  const [newLiburKeterangan, setNewLiburKeterangan] = useState('')
  const [loadingLibur, setLoadingLibur] = useState(false)

  // State Terminal Scan Barcode
  const [showTerminal, setShowTerminal] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [scanningState, setScanningState] = useState('idle') // 'idle' | 'processing'
  const [scanResult, setScanResult] = useState(null) // { success: boolean, message: string, siswa?: object, isMasuk?: boolean }
  const [allSiswa, setAllSiswa] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllAbsensi({
        tanggal: filterDate || undefined,
        search: filterSearch || undefined,
      })
      setAbsensiData(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data absensi.')
      setAbsensiData([])
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterSearch])

  const fetchPengajuan = useCallback(async () => {
    setLoadingPengajuan(true)
    try {
      const data = await getAllPengajuan({
        tanggal: filterDate || undefined,
        search: filterSearch || undefined,
      })
      setPengajuanData(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data pengajuan.')
      setPengajuanData([])
    } finally {
      setLoadingPengajuan(false)
    }
  }, [filterDate, filterSearch])

  const fetchHariLibur = useCallback(async () => {
    try {
      const data = await getHariLibur()
      setHariLiburList(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data hari libur.')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
      fetchPengajuan()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchData, fetchPengajuan])

  useEffect(() => {
    fetchHariLibur()
    // Muat semua siswa untuk scanner terminal
    const loadSiswa = async () => {
      try {
        const { getSiswa } = await import('../utils/supabase')
        const data = await getSiswa()
        setAllSiswa(data || [])
      } catch (err) {
        console.error('Gagal memuat list siswa:', err)
      }
    }
    loadSiswa()
  }, [fetchHariLibur])

  const fetchTabunganCuti = useCallback(async () => {
    setLoadingTabungan(true)
    try {
      const [tabungan, riwayat] = await Promise.all([
        getAllTabunganCuti(),
        getRiwayatCuti(),
      ])
      setTabunganCutiData(tabungan || [])
      setRiwayatCutiData(riwayat || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data tabungan cuti.')
    } finally {
      setLoadingTabungan(false)
    }
  }, [])

  useEffect(() => {
    fetchTabunganCuti()
  }, [fetchTabunganCuti])

  const handleAddLibur = async (e) => {
    e.preventDefault()
    if (!newLiburDate || !newLiburKeterangan.trim()) {
      toast.error('Tanggal dan keterangan harus diisi!')
      return
    }
    setLoadingLibur(true)
    try {
      await addHariLibur({ tanggal: newLiburDate, keterangan: newLiburKeterangan })
      toast.success('Hari libur / piket berhasil ditambahkan')
      setNewLiburDate('')
      setNewLiburKeterangan('')
      fetchHariLibur()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menambahkan hari libur')
    } finally {
      setLoadingLibur(false)
    }
  }

  const handleDeleteLibur = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hari libur/piket ini?')) return
    try {
      await deleteHariLibur(id)
      toast.success('Hari libur / piket berhasil dihapus')
      fetchHariLibur()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus hari libur')
    }
  }

  const handleJenisChange = async (id, newJenis) => {
    try {
      await updateAbsensiJenis(id, newJenis)
      toast.success('Jenis absensi berhasil diperbarui')
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Gagal memperbarui jenis absensi')
    }
  }

  const handleStatusPengajuanChange = async (id, status) => {
    try {
      // 1. Update status di tabel pengajuan
      const updated = await updateStatusPengajuan(id, status)
      
      // 2. Jika disetujui, buat baris di tabel absensi agar rekap sync
      if (status === 'disetujui') {
        const { createAbsensiMasuk } = await import('../utils/supabase')
        try {
          await createAbsensiMasuk({
            nis: updated.nis,
            nama: updated.nama,
            kelas: updated.kelas,
            tanggal: updated.tanggal,
            jam_masuk: '08:00:00',
            foto_masuk_url: null,
            lat_masuk: null,
            lng_masuk: null,
            status: 'Tepat Waktu',
            jenis: updated.jenis
          })
        } catch (dbErr) {
          // Abaikan jika sudah ada absensi untuk hari itu (unik)
          console.warn('Absensi row sync warning:', dbErr)
        }

        // 3. Jika jenis cuti dan disetujui → kurangi saldo tabungan cuti
        if (updated.jenis === 'cuti') {
          try {
            await kurangiTabunganCuti({
              nis: updated.nis,
              nama: updated.nama,
              kelas: updated.kelas,
              tanggal: updated.tanggal,
              keterangan: 'Pengajuan cuti disetujui admin',
            })
            fetchTabunganCuti()
          } catch (cutiErr) {
            console.warn('Gagal kurangi tabungan cuti:', cutiErr)
            toast.error(`Pengajuan disetujui, tapi gagal kurangi saldo cuti: ${cutiErr.message}`)
          }
        }
      }

      toast.success(`Pengajuan berhasil di-${status}`)
      fetchData()
      fetchPengajuan()
    } catch (err) {
      console.error(err)
      toast.error('Gagal memproses status pengajuan')
    }
  }

  // Fungsi memutar suara bip sukses / gagal menggunakan HTML5 Web Audio API (tidak butuh file eksternal)
  const playBeep = (isSuccess) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      if (isSuccess) {
        // Nada sukses (bip ganda bernada tinggi)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.setValueAtTime(1000, ctx.currentTime + 0.12)
        gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.12)
        osc2.start(ctx.currentTime + 0.12)
        osc2.stop(ctx.currentTime + 0.25)
      } else {
        // Nada gagal (buzzer rendah)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, ctx.currentTime)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.45)
      }
    } catch (e) {
      console.warn('Gagal memutar audio:', e)
    }
  }

  const handleScanSubmit = async (e) => {
    e.preventDefault()
    const nis = scanInput.trim()
    if (!nis) return

    setScanningState('processing')
    setScanResult(null)

    try {
      // 1. Cari siswa
      const siswa = allSiswa.find(s => s.nis === nis)
      if (!siswa) {
        playBeep(false)
        setScanResult({
          success: false,
          message: `NIS "${nis}" tidak ditemukan di database siswa.`
        })
        setScanInput('')
        setScanningState('idle')
        return
      }

      // 2. Ambil catatan kehadiran hari ini
      const { getAbsensiByNISAndDate, createAbsensiMasuk, updateAbsensiPulang } = await import('../utils/supabase')
      const todayStr = getTodayString()
      const record = await getAbsensiByNISAndDate(nis, todayStr)
      const now = getNowWIB()
      const jamStr = getTimeString(now)

      // Cek hari libur
      const isHoliday = hariLiburList.some(h => h.tanggal === todayStr)
      const holidayInfo = hariLiburList.find(h => h.tanggal === todayStr)?.keterangan || null

      if (!record) {
        // ─── PRESENSI MASUK ───
        const { isLate } = await import('../utils/timeUtils')
        const status = holidayInfo ? 'Tepat Waktu' : (isLate(jamStr) ? 'Terlambat' : 'Tepat Waktu')
        const jenis = holidayInfo ? 'piket' : 'hadir'

        const newRecord = await createAbsensiMasuk({
          nis: siswa.nis,
          nama: siswa.nama,
          kelas: siswa.kelas,
          tanggal: todayStr,
          jam_masuk: jamStr,
          foto_masuk_url: null,
          lat_masuk: null,
          lng_masuk: null,
          status,
          jenis
        })

        // Jika libur/piket, tambah saldo cuti
        if (holidayInfo) {
          try {
            const { addTabunganCutiPiket } = await import('../utils/supabase')
            await addTabunganCutiPiket({
              nis: siswa.nis,
              nama: siswa.nama,
              kelas: siswa.kelas,
              tanggal: todayStr,
              keterangan: `Piket: ${holidayInfo}`
            })
            fetchTabunganCuti()
          } catch (cutiErr) {
            console.warn('Gagal menambah saldo cuti:', cutiErr)
          }
        }

        playBeep(true)
        setScanResult({
          success: true,
          message: `Presensi MASUK berhasil dicatat pada ${jamStr.substring(0, 5)} WIB.`,
          siswa,
          isMasuk: true
        })
        fetchData()
      } else if (!record.jam_pulang) {
        // ─── PRESENSI PULANG ───
        await updateAbsensiPulang(record.id, {
          jam_pulang: jamStr,
          foto_pulang_url: null,
          lat_pulang: null,
          lng_pulang: null
        })

        playBeep(true)
        setScanResult({
          success: true,
          message: `Presensi PULANG berhasil dicatat pada ${jamStr.substring(0, 5)} WIB.`,
          siswa,
          isMasuk: false
        })
        fetchData()
      } else {
        // ─── SUDAH ABSEN SEMUA ───
        playBeep(false)
        setScanResult({
          success: false,
          message: `${siswa.nama} sudah menyelesaikan presensi masuk (${record.jam_masuk.substring(0, 5)}) & pulang (${record.jam_pulang.substring(0, 5)}) hari ini.`,
          siswa
        })
      }
    } catch (err) {
      console.error(err)
      playBeep(false)
      setScanResult({
        success: false,
        message: `Terjadi kesalahan database: ${err.message}`
      })
    } finally {
      setScanInput('')
      setScanningState('idle')
    }
  }

  // ─── Statistics ─────────────────────────────────────────────────────────────
  const todayData = absensiData.filter(r => r.tanggal === today)
  const totalHadir = todayData.length
  const totalTerlambat = todayData.filter(r => r.status === 'Terlambat').length
  const totalBelumPulang = todayData.filter(r => r.jam_masuk && !r.jam_pulang).length
  const totalTepat = todayData.filter(r => r.status === 'Tepat Waktu').length
  
  // Pending request count today
  const pendingRequestsCount = pengajuanData.filter(r => r.status_verifikasi === 'pending').length

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    setExporting(true)
    try {
      const headers = [
        'No', 'Tanggal', 'Nama', 'NIS', 'Kelas',
        'Jam Masuk', 'GPS Masuk (Lat)', 'GPS Masuk (Lng)',
        'Jam Pulang', 'GPS Pulang (Lat)', 'GPS Pulang (Lng)',
        'Status'
      ]

      const rows = absensiData.map((r, i) => [
        i + 1,
        r.tanggal,
        r.nama,
        r.nis,
        r.kelas,
        r.jam_masuk || '-',
        r.lat_masuk ?? '-',
        r.lng_masuk ?? '-',
        r.jam_pulang || '-',
        r.lat_pulang ?? '-',
        r.lng_pulang ?? '-',
        r.jam_pulang ? r.status : 'Belum Pulang',
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presensi_pkl_kai_${filterDate || 'semua'}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`${absensiData.length} baris data berhasil diekspor ke CSV!`)
    } catch (err) {
      toast.error('Gagal mengekspor data.')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  // ─── Export Excel ────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')

      const wsData = [
        ['No', 'Tanggal', 'Nama', 'NIS', 'Kelas',
         'Jam Masuk', 'GPS Masuk (Lat)', 'GPS Masuk (Lng)',
         'Jam Pulang', 'GPS Pulang (Lat)', 'GPS Pulang (Lng)', 'Status'],
        ...absensiData.map((r, i) => [
          i + 1, r.tanggal, r.nama, r.nis, r.kelas,
          r.jam_masuk || '-', r.lat_masuk ?? '-', r.lng_masuk ?? '-',
          r.jam_pulang || '-', r.lat_pulang ?? '-', r.lng_pulang ?? '-',
          r.jam_pulang ? r.status : 'Belum Pulang',
        ])
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      // Column widths
      ws['!cols'] = [
        { wch: 5 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 16 }, { wch: 16 },
        { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi PKL')

      XLSX.writeFile(wb, `presensi_pkl_kai_${filterDate || 'semua'}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success(`${absensiData.length} baris data berhasil diekspor ke Excel!`)
    } catch (err) {
      toast.error('Gagal mengekspor ke Excel.')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Presensi</h1>
            <p className="text-slate-500 text-sm mt-0.5">{formatDateID(today)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-data"
              onClick={() => { fetchData(); fetchPengajuan(); fetchTabunganCuti() }}
              disabled={loading || loadingPengajuan}
              className="btn-ghost py-2 px-3 text-sm"
            >
              <RefreshCw size={16} className={loading || loadingPengajuan ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              id="btn-export-csv"
              onClick={exportCSV}
              disabled={exporting || absensiData.length === 0}
              className="btn-ghost py-2 px-3 text-sm text-emerald-600 border-emerald-200 hover:border-emerald-300"
            >
              <Download size={16} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              id="btn-export-excel"
              onClick={exportExcel}
              disabled={exporting || absensiData.length === 0}
              className="btn-primary py-2 px-4 text-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              <span>Excel</span>
            </button>
            <button
              id="btn-terminal-scan"
              onClick={() => { setShowTerminal(true); setScanResult(null); setScanInput('') }}
              className="btn-primary py-2 px-4 text-sm bg-kai-blue-600 hover:bg-kai-blue-700 text-white border-none flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/><path d="M12 7v10"/></svg>
              <span>Terminal Scan QR</span>
            </button>
          </div>
        </div>

        {/* Stat cards — today */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-slide-up">
          <StatCard
            icon={Users}
            label="Hadir Hari Ini"
            value={totalHadir}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Tepat Waktu"
            value={totalTepat}
            color="green"
          />
          <StatCard
            icon={AlertCircle}
            label="Terlambat"
            value={totalTerlambat}
            color="red"
          />
          <StatCard
            icon={Clock}
            label="Belum Pulang"
            value={totalBelumPulang}
            color="amber"
          />
          <StatCard
            icon={FileText}
            label="Pengajuan Pending"
            value={pendingRequestsCount}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 mb-5">
          <button
            onClick={() => setActiveTab('absensi')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'absensi'
                ? 'border-kai-blue-500 text-kai-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 Rekap Absensi
          </button>
          <button
            onClick={() => setActiveTab('pengajuan')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pengajuan'
                ? 'border-kai-blue-500 text-kai-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📝 Pengajuan Ketidakhadiran
            {pendingRequestsCount > 0 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tabungan_cuti')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'tabungan_cuti'
                ? 'border-kai-blue-500 text-kai-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            🏖️ Tabungan Cuti
          </button>
        </div>

        {/* Filters */}
        <div className="card shadow-sm mb-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="filter-search"
                type="text"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="Cari nama atau NIS..."
                className="input-field pl-10 py-2.5 text-sm"
              />
            </div>

            {/* Date filter */}
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="input-field pl-10 py-2.5 text-sm w-full sm:w-44"
              />
            </div>

            {/* Clear */}
            {(filterDate || filterSearch) && (
              <button
                id="btn-clear-filter"
                onClick={() => { setFilterDate(''); setFilterSearch('') }}
                className="btn-ghost py-2.5 px-4 text-sm text-red-500 border-red-200 hover:border-red-300"
              >
                Hapus Filter
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">
                {activeTab === 'absensi' ? absensiData.length : pengajuanData.length}
              </span> data {activeTab === 'absensi' ? 'absensi' : 'pengajuan'}
              {filterDate && ` untuk tanggal ${filterDate}`}
              {filterSearch && ` dengan kata kunci "${filterSearch}"`}
            </span>
          </div>
        </div>

        {/* Section Hari Libur / Piket */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-slide-up">
          {/* Form Tambah */}
          <div className="card shadow-sm lg:col-span-1">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="text-kai-blue-500" size={18} />
              Tambah Hari Libur / Piket
            </h2>
            <form onSubmit={handleAddLibur} className="space-y-4">
              <div>
                <label className="label text-xs">Tanggal</label>
                <input
                  type="date"
                  value={newLiburDate}
                  onChange={e => setNewLiburDate(e.target.value)}
                  className="input-field py-2 px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Keterangan / Nama Piket</label>
                <input
                  type="text"
                  placeholder="Contoh: Piket Weekend / Libur Lebaran"
                  value={newLiburKeterangan}
                  onChange={e => setNewLiburKeterangan(e.target.value)}
                  className="input-field py-2 px-3 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loadingLibur}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {loadingLibur ? 'Menyimpan...' : 'Simpan Hari Libur'}
              </button>
            </form>
          </div>

          {/* Daftar Hari Libur */}
          <div className="card shadow-sm lg:col-span-2 flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-kai-blue-500" size={18} />
                Daftar Hari Libur / Piket Aktif
              </h2>
              <span className="text-xs bg-kai-blue-50 text-kai-blue-700 px-2.5 py-1 rounded-full font-semibold">
                {hariLiburList.length} Hari
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-64">
              {hariLiburList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada hari libur atau piket yang didaftarkan.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Tanggal</th>
                      <th className="px-4 py-2">Keterangan</th>
                      <th className="px-4 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hariLiburList.map((hl) => (
                      <tr key={hl.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs text-slate-700 font-mono">
                          {formatDateShortID(hl.tanggal)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-800 font-medium">
                          {hl.keterangan}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteLibur(hl.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Table Switch based on activeTab */}
        <div className="card shadow-sm animate-fade-in p-0 overflow-hidden">
          {activeTab === 'absensi' ? (
            <AttendanceTable data={absensiData} loading={loading} onJenisChange={handleJenisChange} />
          ) : activeTab === 'pengajuan' ? (
            <PengajuanTable data={pengajuanData} loading={loadingPengajuan} onStatusChange={handleStatusPengajuanChange} />
          ) : (
            /* ─── Tab Tabungan Cuti ─────────────────────────────────── */
            <div>
              {/* Saldo per siswa */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Gift className="text-emerald-500" size={18} />
                  Saldo Cuti per Siswa
                </h2>
                <button
                  onClick={fetchTabunganCuti}
                  disabled={loadingTabungan}
                  className="btn-ghost py-1.5 px-3 text-xs"
                >
                  <RefreshCw size={13} className={loadingTabungan ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              {loadingTabungan ? (
                <div className="p-8 text-center text-slate-400 text-sm">Memuat...</div>
              ) : tabunganCutiData.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada data tabungan cuti. Siswa perlu piket di hari libur terlebih dahulu.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">NIS</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center">Saldo Cuti</th>
                      <th className="px-4 py-3 text-right">Terakhir Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tabunganCutiData.map((tc) => (
                      <tr key={tc.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{tc.nama}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{tc.nis}</td>
                        <td className="px-4 py-3 text-slate-600">{tc.kelas}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            tc.saldo_cuti > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            🏖️ {tc.saldo_cuti} jatah
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {new Date(tc.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Riwayat Cuti */}
              <div className="p-4 border-t border-slate-100 mt-2">
                <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Clock className="text-kai-blue-500" size={16} />
                  Riwayat Pergerakan Cuti
                </h2>
                {riwayatCutiData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat cuti.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2 text-center">Jenis</th>
                          <th className="px-4 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riwayatCutiData.map((rc) => (
                          <tr key={rc.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{rc.tanggal}</td>
                            <td className="px-4 py-2 text-slate-800 font-medium">{rc.nama}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                rc.jenis === 'masuk'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {rc.jenis === 'masuk' ? '+ Piket Libur' : '− Cuti Dipakai'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-500">{rc.keterangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Data tersimpan di Supabase · Sistem Presensi PKL PT KAI Solo Balapan 2024/2025
        </div>
      </main>

      {/* Terminal Scan QR Code Modal */}
      {showTerminal && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col justify-between p-6 md:p-10 animate-fade-in text-white">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">TERMINAL SCAN QR PRESENSI</h2>
                <p className="text-slate-400 text-xs mt-0.5">Arahkan scanner fisik ke QR Code HP siswa</p>
              </div>
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
            >
              Tutup Terminal (Esc)
            </button>
          </div>

          {/* Form scanner input (selalu difokuskan secara dinamis) */}
          <form onSubmit={handleScanSubmit} className="absolute opacity-0 pointer-events-none">
            <input
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Scan NIS..."
              autoFocus
              onBlur={({ target }) => {
                // Pastikan input kembali fokus ketika kehilangan fokus secara tidak sengaja
                setTimeout(() => target.focus(), 50)
              }}
            />
          </form>

          {/* Main Visual Board */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-8">
            {scanningState === 'processing' ? (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-kai-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-300">Memproses presensi...</p>
              </div>
            ) : scanResult ? (
              <div className={`w-full rounded-3xl p-8 border text-center animate-scale-in shadow-2xl ${
                scanResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : 'bg-red-950/40 border-red-500/30'
              }`}>
                {/* Icon Success/Failed */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  scanResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {scanResult.success ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 9-6 6"/><path d="m9 9 6 6"/><circle cx="12" cy="12" r="10"/></svg>
                  )}
                </div>

                {/* Profile Card if student exists */}
                {scanResult.siswa && (
                  <div className="mb-4">
                    <div className="inline-flex w-14 h-14 bg-slate-800 text-slate-200 rounded-2xl items-center justify-center font-bold text-xl mb-3 shadow-inner">
                      {scanResult.siswa.nama.charAt(0)}
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">{scanResult.siswa.nama}</h3>
                    <p className="text-slate-400 text-sm mt-1">NIS: {scanResult.siswa.nis} · {scanResult.siswa.kelas}</p>
                  </div>
                )}

                {/* Log Result Message */}
                <div className={`mt-5 py-3 px-4 rounded-xl font-semibold text-base leading-relaxed ${
                  scanResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                }`}>
                  {scanResult.message}
                </div>
                
                <p className="text-[10px] text-slate-500 mt-6 tracking-wider uppercase">Siap memindai kartu berikutnya...</p>
              </div>
            ) : (
              /* Idle state */
              <div className="text-center animate-fade-in">
                {/* QR Laser Animation */}
                <div className="relative w-44 h-44 mx-auto mb-8 border border-dashed border-slate-700 rounded-3xl p-6 bg-slate-800/20 flex items-center justify-center">
                  <svg className="text-slate-600" xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16V10"/><path d="M21 21v-1a2 2 0 0 0-2-2h-3"/><path d="M10 21V16H4"/><path d="M10 10H4"/><path d="M16 10h5"/><rect width="1" height="1" x="7" y="7"/><rect width="1" height="1" x="16" y="7"/><rect width="1" height="1" x="7" y="16"/></svg>
                  <div className="absolute left-4 right-4 h-0.5 bg-kai-orange-500 top-1/2 -translate-y-1/2 animate-bounce shadow-[0_0_10px_rgba(242,101,34,0.8)]" />
                </div>
                
                <h3 className="text-xl font-bold tracking-tight mb-2">SIAP MEMINDAI</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Terminal aktif. Aplikasi terus-menerus mendeteksi input scanner. Anda tidak perlu mengeklik apa pun untuk memulai.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Auto-Focus Focus Input Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer panduan */}
          <div className="border-t border-slate-800 pt-5 text-center text-xs text-slate-500 flex flex-col md:flex-row md:justify-between items-center gap-2">
            <div>PT Kereta Api Indonesia (Persero) · Stasiun Solo Balapan</div>
            <div className="bg-slate-800/40 border border-slate-800 px-3 py-1 rounded-lg">
              Tips: Jika tidak merespon, klik di mana saja di area gelap layar ini.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

