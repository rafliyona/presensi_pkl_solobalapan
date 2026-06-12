import { useState } from 'react'
import { ExternalLink, ZoomIn, X, Download } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDateShortID, formatTimeDisplay } from '../utils/timeUtils'

function PhotoThumb({ url, alt }) {
  const [open, setOpen] = useState(false)

  if (!url) return <span className="text-slate-400 text-xs">—</span>

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative group rounded-lg overflow-hidden border border-slate-200 hover:border-kai-blue-300 transition-colors"
        style={{ width: 48, height: 48 }}
      >
        <img src={url} alt={alt} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn size={14} className="text-white" />
        </div>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={url} alt={alt} className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-slate-100"
            >
              <X size={16} className="text-slate-700" />
            </button>
            <a
              href={url}
              download={alt}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white rounded-xl px-3 py-2
                         text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow"
            >
              <Download size={12} />
              Unduh
            </a>
          </div>
        </div>
      )}
    </>
  )
}

function GPSLink({ lat, lng }) {
  if (!lat || !lng) return <span className="text-slate-400 text-xs">—</span>
  const url = `https://maps.google.com/?q=${lat},${lng}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-kai-blue-600 hover:text-kai-blue-800 text-xs font-medium hover:underline"
    >
      <ExternalLink size={11} />
      Maps
    </a>
  )
}

export default function AttendanceTable({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-kai-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat data absensi...</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">📋</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">Belum ada data absensi</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper rounded-xl border border-slate-200">
      <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
        <thead>
          <tr className="bg-gradient-to-r from-kai-blue-700 to-kai-blue-800 text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide rounded-tl-xl">No</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Tanggal</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Nama</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">NIS</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Kelas</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Jam Masuk</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Foto Masuk</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">GPS Masuk</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Jam Pulang</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Foto Pulang</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">GPS Pulang</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide rounded-tr-xl">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-t border-slate-100 transition-colors hover:bg-kai-blue-50/50 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
              <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                {formatDateShortID(row.tanggal)}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800 text-xs whitespace-nowrap max-w-xs">
                {row.nama}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs font-mono">{row.nis}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{row.kelas}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-slate-700 text-xs font-medium">
                  {formatTimeDisplay(row.jam_masuk)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <PhotoThumb url={row.foto_masuk_url} alt={`selfie-masuk-${row.nis}`} />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <GPSLink lat={row.lat_masuk} lng={row.lng_masuk} />
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-slate-700 text-xs font-medium">
                  {formatTimeDisplay(row.jam_pulang) || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <PhotoThumb url={row.foto_pulang_url} alt={`selfie-pulang-${row.nis}`} />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <GPSLink lat={row.lat_pulang} lng={row.lng_pulang} />
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={row.jam_pulang ? row.status : 'Belum Pulang'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
