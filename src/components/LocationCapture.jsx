import { useState, useEffect } from 'react'
import { MapPin, RefreshCw, AlertCircle, ExternalLink, Navigation } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

/**
 * LocationCapture Component
 * Requests GPS permission and captures lat/lng.
 * onCapture({ lat, lng }) is called with coordinates.
 */
export default function LocationCapture({ onCapture, onCancel }) {
  const [phase, setPhase] = useState('requesting') // requesting | success | error
  const [coords, setCoords] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [accuracy, setAccuracy] = useState(null)

  const requestLocation = () => {
    setPhase('requesting')
    setErrorMsg('')

    if (!navigator.geolocation) {
      setErrorMsg('Browser Anda tidak mendukung fitur GPS/Geolocation.')
      setPhase('error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords
        setCoords({ lat: latitude, lng: longitude })
        setAccuracy(Math.round(acc))
        setPhase('success')
      },
      (err) => {
        let msg = 'Gagal mendapatkan lokasi GPS.'
        if (err.code === 1) {
          msg = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser Anda.'
        } else if (err.code === 2) {
          msg = 'Lokasi tidak tersedia. Pastikan GPS perangkat Anda aktif.'
        } else if (err.code === 3) {
          msg = 'Waktu habis. Pastikan GPS aktif dan coba lagi.'
        }
        setErrorMsg(msg)
        setPhase('error')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  const mapsUrl = coords
    ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
    : '#'

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* State: Requesting */}
      {phase === 'requesting' && (
        <div className="bg-kai-blue-50 border border-kai-blue-100 rounded-2xl p-6 flex flex-col items-center gap-3">
          <LoadingSpinner size="md" color="blue" />
          <div className="text-center">
            <p className="text-kai-blue-700 font-semibold text-sm">Mengambil lokasi GPS...</p>
            <p className="text-kai-blue-500 text-xs mt-1">Mohon izinkan akses lokasi di browser</p>
          </div>
        </div>
      )}

      {/* State: Success */}
      {phase === 'success' && coords && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Navigation className="text-emerald-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-700 font-semibold text-sm">Lokasi Berhasil Diambil</p>
              <div className="mt-2 space-y-1">
                <p className="text-slate-600 text-xs font-mono">
                  Lat: {coords.lat.toFixed(6)}
                </p>
                <p className="text-slate-600 text-xs font-mono">
                  Lng: {coords.lng.toFixed(6)}
                </p>
                {accuracy && (
                  <p className="text-slate-500 text-xs">
                    Akurasi: ±{accuracy} meter
                  </p>
                )}
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-kai-blue-600 text-xs font-medium hover:underline"
              >
                <ExternalLink size={12} />
                Lihat di Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* State: Error */}
      {phase === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-red-500" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-red-700 font-semibold text-sm">Gagal Mendapatkan Lokasi</p>
              <p className="text-red-600 text-xs mt-1 leading-relaxed">{errorMsg}</p>
              <button
                onClick={requestLocation}
                className="inline-flex items-center gap-1 mt-3 text-red-600 text-xs font-medium
                           bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          id="btn-location-cancel"
          onClick={onCancel}
          className="btn-ghost flex-1 py-2.5 text-sm"
        >
          Batal
        </button>

        {phase === 'success' && (
          <button
            id="btn-confirm-location"
            onClick={() => onCapture(coords)}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            <MapPin size={16} />
            Konfirmasi Lokasi
          </button>
        )}

        {phase === 'error' && (
          <button
            id="btn-skip-location"
            onClick={() => onCapture({ lat: null, lng: null })}
            className="btn-ghost flex-1 py-2.5 text-sm text-amber-600 border-amber-200"
          >
            Lewati GPS
          </button>
        )}
      </div>
    </div>
  )
}
