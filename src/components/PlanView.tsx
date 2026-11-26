import { EXERCISE_BY_ID } from '../data/exercises'
import { WEEKDAY_SHORT, formatTarget, scaledTarget } from '../game/planner'
import type { Exercise, TrainingPlan } from '../types'

/** Weekly schedule strip + each day's exercises with current targets. */
export function PlanView({
  plan,
  level = 1,
  rank = 0,
  today,
  onExercise,
  dayAction,
}: {
  plan: TrainingPlan
  level?: number
  rank?: number
  today?: number
  onExercise?: (e: Exercise) => void
  dayAction?: (dayIndex: number) => React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase ${
            plan.source === 'ai' ? 'border-gold/60 text-gold' : 'border-sys/50 text-sys'
          }`}
        >
          {plan.source === 'ai' ? 'AI-designed' : 'System plan'}
        </span>
        <span className="truncate font-display text-lg font-bold">{plan.name}</span>
      </div>
      {plan.summary && <p className="mt-2 text-sm text-ink/80">{plan.summary}</p>}

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((d, wd) => {
          const idx = plan.schedule[wd]
          const on = idx !== null && idx !== undefined
          return (
            <div
              key={d}
              className={`rounded border px-0.5 py-1.5 ${on ? 'border-sys/60 bg-sys/10' : 'border-edge/50'} ${
                today === wd ? 'ring-1 ring-gold' : ''
              }`}
            >
              <div className="text-[10px] text-mute">{d}</div>
              <div className={`font-display text-sm font-bold ${on ? 'text-sys' : 'text-mute/60'}`}>
                {on ? String.fromCharCode(65 + idx) : '·'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-4">
        {plan.days.map((day, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold tracking-wider text-sys">
                {String.fromCharCode(65 + i)} · {day.name}
              </h3>
              {dayAction?.(i)}
            </div>
            <ul className="mt-1 divide-y divide-edge/40 text-sm">
              {day.exercises.map((pe) => {
                const ex = EXERCISE_BY_ID[pe.exerciseId]
                if (!ex) return null
                const t = scaledTarget(pe, level, rank)
                return (
                  <li key={pe.exerciseId}>
                    <button
                      className="flex w-full justify-between gap-3 py-2 text-left disabled:cursor-default"
                      disabled={!onExercise}
                      onClick={() => onExercise?.(ex)}
                    >
                      <span>{ex.name}</span>
                      <span className="shrink-0 tabular-nums text-mute">{formatTarget(t)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
