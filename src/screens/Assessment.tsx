import { useEffect, useState, type ReactNode } from 'react'
import { PlanView } from '../components/PlanView'
import { SystemWindow } from '../components/ui'
import { AI_MODEL, AiPlanError, generateAiPlan } from '../game/ai'
import {
  EQUIPMENT_LABEL,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  LIMITATION_LABEL,
  WEEKDAY_SHORT,
  bmi,
  generateRulePlan,
} from '../game/planner'
import { loadApiKey, saveApiKey } from '../store'
import type { Equipment, Experience, Goal, Limitation, Profile, Sex, TrainingPlan } from '../types'

const GOAL_HINT: Record<Goal, string> = {
  muscle: 'Grow size with moderate weights and more sets.',
  fat_loss: 'Burn fat with circuits and cardio while keeping muscle.',
  strength: 'Lift heavier with low reps on big compound lifts.',
  endurance: 'Go longer: higher reps and more cardio.',
  general: 'A balanced mix of strength and conditioning.',
}

const EXPERIENCE_HINT: Record<Experience, string> = {
  beginner: 'New to training, or less than 6 months.',
  intermediate: '6 months to 2 years of regular training.',
  advanced: '2+ years, comfortable with all the main lifts.',
}

const EQUIPMENT_HINT: Record<Equipment, string> = {
  gym: 'Barbells, machines, pull-up bar.',
  dumbbells: 'Dumbbells at home (maybe a bench).',
  none: 'Bodyweight only.',
}

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
}

const STEPS = ['Name', 'Goal', 'Experience', 'Body', 'Equipment', 'Schedule', 'Limitations', 'Plan'] as const

function blankProfile(): Profile {
  return {
    name: '',
    goal: 'general',
    experience: 'beginner',
    age: 25,
    sex: 'male',
    heightCm: 170,
    weightKg: 70,
    targetWeightKg: null,
    equipment: 'gym',
    trainingDays: DEFAULT_DAYS[3],
    sessionMinutes: 60,
    limitations: [],
  }
}

