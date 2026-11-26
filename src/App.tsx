import { useEffect, useState } from 'react'
import { Popups } from './components/Popups'
import { Guide } from './screens/Guide'
import { Onboarding } from './screens/Onboarding'
import { Quests } from './screens/Quests'
import { Records } from './screens/Records'
import { Status } from './screens/Status'
import { Train } from './screens/Train'
import { useGame } from './store'

type Tab = 'status' | 'quests' | 'train' | 'guide' | 'records'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'status', label: 'Status', icon: '◈' },
  { id: 'quests', label: 'Quests', icon: '❖' },
  { id: 'train', label: 'Train', icon: '⚔' },
  { id: 'guide', label: 'Guide', icon: '☰' },
  { id: 'records', label: 'Records', icon: '♛' },
]

const TAB_KEY = 'haki-tab'

function loadTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY)
    if (TABS.some((x) => x.id === t)) return t as Tab
  } catch {
    /* storage unavailable */
  }
  return 'status'
}

export default function App() {
  const { state, loading } = useGame()
  const [tab, setTab] = useState<Tab>(loadTab)

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0)
  }, [tab])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center font-display tracking-[0.3em] text-sys sys-glow">
        LOADING…
      </div>
    )
  }

  if (!state) {
    return (
      <>
        <Onboarding />
        <Popups />
      </>
    )
  }

  const unclaimed = state.daily.quests.filter((q) => !q.claimed).length

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="sticky top-0 z-30 border-b border-edge/60 bg-void/85 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
        <h1 className="font-display text-lg font-bold tracking-[0.25em] text-sys sys-glow">HAKI TRAINING</h1>
      </header>

      <main className="px-4 pt-4 pb-28">
        {tab === 'status' && <Status goTo={setTab} />}
        {tab === 'quests' && <Quests goTrain={() => setTab('train')} />}
        {tab === 'train' && <Train />}
        {tab === 'guide' && <Guide goTrain={() => setTab('train')} />}
        {tab === 'records' && <Records />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-edge/60 bg-void/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const on = tab === t.id
            const badge = (t.id === 'quests' && unclaimed > 0) || (t.id === 'train' && !!state.active)
            return (
              <li key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 ${on ? 'text-sys sys-glow' : 'text-mute'}`}
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  <span className="font-display text-[11px] font-semibold tracking-wider uppercase">{t.label}</span>
                  {badge && <span className="absolute top-1.5 right-[30%] h-2 w-2 rounded-full bg-gold" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Popups />
    </div>
  )
}
