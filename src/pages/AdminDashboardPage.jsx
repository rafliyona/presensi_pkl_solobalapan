import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, Download, RefreshCw, Users, CheckCircle, Clock, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllAbsensi, getHariLibur, addHariLibur, deleteHariLibur, updateAbsensiJenis, getAllPengajuan, updateStatusPengajuan } from '../utils/supabase'
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
  const [activeTab, setActiveTab] = useState('absensi') // 'absensi' | 'pengajuan'

  // State Hari Libur / Piket
  const [hariLiburList, setHariLiburList] = useState([])
  const [newLiburDate, setNewLiburDate] = useState('')
  const [newLiburKeterangan, setNewLiburKeterangan] = useState('')
  const [loadingLibur, setLoadingLibur] = useState(false)

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
  }, [fetchHariLibur])

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
      }

      toast.success(`Pengajuan berhasil di-${status}`)
      fetchData()
      fetchPengajuan()
    } catch (err) {
      console.error(err)
      toast.error('Gagal memproses status pengajuan')
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
              onClick={() => { fetchData(); fetchPengajuan(); }}
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
              className="btn-primary py-2 px-4 text-sm"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              <span>Excel</span>
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
          ) : (
            <PengajuanTable data={pengajuanData} loading={loadingPengajuan} onStatusChange={handleStatusPengajuanChange} />
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Data tersimpan di Supabase · Sistem Presensi PKL PT KAI Solo Balapan 2024/2025
        </div>
      </main>
    </div>
  )
}

