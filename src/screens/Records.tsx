import { useEffect, useRef, useState } from 'react'
import { Chip, Modal, SystemWindow } from '../components/ui'
import { EXERCISE_BY_ID } from '../data/exercises'
import { ACHIEVEMENTS } from '../game/achievements'
import { deleteWorkout, equipTitle, isValidState, setPlan } from '../game/engine'
import {
  EQUIPMENT_LABEL,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  LIMITATION_LABEL,
  WEEKDAY_SHORT,
  bmi,
} from '../game/planner'
import { Assessment } from './Assessment'
import { loadApiKey, saveApiKey, useGame, useGameState } from '../store'
import type { Workout } from '../types'
import { formatSet } from '../game/util'

export function Records() {
  const [view, setView] = useState<'profile' | 'titles' | 'history' | 'data'>('profile')
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        <Chip active={view === 'profile'} onClick={() => setView('profile')}>
          Profile
        </Chip>
        <Chip active={view === 'titles'} onClick={() => setView('titles')}>
          Titles
        </Chip>
        <Chip active={view === 'history'} onClick={() => setView('history')}>
          History
        </Chip>
        <Chip active={view === 'data'} onClick={() => setView('data')}>
          Data
        </Chip>
      </div>
      {view === 'profile' && <ProfileView />}
      {view === 'titles' && <Titles />}
      {view === 'history' && <History />}
      {view === 'data' && <DataTools />}
    </div>
  )
}

function ProfileView() {
  const s = useGameState()
  const { act } = useGame()
  const [retake, setRetake] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const pr = s.profile

  useEffect(() => {
    loadApiKey().then(setKey)
  }, [retake])

  if (retake) {
    return (
      <Assessment
        initial={pr}
        submitLabel="Use this plan"
        onCancel={() => setRetake(false)}
        onComplete={(profile, plan) => {
          act((st) => setPlan(st, profile, plan))
          setRetake(false)
        }}
      />
    )
  }

  const rows: [string, string][] = [
    ['Goal', GOAL_LABEL[pr.goal]],
    ['Experience', EXPERIENCE_LABEL[pr.experience]],
    ['Body', `${pr.age} y · ${pr.heightCm} cm · ${pr.weightKg} kg · BMI ${bmi(pr).toFixed(1)}`],
    ['Target weight', pr.targetWeightKg ? `${pr.targetWeightKg} kg` : '—'],
    ['Equipment', EQUIPMENT_LABEL[pr.equipment]],
    ['Schedule', `${[...pr.trainingDays].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join(', ')} · ${pr.sessionMinutes} min`],
    ['Limitations', pr.limitations.length ? pr.limitations.map((l) => LIMITATION_LABEL[l]).join(', ') : 'None'],
    ['Plan', `${s.plan.name} (${s.plan.source === 'ai' ? 'AI' : 'System'})`],
  ]

  return (
    <>
      <SystemWindow title="Profile">
        <dl className="divide-y divide-edge/40 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-mute">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <button className="btn-sys mt-4 w-full py-2.5" disabled={!!s.active} onClick={() => setRetake(true)}>
          Retake assessment
        </button>
        <p className="mt-2 text-[11px] text-mute">
          Builds a new plan from updated answers. Your level, rank, stats and history are kept.
        </p>
      </SystemWindow>

      <SystemWindow title="AI coach">
        {key ? (
          <>
            <p className="text-sm">
              API key saved: <span className="font-mono text-mute">{key.slice(0, 10)}…{key.slice(-4)}</span>
            </p>
            <button
              className="mt-3 rounded border border-blood/60 px-3 py-1.5 text-xs text-blood"
              onClick={() => saveApiKey('').then(() => setKey(''))}
            >
              Remove key
            </button>
          </>
        ) : (
          <p className="text-sm text-ink/80">
            No API key saved. Choose &ldquo;AI coach&rdquo; when you retake the assessment to add one.
          </p>
        )}
        <p className="mt-3 text-[11px] text-mute">The key stays on this device and is never included in backups.</p>
      </SystemWindow>
    </>
  )
}

