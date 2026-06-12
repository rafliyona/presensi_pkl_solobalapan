import { useState, useEffect, useCallback } from 'react'
import { Search, Calendar, Download, RefreshCw, Users, CheckCircle, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllAbsensi } from '../utils/supabase'
import { getTodayString, formatDateID } from '../utils/timeUtils'
import AttendanceTable from '../components/AttendanceTable'
import Navbar from '../components/Navbar'

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-kai-blue-50 border-kai-blue-100 text-kai-blue-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
  }
  const iconColors = {
    blue: 'bg-kai-blue-100 text-kai-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
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
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const today = getTodayString()

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

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  // ─── Statistics ─────────────────────────────────────────────────────────────
  const todayData = absensiData.filter(r => r.tanggal === today)
  const totalHadir = todayData.length
  const totalTerlambat = todayData.filter(r => r.status === 'Terlambat').length
  const totalBelumPulang = todayData.filter(r => r.jam_masuk && !r.jam_pulang).length
  const totalTepat = todayData.filter(r => r.status === 'Tepat Waktu').length

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
              onClick={fetchData}
              disabled={loading}
              className="btn-ghost py-2 px-3 text-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-up">
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
              Menampilkan <span className="font-semibold text-slate-700">{absensiData.length}</span> data absensi
              {filterDate && ` untuk tanggal ${filterDate}`}
              {filterSearch && ` dengan kata kunci "${filterSearch}"`}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow-sm animate-fade-in p-0 overflow-hidden">
          <AttendanceTable data={absensiData} loading={loading} />
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Data tersimpan di Supabase · Sistem Presensi PKL PT KAI Solo Balapan 2024/2025
        </div>
      </main>
    </div>
  )
}
