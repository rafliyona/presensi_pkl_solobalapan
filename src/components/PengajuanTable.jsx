import { useState } from 'react'
import { formatDateShortID } from '../utils/timeUtils'

export default function PengajuanTable({ data, loading, onStatusChange }) {
  const [submittingId, setSubmittingId] = useState(null)

  const handleAction = async (id, status) => {
    setSubmittingId(id)
    try {
      await onStatusChange(id, status)
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-kai-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat data pengajuan...</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">📝</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">Belum ada pengajuan ketidakhadiran</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper rounded-xl border border-slate-200">
      <table className="w-full text-sm" style={{ minWidth: '800px' }}>
        <thead>
          <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide rounded-tl-xl">No</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Tanggal</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Nama</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">NIS</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Kelas</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Jenis</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Keterangan</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
            <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide rounded-tr-xl">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
              <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                {formatDateShortID(row.tanggal)}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800 text-xs whitespace-nowrap">
                {row.nama}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs font-mono">{row.nis}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{row.kelas}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  row.jenis === 'sakit' ? 'bg-red-50 text-red-700 border border-red-100' :
                  row.jenis === 'izin' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  row.jenis === 'acara' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                  'bg-orange-50 text-orange-700 border border-orange-100'
                }`}>
                  {row.jenis}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700 text-xs max-w-xs truncate" title={row.keterangan}>
                {row.keterangan || '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  row.status_verifikasi === 'disetujui' ? 'bg-emerald-100 text-emerald-800' :
                  row.status_verifikasi === 'ditolak' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {row.status_verifikasi}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {row.status_verifikasi === 'pending' ? (
                  <div className="flex justify-center gap-1.5">
                    <button
                      disabled={submittingId === row.id}
                      onClick={() => handleAction(row.id, 'disetujui')}
                      className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition-colors"
                    >
                      Setujui
                    </button>
                    <button
                      disabled={submittingId === row.id}
                      onClick={() => handleAction(row.id, 'ditolak')}
                      className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[11px] font-semibold transition-colors"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs font-medium">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