function Titles() {
  const s = useGameState()
  const { act } = useGame()
  const count = Object.keys(s.achievements).length
  return (
    <SystemWindow title="Titles" right={<span className="text-xs text-mute">{count} / {ACHIEVEMENTS.length}</span>}>
      <ul className="space-y-2">
        {ACHIEVEMENTS.map((a) => {
          const got = !!s.achievements[a.id]
          const equipped = s.player.title === a.id
          return (
            <li key={a.id} className={`rounded border px-3 py-2 ${got ? 'border-gold/50' : 'border-edge/50 opacity-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={`font-semibold ${got ? 'text-gold' : ''}`}>{got || !a.hidden ? a.name : '???'}</div>
                  <div className="text-xs text-mute">{got || !a.hidden ? a.description : 'Hidden title.'}</div>
                </div>
                {got && (
                  <button
                    className={`shrink-0 rounded border px-2 py-1 text-xs ${equipped ? 'border-gold text-gold' : 'border-edge text-mute'}`}
                    onClick={() => act((st) => equipTitle(st, equipped ? null : a.id))}
                  >
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </SystemWindow>
  )
}

function History() {
  const s = useGameState()
  const { act } = useGame()
  const [toDelete, setToDelete] = useState<Workout | null>(null)
  const list = [...s.workouts].reverse()

  if (list.length === 0)
    return (
      <SystemWindow title="History">
        <p className="text-sm text-mute">No workouts logged yet. Your training record will appear here.</p>
      </SystemWindow>
    )

  return (
    <>
      {list.map((w) => {
        const sets = w.entries.reduce((n, e) => n + e.sets.length, 0)
        const mins = Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))
        return (
          <details key={w.id} className="sys-window group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div>
                <div className="font-semibold">
                  {new Date(w.finishedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-mute">
                  {w.entries.length} exercises · {sets} sets · {mins} min
                </div>
              </div>
              <span className="font-display font-bold text-gold">+{w.xp} XP</span>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {w.entries.map((e, i) => {
                const ex = EXERCISE_BY_ID[e.exerciseId]
                return (
                  <div key={i}>
                    <div className="font-semibold">{ex?.name ?? e.exerciseId}</div>
                    <div className="text-xs text-mute">{e.sets.map((set) => (ex ? formatSet(ex.mode, set) : set.reps)).join(' · ')}</div>
                  </div>
                )
              })}
              <button className="mt-2 text-xs text-blood" onClick={() => setToDelete(w)}>
                Delete this workout
              </button>
            </div>
          </details>
        )
      })}
      {toDelete && (
        <Modal onClose={() => setToDelete(null)}>
          <SystemWindow title="Delete workout?" danger>
            <p className="text-sm">It will be removed from your history. XP you already earned is kept.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-sys py-2" onClick={() => setToDelete(null)}>
                Cancel
              </button>
              <button
                className="rounded border border-blood py-2 font-semibold text-blood"
                onClick={() => {
                  act((st) => deleteWorkout(st, toDelete.id))
                  setToDelete(null)
                }}
              >
                Delete
              </button>
            </div>
          </SystemWindow>
        </Modal>
      )}
    </>
  )
}

function DataTools() {
  const s = useGameState()
  const { replace, reset } = useGame()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `haki-training-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Backup downloaded.')
  }

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isValidState(parsed)) throw new Error('bad file')
      replace(parsed)
      setMsg('Backup restored.')
    } catch {
      setMsg('That file is not a valid Haki Training backup.')
    }
  }

  return (
    <>
      <SystemWindow title="Backup">
        <p className="text-sm text-ink/80">
          Your progress lives only on this phone. Export a backup now and then, so you don’t lose it if you clear your
          browser data or switch phones.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="btn-sys py-2" onClick={exportData}>
            Export
          </button>
          <button className="btn-sys py-2" onClick={() => fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importData(f)
            e.target.value = ''
          }}
        />
        {msg && <p className="mt-3 text-xs text-sys">{msg}</p>}
      </SystemWindow>

      <SystemWindow title="Danger zone" danger>
        <p className="text-sm text-ink/80">Delete all progress and start over as a new Player.</p>
        <button className="mt-3 w-full rounded border border-blood py-2 font-semibold text-blood" onClick={() => setConfirmReset(true)}>
          Reset everything
        </button>
      </SystemWindow>

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <SystemWindow title="Are you sure?" danger>
            <p className="text-sm">
              This permanently deletes {s.workouts.length} workouts, level {s.player.level} and all titles. It cannot be
              undone.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-sys py-2" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button className="rounded border border-blood py-2 font-semibold text-blood" onClick={() => reset()}>
                Delete all
              </button>
            </div>
          </SystemWindow>
        </Modal>
      )}
    </>
  )
}
