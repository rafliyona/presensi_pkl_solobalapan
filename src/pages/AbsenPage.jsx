import { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, Clock, CheckCircle, Camera, MapPin,
         AlertCircle, Info, Zap, ZapOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import { createAbsensiMasuk, updateAbsensiPulang, uploadSelfie } from '../utils/supabase'
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

function CountdownBadge({ isDemoMode }) {
  const [countdown, setCountdown] = useState(getCountdownTo16())

  useEffect(() => {
    if (isDemoMode) return
    const t = setInterval(() => setCountdown(getCountdownTo16()), 1000)
    return () => clearInterval(t)
  }, [isDemoMode])

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
  const { session, todayRecord, isDemoMode, setIsDemoMode, refreshTodayRecord } = useApp()

  const [absenType, setAbsenType] = useState(null) // 'masuk' | 'pulang'
  const [step, setStep] = useState(STEPS.IDLE)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [capturedLocation, setCapturedLocation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [canPulang, setCanPulang] = useState(isPulangTime(isDemoMode))

  // Update canPulang every second
  useEffect(() => {
    const t = setInterval(() => setCanPulang(isPulangTime(isDemoMode)), 1000)
    return () => clearInterval(t)
  }, [isDemoMode])

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
        const status = isLate(jamStr) ? 'Terlambat' : 'Tepat Waktu'
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
        })
        toast.success(
          `Absen masuk berhasil! Status: ${status}`,
          { icon: status === 'Tepat Waktu' ? '✅' : '⚠️', duration: 4000 }
        )
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
  }, [session, absenType, capturedPhoto, capturedLocation, todayRecord, refreshTodayRecord])

  // Determine pulang button state
  const pulangDisabled = !hasMasuk || hasPulang || !canPulang

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5">
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
            {todayRecord?.status && (
              <div className={`flex-1 rounded-xl p-3 text-center text-xs font-medium border ${
                todayRecord.status === 'Tepat Waktu'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="font-semibold mb-0.5">Status</div>
                {todayRecord.status}
              </div>
            )}
          </div>
        </div>

        {/* Siswa info */}
        <div className="card shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 kai-gradient rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {session?.nama?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{session?.nama}</p>
              <p className="text-slate-500 text-xs">NIS: {session?.nis} · {session?.kelas}</p>
            </div>
          </div>
        </div>

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
        {!isDemoMode && !canPulang && <CountdownBadge isDemoMode={isDemoMode} />}

        {/* Main action buttons — only show when idle */}
        {step === STEPS.IDLE && (
          <div className="grid grid-cols-1 gap-4 animate-slide-up">
            {/* ABSEN MASUK */}
            <button
              id="btn-absen-masuk"
              onClick={() => startAbsen('masuk')}
              disabled={hasMasuk}
              className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 ${
                hasMasuk
                  ? 'bg-emerald-50 border-2 border-emerald-200 cursor-default'
                  : 'bg-gradient-to-br from-kai-blue-500 to-kai-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 border-2 border-transparent'
              }`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                hasMasuk ? 'bg-emerald-100' : 'bg-white/20'
              }`}>
                {hasMasuk ? (
                  <CheckCircle className="text-emerald-600" size={22} />
                ) : (
                  <LogIn className="text-white" size={22} />
                )}
              </div>
              <p className={`font-bold text-lg ${hasMasuk ? 'text-emerald-700' : 'text-white'}`}>
                {hasMasuk ? 'Sudah Absen Masuk' : 'Absen Masuk'}
              </p>
              <p className={`text-sm mt-0.5 ${hasMasuk ? 'text-emerald-600' : 'text-kai-blue-100'}`}>
                {hasMasuk
                  ? `Dicatat pukul ${todayRecord.jam_masuk?.substring(0, 5)} WIB`
                  : 'Klik untuk absen kehadiran'
                }
              </p>
              <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${
                hasMasuk ? 'text-emerald-600' : 'text-kai-blue-100'
              }`}>
                <Camera size={12} />
                <span>Foto Selfie</span>
                <span>+</span>
                <MapPin size={12} />
                <span>GPS</span>
              </div>
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
                      ? 'Tersedia mulai pukul 16:00 WIB'
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
    </div>
  )
}