function Option({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean
  onClick: () => void
  title: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded border px-3 py-3 text-left transition-colors ${
        active ? 'border-sys bg-sys/12 shadow-[0_0_12px_rgb(76_195_255/0.25)]' : 'border-edge/70'
      }`}
    >
      <div className={`font-semibold ${active ? 'text-sys' : ''}`}>{title}</div>
      {hint && <div className="text-xs text-mute">{hint}</div>}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-widest text-mute uppercase">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full rounded border border-edge bg-void/60 px-3 py-2.5 text-ink outline-none focus:border-sys tabular-nums'

/**
 * Multi-step assessment. Collects the profile, then builds a plan with the
 * built-in rules or (optionally) Claude, and hands both back.
 */
export function Assessment({
  initial,
  onComplete,
  onCancel,
  submitLabel = 'Accept plan',
}: {
  initial?: Profile
  onComplete: (profile: Profile, plan: TrainingPlan) => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [p, setP] = useState<Profile>(initial ?? blankProfile())
  const [step, setStep] = useState(0)
  const [engine, setEngine] = useState<'rules' | 'ai'>('rules')
  const [apiKey, setApiKey] = useState('')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadApiKey().then((k) => {
      setApiKey(k)
      if (k) setEngine('ai')
    })
  }, [])

  const up = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))

  const bodyValid =
    p.age >= 13 && p.age <= 90 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 250 &&
    (p.targetWeightKg === null || (p.targetWeightKg >= 30 && p.targetWeightKg <= 250))

  const canNext = [
    p.name.trim().length > 0,
    true,
    true,
    bodyValid,
    true,
    p.trainingDays.length >= 1,
    true,
    engine === 'rules' || apiKey.trim().length > 0,
  ][step]

  async function build() {
    setError(null)
    setBusy(true)
    try {
      if (engine === 'ai') {
        await saveApiKey(apiKey)
        setPlan(await generateAiPlan(p, apiKey.trim()))
      } else {
        setPlan(generateRulePlan(p))
      }
    } catch (e) {
      setError(e instanceof AiPlanError ? e.message : 'Something went wrong while building the plan.')
    } finally {
      setBusy(false)
    }
  }

  // ----- Plan preview -----
  if (plan) {
    return (
      <SystemWindow title="Your Plan" className="anim-in">
        <PlanView plan={plan} />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button className="rounded border border-edge py-2.5 text-sm text-mute" onClick={() => setPlan(null)}>
            Back
          </button>
          <button className="btn-sys col-span-2 py-2.5" onClick={() => onComplete({ ...p, name: p.name.trim() }, plan)}>
            {submitLabel}
          </button>
        </div>
      </SystemWindow>
    )
  }

  const toggleDay = (d: number) =>
    up({
      trainingDays: p.trainingDays.includes(d)
        ? p.trainingDays.filter((x) => x !== d)
        : p.trainingDays.length >= 6
          ? p.trainingDays
          : [...p.trainingDays, d].sort((a, b) => a - b),
    })

  const toggleLimit = (l: Limitation) =>
    up({ limitations: p.limitations.includes(l) ? p.limitations.filter((x) => x !== l) : [...p.limitations, l] })

  let body: ReactNode
  switch (STEPS[step]) {
    case 'Name':
      body = (
        <Field label="What should the System call you?">
          <input
            autoFocus
            maxLength={20}
            value={p.name}
            onChange={(e) => up({ name: e.target.value })}
            placeholder="Your name"
            className={`${inputCls} text-lg`}
          />
        </Field>
      )
      break
    case 'Goal':
      body = (
        <div className="space-y-2">
          {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
            <Option key={g} active={p.goal === g} onClick={() => up({ goal: g })} title={GOAL_LABEL[g]} hint={GOAL_HINT[g]} />
          ))}
        </div>
      )
      break
    case 'Experience':
      body = (
        <div className="space-y-2">
          {(Object.keys(EXPERIENCE_LABEL) as Experience[]).map((x) => (
            <Option
              key={x}
              active={p.experience === x}
              onClick={() => up({ experience: x })}
              title={EXPERIENCE_LABEL[x]}
              hint={EXPERIENCE_HINT[x]}
            />
          ))}
        </div>
      )
      break
    case 'Body': {
      const num = (v: string) => (v === '' ? 0 : Number(v))
      body = (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input type="number" inputMode="numeric" value={p.age || ''} onChange={(e) => up({ age: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Sex">
              <select value={p.sex} onChange={(e) => up({ sex: e.target.value as Sex })} className={inputCls}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <input type="number" inputMode="decimal" value={p.heightCm || ''} onChange={(e) => up({ heightCm: num(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" inputMode="decimal" value={p.weightKg || ''} onChange={(e) => up({ weightKg: num(e.target.value) })} className={inputCls} />
            </Field>
          </div>
          <Field label="Target weight (kg, optional)">
            <input
              type="number"
              inputMode="decimal"
              value={p.targetWeightKg ?? ''}
              onChange={(e) => up({ targetWeightKg: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="Leave empty if none"
              className={inputCls}
            />
          </Field>
          {bodyValid ? (
            <p className="text-xs text-mute">
              BMI: <span className="text-ink">{bmi(p).toFixed(1)}</span>. Just a rough guide; it doesn’t account for muscle.
            </p>
          ) : (
            <p className="text-xs text-blood">Check the numbers: age 13–90, height 120–230 cm, weight 30–250 kg.</p>
          )}
        </div>
      )
      break
    }
    case 'Equipment':
      body = (
        <div className="space-y-2">
          {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((x) => (
            <Option
              key={x}
              active={p.equipment === x}
              onClick={() => up({ equipment: x })}
              title={EQUIPMENT_LABEL[x]}
              hint={EQUIPMENT_HINT[x]}
            />
          ))}
        </div>
      )
      break
    case 'Schedule':
      body = (
        <div className="space-y-5">
          <Field label={`Training days (${p.trainingDays.length} per week)`}>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_SHORT.map((d, i) => {
                const on = p.trainingDays.includes(i)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(i)}
                    className={`rounded border py-2.5 text-xs font-semibold ${on ? 'border-sys bg-sys/15 text-sys' : 'border-edge text-mute'}`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-mute">Pick 1–6 days. Other days are rest days with a light recovery quest.</p>
          </Field>
          <Field label="Time per session">
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={p.sessionMinutes === m}
                  onClick={() => up({ sessionMinutes: m })}
                  className={`rounded border py-2.5 text-sm font-semibold ${
                    p.sessionMinutes === m ? 'border-sys bg-sys/15 text-sys' : 'border-edge text-mute'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </Field>
        </div>
      )
      break
    case 'Limitations':
      body = (
        <div className="space-y-2">
          <p className="text-sm text-ink/80">Any injuries or pain? Exercises that stress these areas will be left out.</p>
          <Option active={p.limitations.length === 0} onClick={() => up({ limitations: [] })} title="None" />
          {(Object.keys(LIMITATION_LABEL) as Limitation[]).map((l) => (
            <Option key={l} active={p.limitations.includes(l)} onClick={() => toggleLimit(l)} title={LIMITATION_LABEL[l]} />
          ))}
          <p className="pt-1 text-[11px] text-mute">Not medical advice. If something hurts, see a professional.</p>
        </div>
      )
      break
    case 'Plan':
      body = (
        <div className="space-y-2">
          <Option
            active={engine === 'rules'}
            onClick={() => setEngine('rules')}
            title="System plan (built-in)"
            hint="Instant, free, works offline."
          />
          <Option
            active={engine === 'ai'}
            onClick={() => setEngine('ai')}
            title="AI coach (Claude)"
            hint="A personalised plan written by Claude. Needs your own Anthropic API key; costs well under $0.01."
          />
          {engine === 'ai' && (
            <div className="pt-2">
              <Field label="Anthropic API key">
                <input
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-…"
                  className={inputCls}
                />
              </Field>
              <p className="mt-2 text-[11px] leading-relaxed text-mute">
                Stored only on this device and sent only to Anthropic. Get one at console.anthropic.com (API credits are
                separate from a Claude subscription). Model: {AI_MODEL}.
              </p>
            </div>
          )}
          {error && (
            <div className="mt-3 rounded border border-blood/60 p-3 text-sm">
              <p className="text-blood">{error}</p>
              <button
                className="mt-2 text-xs text-sys underline"
                onClick={() => {
                  setEngine('rules')
                  setError(null)
                  setPlan(generateRulePlan(p))
                }}
              >
                Use the built-in plan instead
              </button>
            </div>
          )}
        </div>
      )
      break
  }

  const last = step === STEPS.length - 1

  return (
    <SystemWindow title={`Assessment ${step + 1}/${STEPS.length}`} className="anim-in" right={<span className="text-xs text-mute">{STEPS[step]}</span>}>
      <div className="mb-4 h-1 overflow-hidden rounded bg-white/5">
        <div className="bar-fill h-full" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canNext || busy) return
          if (last) build()
          else setStep(step + 1)
        }}
      >
        {body}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {step > 0 || onCancel ? (
            <button
              type="button"
              className="rounded border border-edge py-2.5 text-sm text-mute"
              onClick={() => (step > 0 ? setStep(step - 1) : onCancel?.())}
            >
              {step > 0 ? 'Back' : 'Cancel'}
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn-sys col-span-2 py-2.5" disabled={!canNext || busy}>
            {busy ? 'Building plan…' : last ? 'Build my plan' : 'Next'}
          </button>
        </div>
      </form>
    </SystemWindow>
  )
}
