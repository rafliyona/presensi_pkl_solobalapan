import { CheckCircle, Clock, AlertCircle, Calendar, Users } from 'lucide-react'

export default function StatusBadge({ status, jenis }) {
  if (jenis) {
    const styles = {
      hadir: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      piket: 'bg-amber-100 text-amber-700 border-amber-200',
      izin: 'bg-blue-100 text-blue-700 border-blue-200',
      sakit: 'bg-orange-100 text-orange-700 border-orange-200',
      libur: 'bg-slate-100 text-slate-700 border-slate-200',
      cuti: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    }

    const icons = {
      hadir: <CheckCircle size={12} />,
      piket: <Clock size={12} />,
      izin: <Calendar size={12} />,
      sakit: <AlertCircle size={12} />,
      libur: <Calendar size={12} />,
      cuti: <Users size={12} />,
    }

    if (styles[jenis]) {
      return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${styles[jenis]}`}>
          {icons[jenis]}
          {jenis === 'cuti' ? 'Cuti' : jenis.charAt(0).toUpperCase() + jenis.slice(1)}
        </span>
      )
    }
  }

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


