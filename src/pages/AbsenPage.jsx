import { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, Clock, CheckCircle, Camera, MapPin,
         AlertCircle, Info, Zap, ZapOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import { supabase, createAbsensiMasuk, updateAbsensiPulang, uploadSelfie, addTabunganCutiPiket } from '../utils/supabase'
import { getTodayString, getTimeString, getNowWIB, formatDateID,
         isLate, isPulangTime, getCountdownTo16, generateSelfieFilename } from '../utils/timeUtils'
import CameraCapture from '../components/CameraCapture'
import LocationCapture from '../components/LocationCapture'
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'

const STEPS = {
  IDLE: 'idle',
  CAMERA: 'camera',
  LOCATION: 'location',
  CONFIRMING: 'confirming',
  SUBMITTING: 'submitting',
}

function ClockDisplay() {
  const [time, setTime] = useState(getTimeString())
  const [date, setDate] = useState(formatDateID(getTodayString()))

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-kai-blue-700 font-mono tracking-tight tabular-nums">
        {time}
      </div>
      <div className="text-slate-500 text-sm mt-1">{date}</div>
    </div>
  )
}

function CountdownBadge({ isDemoMode, targetTimeStr = '16:00' }) {
  const [countdown, setCountdown] = useState(getCountdownTo16(targetTimeStr))

  useEffect(() => {
    if (isDemoMode) return
    setCountdown(getCountdownTo16(targetTimeStr))
    const t = setInterval(() => setCountdown(getCountdownTo16(targetTimeStr)), 1000)
    return () => clearInterval(t)
  }, [isDemoMode, targetTimeStr])

  if (isDemoMode || !countdown) return null

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
      <Clock size={15} className="text-amber-500" />
      <span className="text-amber-700 font-medium">
        Absen pulang tersedia dalam{' '}
        <span className="font-bold font-mono">
          {String(countdown.hours).padStart(2, '0')}:
          {String(countdown.minutes).padStart(2, '0')}:
          {String(countdown.seconds).padStart(2, '0')}
        </span>
      </span>
    </div>
  )
}

