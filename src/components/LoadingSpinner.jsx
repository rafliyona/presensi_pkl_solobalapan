export default function LoadingSpinner({ size = 'md', text = '', color = 'blue' }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }
  const colors = {
    blue: 'border-kai-blue-500',
    orange: 'border-kai-orange-500',
    white: 'border-white',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} ${colors[color]} border-t-transparent rounded-full animate-spin`}
        style={{ borderStyle: 'solid' }}
      />
      {text && <p className="text-sm text-slate-500 font-medium">{text}</p>}
    </div>
  )
}
