import { useGame } from '../store'
import type { GameEvent } from '../types'

function content(e: GameEvent): { heading: string; body: string; tone: 'sys' | 'gold' | 'blood' } {
  switch (e.type) {
    case 'xp':
      return { heading: `+${e.amount} XP`, body: e.reason, tone: 'sys' }
    case 'levelUp':
      return {
        heading: 'LEVEL UP!',
        body: `You have reached Level ${e.level}. +${e.points} stat points available.`,
        tone: 'gold',
      }
    case 'rankUp':
      return { heading: `RANK ${e.rank}`, body: `Your rank has risen to ${e.rank}-Rank.`, tone: 'gold' }
    case 'questClear':
      return {
        heading: 'QUEST COMPLETE',
        body: `${e.title}${e.xp > 0 ? ` — reward: +${e.xp} XP` : ''}`,
        tone: 'sys',
      }
    case 'achievement':
      return {
        heading: 'TITLE ACQUIRED',
        body: `“${e.name}” — ${e.description} You can equip it in Records.`,
        tone: 'gold',
      }
    case 'penalty':
      return { heading: 'PENALTY', body: e.message, tone: 'blood' }
    case 'info':
      return { heading: e.title, body: e.message, tone: 'sys' }
  }
}

/** Shows queued System notifications one at a time. Tap to dismiss. */
export function Popups() {
  const { events, dismissEvent } = useGame()
  if (events.length === 0) return null
  const { heading, body, tone } = content(events[0])
  const color = tone === 'gold' ? 'text-gold gold-glow' : tone === 'blood' ? 'text-blood' : 'text-sys sys-glow'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
      onClick={dismissEvent}
      role="alertdialog"
      aria-live="assertive"
    >
      <div key={events.length} className={`sys-window anim-in w-full max-w-sm p-5 text-center ${tone === 'blood' ? 'danger' : ''}`}>
        <div className="mb-2 font-display text-xs tracking-[0.3em] text-mute">
          {tone === 'blood' ? '⚠ WARNING' : '◆ NOTIFICATION'}
        </div>
        <div className={`font-display text-3xl font-bold tracking-wider ${color}`}>{heading}</div>
        <p className="mt-3 text-sm leading-relaxed text-ink/90">{body}</p>
        <div className="mt-5 text-[11px] tracking-widest text-mute">
          TAP TO CONTINUE{events.length > 1 ? ` · ${events.length - 1} MORE` : ''}
        </div>
      </div>
    </div>
  )
}
