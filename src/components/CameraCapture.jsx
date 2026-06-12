import { useRef, useCallback, useState, useEffect } from 'react'
import { Camera, RefreshCw, Check, X, AlertCircle, Video } from 'lucide-react'

/**
 * CameraCapture Component
 * Opens the device camera, shows a live feed, and captures a photo.
 * onCapture(base64DataUrl) is called when user confirms the photo.
 */
export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [phase, setPhase] = useState('loading') // loading | preview | captured | error
  const [capturedImage, setCapturedImage] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [facingMode, setFacingMode] = useState('user') // user | environment

  const startCamera = useCallback(async (facing = 'user') => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    setPhase('loading')
    setErrorMsg('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('preview')
    } catch (err) {
      let msg = 'Tidak dapat mengakses kamera.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak ditemukan pada perangkat ini.'
      } else if (err.name === 'NotReadableError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain.'
      }
      setErrorMsg(msg)
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      // Cleanup: stop stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [startCamera, facingMode])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    // Mirror the image (since video is mirrored)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    setPhase('captured')
    // Stop stream after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  const retake = () => {
    setCapturedImage(null)
    startCamera(facingMode)
  }

  const confirm = () => {
    if (capturedImage) onCapture(capturedImage)
  }

  const toggleCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="camera-feed aspect-video bg-slate-900 rounded-2xl overflow-hidden relative"
           style={{ maxHeight: '320px' }}>

        {/* Video preview */}
        {phase !== 'error' && phase !== 'captured' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Captured image */}
        {phase === 'captured' && capturedImage && (
          <img src={capturedImage} alt="Foto selfie" className="w-full h-full object-cover" />
        )}

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
            <Video className="text-kai-blue-400 animate-pulse" size={32} />
            <p className="text-slate-300 text-sm">Memulai kamera...</p>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="text-red-400" size={28} />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="btn-primary text-sm py-2 px-4"
            >
              <RefreshCw size={14} />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Preview overlay — corner frame */}
        {phase === 'preview' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-kai-orange-400 rounded-tl" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-kai-orange-400 rounded-tr" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-kai-orange-400 rounded-bl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-kai-orange-400 rounded-br" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
              Posisikan wajah dalam bingkai
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          id="btn-camera-cancel"
          onClick={onCancel}
          className="btn-ghost flex-1 py-2.5 text-sm"
        >
          <X size={16} />
          Batal
        </button>

        {phase === 'preview' && (
          <>
            <button
              id="btn-toggle-camera"
              onClick={toggleCamera}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Ganti kamera"
            >
              <RefreshCw size={18} className="text-slate-600" />
            </button>
            <button
              id="btn-capture-photo"
              onClick={capturePhoto}
              className="btn-orange flex-1 py-2.5 text-sm pulse-ring"
            >
              <Camera size={16} />
              Ambil Foto
            </button>
          </>
        )}

        {phase === 'captured' && (
          <>
            <button
              id="btn-retake-photo"
              onClick={retake}
              className="btn-ghost flex-1 py-2.5 text-sm"
            >
              <RefreshCw size={16} />
              Ulangi
            </button>
            <button
              id="btn-confirm-photo"
              onClick={confirm}
              className="btn-primary flex-1 py-2.5 text-sm"
            >
              <Check size={16} />
              Gunakan Foto
            </button>
          </>
        )}

        {phase === 'error' && (
          <button
            id="btn-skip-camera"
            onClick={() => onCapture(null)}
            className="btn-ghost flex-1 py-2.5 text-sm text-amber-600 border-amber-200 hover:border-amber-300"
          >
            Lewati Foto
          </button>
        )}
      </div>
    </div>
  )
}
