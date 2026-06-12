import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>

  if (status === 'Tepat Waktu') {
    return (
      <span className="status-badge-on-time">
        <CheckCircle size={12} />
        Tepat Waktu
      </span>
    )
  }

  if (status === 'Terlambat') {
    return (
      <span className="status-badge-late">
        <AlertCircle size={12} />
        Terlambat
      </span>
    )
  }

  if (status === 'Belum Pulang') {
    return (
      <span className="status-badge-pending">
        <Clock size={12} />
        Belum Pulang
      </span>
    )
  }

  return <span className="text-slate-500 text-xs">{status}</span>
}
