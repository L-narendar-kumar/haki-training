import { del, get, set } from 'idb-keyval'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { isValidState, newGame, rollover, type Result } from './game/engine'
import type { GameEvent, GameState, Profile, TrainingPlan } from './types'

const KEY = 'haki-state'

interface Store {
  state: GameState | null
  loading: boolean
  events: GameEvent[]
  /** Apply a pure update. Return a Result to also emit events. */
  act: (fn: (s: GameState) => GameState | Result) => void
  dismissEvent: () => void
  start: (profile: Profile, plan: TrainingPlan) => void
  replace: (s: GameState) => void
  reset: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

function isResult(x: GameState | Result): x is Result {
  return 'events' in x && 'state' in x
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<GameEvent[]>([])
  const ref = useRef<GameState | null>(null)

  const commit = useCallback((next: GameState, evts: GameEvent[] = []) => {
    ref.current = next
    setState(next)
    if (evts.length) setEvents((q) => [...q, ...evts])
    set(KEY, next).catch((err) => console.error('save failed', err))
  }, [])

  const doRollover = useCallback(() => {
    if (!ref.current) return
    const r = rollover(ref.current)
    if (r.state !== ref.current) commit(r.state, r.events)
  }, [commit])

  // Load once, then roll the day over whenever the app comes back to the foreground.
  useEffect(() => {
    let alive = true
    get(KEY)
      .then((saved) => {
        if (!alive) return
        if (isValidState(saved)) {
          ref.current = saved
          setState(saved)
          doRollover()
        } else if (saved) {
          // Data from an older, incompatible version: start fresh.
          del(KEY).catch(() => {})
        }
      })
      .catch((err) => console.error('load failed', err))
      .finally(() => alive && setLoading(false))

    navigator.storage?.persist?.().catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && doRollover()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(doRollover, 60_000) // catches midnight while the app is open
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [doRollover])

  const act = useCallback(
    (fn: (s: GameState) => GameState | Result) => {
      if (!ref.current) return
      const out = fn(ref.current)
      if (isResult(out)) commit(out.state, out.events)
      else if (out !== ref.current) commit(out)
    },
    [commit],
  )

  const store: Store = {
    state,
    loading,
    events,
    act,
    dismissEvent: () => setEvents((q) => q.slice(1)),
    start: (profile, plan) =>
      commit(newGame(profile, plan), [
        {
          type: 'info',
          title: 'YOU HAVE BEEN CHOSEN',
          message: `Welcome, ${profile.name.trim() || 'Hunter'}. Your plan is ready. Clear your daily quests to grow stronger. Fail them, and there will be a penalty.`,
        },
      ]),
    replace: (s) => commit(rollover(s).state),
    reset: async () => {
      await del(KEY)
      ref.current = null
      setState(null)
      setEvents([])
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useGame(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useGame outside GameProvider')
  return s
}

/** Convenience for screens that only render after onboarding. */
export function useGameState(): GameState {
  const { state } = useGame()
  if (!state) throw new Error('no game state')
  return state
}

// ---------- Settings kept apart from game data (never exported in backups) ----------

const API_KEY = 'haki-anthropic-key'

export async function loadApiKey(): Promise<string> {
  try {
    return ((await get(API_KEY)) as string | undefined) ?? ''
  } catch {
    return ''
  }
}

export async function saveApiKey(key: string): Promise<void> {
  if (key.trim()) await set(API_KEY, key.trim())
  else await del(API_KEY)
}
