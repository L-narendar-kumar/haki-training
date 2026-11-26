import { useState } from 'react'
import { SystemWindow } from '../components/ui'
import { useGame } from '../store'
import { Assessment } from './Assessment'

export function Onboarding() {
  const { start } = useGame()
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-4">
      {!accepted ? (
        <SystemWindow className="anim-in w-full text-center">
          <div className="font-display text-xs tracking-[0.3em] text-mute">◆ NOTIFICATION</div>
          <p className="mt-4 text-ink/90">
            The System has detected <span className="font-semibold text-sys sys-glow">dormant Haki</span> within you.
          </p>
          <p className="mt-3 text-ink/90">
            Complete a short assessment and the System will build a training plan around your goal.
          </p>
          <button className="btn-sys mt-6 w-full py-3" onClick={() => setAccepted(true)}>
            Accept
          </button>
          <p className="mt-4 text-[11px] text-mute">Your data stays on this device. Nothing is sent anywhere.</p>
        </SystemWindow>
      ) : (
        <div className="w-full">
          <Assessment onComplete={start} submitLabel="Accept & begin" />
        </div>
      )}
    </div>
  )
}
