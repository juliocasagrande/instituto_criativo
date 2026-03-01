import { useEffect, useState } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3500)
    return () => clearTimeout(timer)
  }, [])

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
  }

  const iconStyles = {
    success: 'bg-emerald-100 text-emerald-600',
    error: 'bg-rose-100 text-rose-600',
    info: 'bg-sky-100 text-sky-600',
  }

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm transition-all duration-300 ${styles[type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${iconStyles[type]}`}>
        {icons[type]}
      </span>
      <p className="text-sm font-medium leading-snug">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        className="ml-auto text-current opacity-40 hover:opacity-70 transition-opacity text-lg leading-none">
        ×
      </button>
    </div>
  )
}