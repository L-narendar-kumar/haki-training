import { useState } from 'react'
import { SystemWindow } from '../components/ui'
import { useGame } from '../store'

export function Onboarding() {
  const { start } = useGame()
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)

  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      {step === 0 ? (
        <SystemWindow className="anim-in w-full max-w-sm text-center">
          <div className="font-display text-xs tracking-[0.3em] text-mute">◆ NOTIFICATION</div>
          <p className="mt-4 text-ink/90">
            The System has detected <span className="font-semibold text-sys sys-glow">dormant Haki</span>{' '}
            within you.
          </p>
          <p className="mt-3 text-ink/90">Train daily to awaken it. Begin?</p>
          <div className="mt-6 flex gap-3">
            <button className="btn-sys flex-1 py-3" onClick={() => setStep(1)}>
              Accept
            </button>
          </div>
          <p className="mt-4 text-[11px] text-mute">
            Your data stays on this device. Nothing is sent anywhere.
          </p>
        </SystemWindow>
      ) : (
        <SystemWindow title="Registration" className="anim-in w-full max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              start(name)
            }}
          >
            <label htmlFor="player-name" className="text-sm text-mute">
              Enter your name, Player.
            </label>
            <input
              id="player-name"
              autoFocus
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded border border-edge bg-void/60 px-3 py-3 text-lg text-ink outline-none focus:border-sys"
            />
            <button type="submit" className="btn-sys mt-5 w-full py-3" disabled={!name.trim()}>
              Begin training
            </button>
          </form>
        </SystemWindow>
      )}
    </div>
  )
}
