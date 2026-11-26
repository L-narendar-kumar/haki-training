import { useEffect, type ReactNode } from 'react'

export function SystemWindow({
  title,
  right,
  danger,
  className = '',
  children,
}: {
  title?: string
  right?: ReactNode
  danger?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`sys-window ${danger ? 'danger' : ''} p-4 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2
            className={`font-display text-sm font-bold tracking-[0.2em] uppercase ${
              danger ? 'text-blood' : 'text-sys sys-glow'
            }`}
          >
            [ {title} ]
          </h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Bar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div
        className={`h-full rounded-full ${danger ? 'bg-blood' : 'bar-fill'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="anim-in max-h-[88dvh] w-full max-w-md overflow-y-auto p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
        active ? 'border-sys bg-sys/15 text-sys' : 'border-edge text-mute'
      }`}
    >
      {children}
    </button>
  )
}