export default function AbsenPage() {
  const { session, todayRecord, isDemoMode, setIsDemoMode, refreshTodayRecord, tabunganCuti, refreshTabunganCuti, todayShift, tomorrowShift } = useApp()

  const [absenType, setAbsenType] = useState(null) // 'masuk' | 'pulang'
  const [step, setStep] = useState(STEPS.IDLE)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [capturedLocation, setCapturedLocation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [canPulang, setCanPulang] = useState(false)
  const [holidayInfo, setHolidayInfo] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)

  // Form states for Tomorrow Shift (H-1)
  const [tShiftType, setTShiftType] = useState('pagi') // 'pagi' | 'sore'
  const [tJamMulai, setTJamMulai] = useState('08:00')
  const [tJamSelesai, setTJamSelesai] = useState('16:00')
  const [submittingTomorrowShift, setSubmittingTomorrowShift] = useState(false)

  // Form states for Today Shift (Fallback jika lupa)
  const [tdShiftType, setTdShiftType] = useState('pagi')
  const [tdJamMulai, setTdJamMulai] = useState('08:00')
  const [tdJamSelesai, setTdJamSelesai] = useState('16:00')
  const [submittingTodayShift, setSubmittingTodayShift] = useState(false)

  // Auto-set default times based on shift type
  useEffect(() => {
    if (tShiftType === 'pagi') {
      setTJamMulai('08:00')
      setTJamSelesai('16:00')
    } else {
      setTJamMulai('14:00')
      setTJamSelesai('22:00')
    }
  }, [tShiftType])

  useEffect(() => {
    if (tdShiftType === 'pagi') {
      setTdJamMulai('08:00')
      setTdJamSelesai('16:00')
    } else {
      setTdJamMulai('14:00')
      setTdJamSelesai('22:00')
    }
  }, [tdShiftType])

  // Cek hari libur saat komponen dimuat
  useEffect(() => {
    const checkHoliday = async () => {
      try {
        const { data, error } = await supabase
          .from('hari_libur')
          .select('keterangan')
          .eq('tanggal', getTodayString())
          .maybeSingle()
        if (data) {
          setHolidayInfo(data.keterangan)
        }
      } catch (err) {
        console.error('Gagal memuat info hari libur:', err)
      }
    }
    checkHoliday()
  }, [])

  // Update canPulang based on shift_jam_selesai
  useEffect(() => {
    const limitPulang = todayShift?.jam_selesai || '16:00'
    setCanPulang(isPulangTime(isDemoMode, limitPulang))
    const t = setInterval(() => {
      setCanPulang(isPulangTime(isDemoMode, limitPulang))
    }, 1000)
    return () => clearInterval(t)
  }, [isDemoMode, todayShift])

  const handleSaveTomorrowShift = async (e) => {
    e.preventDefault()
    if (!session) return
    if (tJamSelesai <= tJamMulai) {
      toast.error('Jam selesai harus setelah jam mulai!')
      return
    }
    setSubmittingTomorrowShift(true)
    try {
      const { createOrUpdateRencanaShift } = await import('../utils/supabase')
      const tomorrow = getTomorrowString()
      await createOrUpdateRencanaShift({
        nis: session.nis,
        nama: session.nama,
        kelas: session.kelas,
        tanggal: tomorrow,
        shift: tShiftType,
        jam_mulai: tJamMulai,
        jam_selesai: tJamSelesai,
      })
      toast.success('Shift besok berhasil disimpan!')
      await refreshTodayRecord()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan shift besok.')
    } finally {
      setSubmittingTomorrowShift(false)
    }
  }

  const handleSaveTodayShift = async (e) => {
    e.preventDefault()
    if (!session) return
    if (tdJamSelesai <= tdJamMulai) {
      toast.error('Jam selesai harus setelah jam mulai!')
      return
    }
    setSubmittingTodayShift(true)
    try {
      const { createOrUpdateRencanaShift } = await import('../utils/supabase')
      const today = getTodayString()
      await createOrUpdateRencanaShift({
        nis: session.nis,
        nama: session.nama,
        kelas: session.kelas,
        tanggal: today,
        shift: tdShiftType,
        jam_mulai: tdJamMulai,
        jam_selesai: tdJamSelesai,
      })
      toast.success('Shift hari ini berhasil disimpan!')
      await refreshTodayRecord()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan shift hari ini.')
    } finally {
      setSubmittingTodayShift(false)
    }
  }

  const hasMasuk = !!todayRecord?.jam_masuk
  const hasPulang = !!todayRecord?.jam_pulang

  const startAbsen = (type) => {
    setAbsenType(type)
    setCapturedPhoto(null)
    setCapturedLocation(null)
    setStep(STEPS.CAMERA)
  }

  const handlePhotoCapture = (photo) => {
    setCapturedPhoto(photo)
    setStep(STEPS.LOCATION)
  }

  const handleLocationCapture = (loc) => {
    setCapturedLocation(loc)
    setStep(STEPS.CONFIRMING)
  }

  const handleCancel = () => {
    setAbsenType(null)
    setCapturedPhoto(null)
    setCapturedLocation(null)
    setStep(STEPS.IDLE)
  }

  const handleSubmit = useCallback(async () => {
    if (!session) return
    setSubmitting(true)
    setStep(STEPS.SUBMITTING)

    try {
      const now = getNowWIB()
      const jamStr = getTimeString(now)
      const tanggal = getTodayString()

      // Upload photo to Supabase Storage
      let fotoUrl = null
      if (capturedPhoto) {
        const filename = generateSelfieFilename(session.nis, absenType)
        try {
          fotoUrl = await uploadSelfie(capturedPhoto, filename)
        } catch (uploadErr) {
          console.warn('Photo upload failed, continuing without photo:', uploadErr)
          // Fall back: store base64 inline (for demo / when storage bucket not set up)
          fotoUrl = capturedPhoto
        }
      }

      if (absenType === 'masuk') {
        const limitTime = todayShift?.jam_mulai || '08:00'
        const status = holidayInfo ? 'Tepat Waktu' : (isLate(jamStr, limitTime) ? 'Terlambat' : 'Tepat Waktu')
        await createAbsensiMasuk({
          nis: session.nis,
          nama: session.nama,
          kelas: session.kelas,
          tanggal,
          jam_masuk: jamStr,
          foto_masuk_url: fotoUrl,
          lat_masuk: capturedLocation?.lat ?? null,
          lng_masuk: capturedLocation?.lng ?? null,
          status,
          jenis: holidayInfo ? 'piket' : 'hadir',
          shift: todayShift?.shift ?? null,
          shift_jam_mulai: todayShift?.jam_mulai ?? null,
          shift_jam_selesai: todayShift?.jam_selesai ?? null,
        })

        // Jika hari libur/piket → tambah +1 tabungan cuti
        if (holidayInfo) {
          try {
            await addTabunganCutiPiket({
              nis: session.nis,
              nama: session.nama,
              kelas: session.kelas,
              tanggal,
              keterangan: `Piket: ${holidayInfo}`,
            })
            await refreshTabunganCuti()
            toast.success(
              `Absen masuk berhasil! +1 tabungan cuti 🎉`,
              { icon: '🗓️', duration: 5000 }
            )
          } catch (cutiErr) {
            console.warn('Gagal tambah tabungan cuti:', cutiErr)
            toast.success(
              `Absen masuk berhasil! Status: ${status}`,
              { icon: '✅', duration: 4000 }
            )
          }
        } else {
          toast.success(
            `Absen masuk berhasil! Status: ${status}`,
            { icon: status === 'Tepat Waktu' ? '✅' : '⚠️', duration: 4000 }
          )
        }
      } else {
        if (!todayRecord?.id) throw new Error('Data absen masuk tidak ditemukan')
        await updateAbsensiPulang(todayRecord.id, {
          jam_pulang: jamStr,
          foto_pulang_url: fotoUrl,
          lat_pulang: capturedLocation?.lat ?? null,
          lng_pulang: capturedLocation?.lng ?? null,
        })
        toast.success('Absen pulang berhasil! Selamat pulang 👋', { duration: 4000 })
      }

      await refreshTodayRecord()
      handleCancel()
    } catch (err) {
      console.error('Submit error:', err)
      toast.error(err.message || 'Gagal menyimpan absensi. Coba lagi.')
      setStep(STEPS.CONFIRMING)
    } finally {
      setSubmitting(false)
    }
  }, [session, absenType, capturedPhoto, capturedLocation, todayRecord, refreshTodayRecord, todayShift, holidayInfo])

  // Determine pulang button state
  const pulangDisabled = !hasMasuk || hasPulang || !canPulang
  const { todayPengajuan } = useApp()
  const [showIzinModal, setShowIzinModal] = useState(false)
  const [izinType, setIzinType] = useState('izin') // 'izin' | 'sakit' | 'cuti' | 'piket'
  const [izinKeterangan, setIzinKeterangan] = useState('')
  const [submittingIzin, setSubmittingIzin] = useState(false)

  const handleIzinSubmit = async (e) => {
    e.preventDefault()
    if (!session) return
    setSubmittingIzin(true)
    try {
      const { createPengajuan } = await import('../utils/supabase')
      await createPengajuan({
        nis: session.nis,
        nama: session.nama,
        kelas: session.kelas,
        tanggal: getTodayString(),
        jenis: izinType,
        keterangan: izinKeterangan
      })
      toast.success('Pengajuan ketidakhadiran berhasil dikirim!')
      setShowIzinModal(false)
      setIzinKeterangan('')
      refreshTodayRecord()
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengirim pengajuan ketidakhadiran')
    } finally {
      setSubmittingIzin(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Banner Hari Libur / Piket */}
        {holidayInfo && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 flex items-start gap-3 animate-fade-in shadow-sm">
            <Info className="text-yellow-500 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm">
              <span className="font-bold text-yellow-900">Hari Libur / Piket:</span> {holidayInfo}. Anda berada dalam mode piket (tidak dihitung terlambat).
            </div>
          </div>
        )}
        {/* Clock card */}
        <div className="card shadow-sm animate-fade-in">
          <ClockDisplay />
          {/* Status today */}
          <div className="mt-4 flex gap-2">
            <div className={`flex-1 rounded-xl p-3 text-center text-xs font-medium border ${
              hasMasuk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="font-semibold mb-0.5">Masuk</div>
              {hasMasuk ? todayRecord.jam_masuk?.substring(0, 5) : '—'}
            </div>
            <div className={`flex-1 rounded-xl p-3 text-center text-xs font-medium border ${
              hasPulang ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <div className="font-semibold mb-0.5">Pulang</div>
              {hasPulang ? todayRecord.jam_pulang?.substring(0, 5) : '—'}
            </div>
            {(todayRecord?.status || todayPengajuan) && (
              <div className={`flex-1 rounded-xl p-3 text-center text-xs font-medium border ${
                todayRecord?.status === 'Tepat Waktu' || todayPengajuan?.status_verifikasi === 'disetujui'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : todayPengajuan?.status_verifikasi === 'pending'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="font-semibold mb-0.5">Status</div>
                {todayPengajuan ? (
                  <span className="capitalize">{todayPengajuan.jenis} ({todayPengajuan.status_verifikasi})</span>
                ) : todayRecord.status}
              </div>
            )}
          </div>
          {todayShift && (
            <div className="mt-3 bg-kai-blue-50 border border-kai-blue-100 rounded-xl px-3.5 py-2.5 text-xs text-kai-blue-750 flex items-center justify-between animate-fade-in shadow-inner">
              <span className="font-semibold text-kai-blue-900">Shift Aktif Hari Ini:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-kai-blue-200 uppercase font-bold text-[10px] text-kai-blue-700">
                {todayShift.shift} ({todayShift.jam_mulai.substring(0, 5)} - {todayShift.jam_selesai.substring(0, 5)})
              </span>
            </div>
          )}
        </div>

        {/* Siswa info */}
        <div className="card shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 kai-gradient rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {session?.nama?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">{session?.nama}</p>
              <p className="text-slate-500 text-xs">NIS: {session?.nis} · {session?.kelas}</p>
            </div>
            {/* Badge Saldo Cuti */}
            <div className={`flex flex-col items-center rounded-xl px-3 py-2 border ${
              (tabunganCuti?.saldo_cuti ?? 0) > 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-lg font-black leading-none">
                {tabunganCuti?.saldo_cuti ?? 0}
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 ${
                (tabunganCuti?.saldo_cuti ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                🏖️ Cuti
              </span>
            </div>
          </div>
          {(tabunganCuti?.saldo_cuti ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
              <span>🎉</span>
              <span>Kamu punya <strong>{tabunganCuti.saldo_cuti} jatah cuti</strong> dari piket hari libur!</span>
            </div>
          )}
          
          {/* Tombol QR Code */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16V10"/><path d="M21 21v-1a2 2 0 0 0-2-2h-3"/><path d="M10 21V16H4"/><path d="M10 10H4"/><path d="M16 10h5"/><rect width="1" height="1" x="7" y="7"/><rect width="1" height="1" x="16" y="7"/><rect width="1" height="1" x="7" y="16"/></svg>
              Tampilkan Kartu QR Absen
            </button>
          </div>
        </div>

        {/* Widget Pemilihan Shift Besok (H-1) */}
        {!tomorrowShift ? (
          <div className="card shadow-sm border border-kai-blue-200 bg-kai-blue-50/30 animate-fade-in">
            <h3 className="font-bold text-sm text-kai-blue-800 flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              Pilih Shift untuk Besok (H-1)
            </h3>
            <form onSubmit={handleSaveTomorrowShift} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTShiftType('pagi')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    tShiftType === 'pagi'
                      ? 'bg-kai-blue-600 border-kai-blue-600 text-white shadow'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🌅 Shift Pagi
                </button>
                <button
                  type="button"
                  onClick={() => setTShiftType('sore')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    tShiftType === 'sore'
                      ? 'bg-kai-blue-600 border-kai-blue-600 text-white shadow'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🌇 Shift Sore
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">JAM MULAI</label>
                  <input
                    type="time"
                    value={tJamMulai}
                    onChange={(e) => setTJamMulai(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-kai-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">JAM SELESAI</label>
                  <input
                    type="time"
                    value={tJamSelesai}
                    onChange={(e) => setTJamSelesai(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-kai-blue-400"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingTomorrowShift}
                className="w-full py-2.5 bg-kai-blue-600 hover:bg-kai-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {submittingTomorrowShift ? 'Menyimpan...' : 'Simpan Rencana Shift Besok'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl p-4 flex items-center justify-between text-xs animate-fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="font-bold text-emerald-900">Shift Besok Sudah Dipilih</p>
                <p className="text-slate-500 text-[10px] uppercase font-mono mt-0.5 font-bold tracking-wider">
                  {tomorrowShift.shift} ({tomorrowShift.jam_mulai.substring(0, 5)} - {tomorrowShift.jam_selesai.substring(0, 5)})
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                // To trigger edit, set states and set tomorrowShift to null temporarily
                setTShiftType(tomorrowShift.shift)
                setTJamMulai(tomorrowShift.jam_mulai.substring(0, 5))
                setTJamSelesai(tomorrowShift.jam_selesai.substring(0, 5))
                try {
                  const { supabase } = await import('../utils/supabase')
                  await supabase.from('rencana_shift').delete().eq('id', tomorrowShift.id)
                  await refreshTodayRecord()
                } catch (e) {
                  console.warn(e)
                }
              }}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 font-bold rounded-lg text-[10px] hover:bg-emerald-100 transition-colors shadow-sm"
            >
              Ubah
            </button>
          </div>
        )}

        {/* Peringatan & Form Pemilihan Shift Hari Ini jika lupa */}
        {!todayShift && !hasMasuk && (
          <div className="card shadow-sm border border-rose-200 bg-rose-50/30 animate-fade-in">
            <h3 className="font-bold text-sm text-rose-850 flex items-center gap-2 mb-1">
              <span className="text-lg">⚠️</span>
              Pilih Shift Hari Ini Terlebih Dahulu
            </h3>
            <p className="text-slate-500 text-xs mb-3">
              Anda belum mendaftarkan shift kemarin (H-1). Silakan pilih shift hari ini untuk mengaktifkan tombol Absen Masuk.
            </p>
            <form onSubmit={handleSaveTodayShift} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTdShiftType('pagi')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    tdShiftType === 'pagi'
                      ? 'bg-rose-650 border-rose-650 text-white shadow font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🌅 Shift Pagi
                </button>
                <button
                  type="button"
                  onClick={() => setTdShiftType('sore')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    tdShiftType === 'sore'
                      ? 'bg-rose-650 border-rose-650 text-white shadow font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🌇 Shift Sore
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">JAM MULAI</label>
                  <input
                    type="time"
                    value={tdJamMulai}
                    onChange={(e) => setTdJamMulai(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-rose-450"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">JAM SELESAI</label>
                  <input
                    type="time"
                    value={tdJamSelesai}
                    onChange={(e) => setTdJamSelesai(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-rose-450"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingTodayShift}
                className="w-full py-2.5 bg-rose-650 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {submittingTodayShift ? 'Menyimpan...' : 'Simpan Rencana Shift Hari Ini'}
              </button>
            </form>
          </div>
        )}

        {/* Demo mode toggle */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm cursor-pointer transition-colors ${
          isDemoMode
            ? 'bg-kai-orange-50 border-kai-orange-200 text-kai-orange-700'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
        }`}
          onClick={() => setIsDemoMode(!isDemoMode)}
          id="btn-demo-mode"
        >
          <div className="flex items-center gap-2">
            {isDemoMode ? <Zap size={16} /> : <ZapOff size={16} />}
            <span className="font-medium">Mode Demo</span>
            {isDemoMode && (
              <span className="text-xs bg-kai-orange-500 text-white px-2 py-0.5 rounded-full">Aktif</span>
            )}
          </div>
          <span className="text-xs">{isDemoMode ? 'Klik untuk nonaktifkan' : 'Klik untuk bypass jam 16:00'}</span>
        </div>

        {/* Countdown to pulang */}
        {!isDemoMode && !canPulang && <CountdownBadge isDemoMode={isDemoMode} targetTimeStr={todayShift?.jam_selesai || '16:00'} />}

        {/* Main action buttons — only show when idle */}
        {step === STEPS.IDLE && (
          <div className="grid grid-cols-1 gap-4 animate-slide-up">
            {/* Tampilkan Status Pengajuan Ketidakhadiran jika ada */}
            {todayPengajuan ? (
              <div className={`rounded-2xl p-5 border ${
                todayPengajuan.status_verifikasi === 'disetujui'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : todayPengajuan.status_verifikasi === 'ditolak'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span>📝</span>
                  Pengajuan {todayPengajuan.jenis === 'izin' ? 'Izin' : todayPengajuan.jenis === 'sakit' ? 'Sakit' : todayPengajuan.jenis === 'cuti' ? 'Cuti' : 'Libur'}
                </h3>
                <p className="text-sm mt-1 text-slate-600">
                  Status: <strong className="capitalize">{todayPengajuan.status_verifikasi}</strong>
                </p>
                {todayPengajuan.keterangan && (
                  <p className="text-xs mt-2 italic bg-white/50 p-2.5 rounded-lg">
                    "{todayPengajuan.keterangan}"
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* ABSEN MASUK */}
                <button
                  id="btn-absen-masuk"
                  onClick={() => startAbsen('masuk')}
                  disabled={hasMasuk || !todayShift}
                  className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 ${
                    hasMasuk
                      ? 'bg-emerald-50 border-2 border-emerald-200 cursor-default'
                      : !todayShift
                        ? 'bg-slate-100 border-2 border-slate-200 cursor-not-allowed opacity-75'
                        : 'bg-gradient-to-br from-kai-blue-500 to-kai-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 border-2 border-transparent'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    hasMasuk ? 'bg-emerald-100' : !todayShift ? 'bg-slate-200' : 'bg-white/20'
                  }`}>
                    {hasMasuk ? (
                      <CheckCircle className="text-emerald-600" size={22} />
                    ) : (
                      <LogIn className={!todayShift ? 'text-slate-400' : 'text-white'} size={22} />
                    )}
                  </div>
                  <p className={`font-bold text-lg ${hasMasuk ? 'text-emerald-700' : !todayShift ? 'text-slate-500' : 'text-white'}`}>
                    {hasMasuk ? 'Sudah Absen Masuk' : 'Absen Masuk'}
                  </p>
                  <p className={`text-sm mt-0.5 ${hasMasuk ? 'text-emerald-600' : !todayShift ? 'text-slate-400' : 'text-kai-blue-100'}`}>
                    {hasMasuk
                      ? `Dicatat pukul ${todayRecord.jam_masuk?.substring(0, 5)} WIB`
                      : !todayShift
                        ? 'Harap pilih shift hari ini terlebih dahulu'
                        : 'Klik untuk absen kehadiran'
                    }
                  </p>
                  {todayShift && !hasMasuk && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-kai-blue-100">
                      <Camera size={12} />
                      <span>Foto Selfie</span>
                      <span>+</span>
                      <MapPin size={12} />
                      <span>GPS</span>
                    </div>
                  )}
                </button>

                {/* ABSEN PULANG */}
                <button
                  id="btn-absen-pulang"
                  onClick={() => startAbsen('pulang')}
                  disabled={pulangDisabled}
                  className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 ${
                    hasPulang
                      ? 'bg-emerald-50 border-2 border-emerald-200 cursor-default'
                      : pulangDisabled
                        ? 'bg-slate-100 border-2 border-slate-200 cursor-not-allowed opacity-75'
                        : 'orange-gradient text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 border-2 border-transparent'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    hasPulang ? 'bg-emerald-100' : pulangDisabled ? 'bg-slate-200' : 'bg-white/20'
                  }`}>
                    {hasPulang ? (
                      <CheckCircle className="text-emerald-600" size={22} />
                    ) : (
                      <LogOut className={pulangDisabled ? 'text-slate-400' : 'text-white'} size={22} />
                    )}
                  </div>
                  <p className={`font-bold text-lg ${
                    hasPulang ? 'text-emerald-700' : pulangDisabled ? 'text-slate-500' : 'text-white'
                  }`}>
                    {hasPulang ? 'Sudah Absen Pulang' : 'Absen Pulang'}
                  </p>
                  <p className={`text-sm mt-0.5 ${
                    hasPulang ? 'text-emerald-600' : pulangDisabled ? 'text-slate-400' : 'text-orange-100'
                  }`}>
                    {hasPulang
                      ? `Dicatat pukul ${todayRecord.jam_pulang?.substring(0, 5)} WIB`
                      : !hasMasuk
                        ? 'Harap absen masuk terlebih dahulu'
                        : !canPulang
                          ? `Tersedia mulai pukul ${todayShift?.jam_selesai?.substring(0, 5) || '16:00'} WIB`
                          : 'Klik untuk absen kepulangan'
                    }
                  </p>
                  {!hasPulang && !pulangDisabled && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-orange-100">
                      <Camera size={12} />
                      <span>Foto Selfie</span>
                      <span>+</span>
                      <MapPin size={12} />
                      <span>GPS</span>
                    </div>
                  )}
                </button>

                {/* TOMBOL PENGAJUAN KETIDAKHADIRAN */}
                {!hasMasuk && (
                  <button
                    onClick={() => setShowIzinModal(true)}
                    className="w-full py-4 bg-white border-2 border-dashed border-slate-300 hover:border-kai-blue-500 rounded-2xl flex items-center justify-center gap-2 text-slate-600 hover:text-kai-blue-600 font-medium transition-all"
                  >
                    <span>📝</span>
                    Ajukan Ketidakhadiran (Izin / Sakit / Cuti / Libur)
                  </button>
                )}

                {/* Info saldo cuti habis */}
                {!hasMasuk && (tabunganCuti?.saldo_cuti ?? 0) === 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500">
                    <span>🏖️</span>
                    <span>Saldo cuti: <strong>0</strong> — Piket di hari libur untuk mendapatkan jatah cuti</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Multi-step flow */}
        {step !== STEPS.IDLE && step !== STEPS.SUBMITTING && (
          <div className="card shadow-sm animate-slide-up">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === STEPS.CAMERA ? 'bg-kai-blue-500 text-white' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {step === STEPS.CAMERA ? '1' : <CheckCircle size={14} />}
              </div>
              <div className={`h-0.5 flex-1 ${step !== STEPS.CAMERA ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === STEPS.LOCATION ? 'bg-kai-blue-500 text-white'
                : step === STEPS.CONFIRMING ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
              }`}>
                {step === STEPS.CONFIRMING ? <CheckCircle size={14} /> : '2'}
              </div>
              <div className={`h-0.5 flex-1 ${step === STEPS.CONFIRMING ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === STEPS.CONFIRMING ? 'bg-kai-blue-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>3</div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mb-5 -mt-2 px-1">
              <span>Foto Selfie</span>
              <span>Lokasi GPS</span>
              <span>Konfirmasi</span>
            </div>

            {/* Step header */}
            <div className={`flex items-center gap-2 mb-4 text-sm font-semibold ${
              absenType === 'masuk' ? 'text-kai-blue-700' : 'text-kai-orange-600'
            }`}>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                absenType === 'masuk'
                  ? 'bg-kai-blue-100 text-kai-blue-700'
                  : 'bg-kai-orange-100 text-kai-orange-700'
              }`}>
                {absenType === 'masuk' ? 'ABSEN MASUK' : 'ABSEN PULANG'}
              </span>
              {step === STEPS.CAMERA && '— Ambil Foto Selfie'}
              {step === STEPS.LOCATION && '— Konfirmasi Lokasi GPS'}
              {step === STEPS.CONFIRMING && '— Review & Kirim'}
            </div>

            {/* STEP: Camera */}
            {step === STEPS.CAMERA && (
              <CameraCapture
                onCapture={handlePhotoCapture}
                onCancel={handleCancel}
              />
            )}

            {/* STEP: Location */}
            {step === STEPS.LOCATION && (
              <LocationCapture
                onCapture={handleLocationCapture}
                onCancel={handleCancel}
              />
            )}

            {/* STEP: Confirm */}
            {step === STEPS.CONFIRMING && (
              <div className="space-y-4 animate-fade-in">
                {/* Photo preview */}
                {capturedPhoto && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">FOTO SELFIE</p>
                    <img
                      src={capturedPhoto}
                      alt="Preview selfie"
                      className="w-full rounded-xl object-cover border border-slate-200"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}
                {!capturedPhoto && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="text-amber-500" />
                    <span className="text-amber-700">Foto tidak tersedia (dilewati)</span>
                  </div>
                )}

                {/* Location preview */}
                {capturedLocation?.lat ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">LOKASI GPS</p>
                    <p className="text-sm font-mono text-slate-700">
                      {capturedLocation.lat.toFixed(6)}, {capturedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                    <Info size={16} className="text-amber-500" />
                    <span className="text-amber-700">Lokasi GPS tidak tersedia (dilewati)</span>
                  </div>
                )}

                {/* Info: time will be recorded now */}
                <div className="flex items-center gap-2 bg-kai-blue-50 border border-kai-blue-100 rounded-xl px-4 py-3 text-sm">
                  <Clock size={16} className="text-kai-blue-500" />
                  <span className="text-kai-blue-700">
                    Waktu absen akan dicatat saat tombol Kirim ditekan
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-cancel-confirm"
                    onClick={handleCancel}
                    className="btn-ghost flex-1 py-3"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-submit-absen"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex-1 py-3 ${absenType === 'masuk' ? 'btn-primary' : 'btn-orange'}`}
                  >
                    {submitting ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Kirim Absensi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submitting overlay */}
        {step === STEPS.SUBMITTING && (
          <div className="card shadow-sm flex flex-col items-center py-10 gap-4 animate-fade-in">
            <LoadingSpinner size="lg" color="blue" />
            <div className="text-center">
              <p className="font-semibold text-slate-700">Menyimpan absensi...</p>
              <p className="text-slate-500 text-sm mt-1">Sedang mengunggah foto & data ke server</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-kai-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Jam masuk: <strong>08:00 WIB</strong> — lewat dari jam ini akan tercatat <strong>Terlambat</strong></p>
            <p>• Jam pulang: <strong>16:00 WIB</strong> — tombol pulang aktif setelah jam ini</p>
            <p>• Absensi memerlukan akses <strong>kamera</strong> dan <strong>GPS</strong></p>
          </div>
        </div>
      </main>

      {/* Modal Izin */}
      {showIzinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📝</span> Pengajuan Ketidakhadiran
            </h3>
            
            <form onSubmit={handleIzinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">JENIS KETIDAKHADIRAN</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'izin', lbl: 'Izin', desc: 'Ada keperluan penting', emoji: '📋' },
                    { val: 'sakit', lbl: 'Sakit', desc: 'Kondisi kurang sehat', emoji: '🤒' },
                    { val: 'cuti', lbl: 'Cuti', desc: `Jatah cuti (${tabunganCuti?.saldo_cuti ?? 0} sisa)`, emoji: '🏖️', disabled: (tabunganCuti?.saldo_cuti ?? 0) === 0 },
                    { val: 'piket', lbl: 'Libur', desc: 'Hari libur / non-efektif', emoji: '📅' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => !item.disabled && setIzinType(item.val)}
                      disabled={item.disabled}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        item.disabled
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : izinType === item.val
                            ? 'border-kai-blue-500 bg-kai-blue-50/50 ring-2 ring-kai-blue-500/20'
                            : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-800">{item.emoji} {item.lbl}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                      {item.disabled && <div className="text-[10px] text-red-400 mt-0.5 font-semibold">Saldo habis</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">KETERANGAN / ALASAN</label>
                <textarea
                  required
                  rows={3}
                  value={izinKeterangan}
                  onChange={e => setIzinKeterangan(e.target.value)}
                  placeholder="Masukkan alasan ketidakhadiran Anda secara detail..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-kai-blue-500/20 focus:border-kai-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIzinModal(false)}
                  className="btn-ghost flex-1 py-2.5 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingIzin}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  {submittingIzin ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Kirim Pengajuan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code Siswa */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-scale-in">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className="text-center pt-2">
              <span className="inline-block bg-kai-blue-50 text-kai-blue-700 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full mb-3">
                KARTU PRESENSI DIGITAL
              </span>
              <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{session?.nama}</h3>
              <p className="text-slate-500 text-xs">NIS: {session?.nis} · {session?.kelas}</p>

              {/* QR Container */}
              <div className="my-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${session?.nis}&margin=10`}
                  alt={`QR Code NIS ${session?.nis}`}
                  className="w-48 h-48 mx-auto rounded-lg object-contain bg-white"
                  loading="lazy"
                />
              </div>

              <p className="text-slate-400 text-xs px-2 mb-2 leading-relaxed">
                Tunjukkan QR Code ini ke Scanner Pembimbing/Admin untuk mencatat kehadiran masuk atau pulang.
              </p>
              
              <button
                onClick={() => setShowQRModal(false)}
                className="w-full btn-primary py-2.5 text-sm mt-2"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
