import { useMemo, useState } from 'react'
import { CATEGORY_LABEL, EXERCISES } from '../data/exercises'
import type { Category, Exercise } from '../types'
import { Chip } from './ui'

/** Searchable, filterable exercise list. Used by the training log and the guide. */
export function ExerciseList({ onPick, actionLabel }: { onPick: (e: Exercise) => void; actionLabel?: string }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return EXERCISES.filter(
      (e) =>
        (cat === 'all' || e.category === cat) &&
        (!needle || e.name.toLowerCase().includes(needle) || e.primary.some((m) => m.toLowerCase().includes(needle))),
    )
  }, [q, cat])

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercise or muscle…"
        className="w-full rounded border border-edge bg-void/60 px-3 py-2.5 text-ink outline-none focus:border-sys"
      />
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          All
        </Chip>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-edge/50">
        {list.map((e) => (
          <li key={e.id}>
            <button
              className="flex w-full items-center justify-between gap-3 py-3 text-left"
              onClick={() => onPick(e)}
            >
              <div className="min-w-0">
                <div className="font-semibold">{e.name}</div>
                <div className="truncate text-xs text-mute">
                  {CATEGORY_LABEL[e.category]} · {e.primary.join(', ')}
                </div>
              </div>
              <span className="shrink-0 text-xs text-sys">{actionLabel ?? '›'}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-mute">No exercises found.</li>}
      </ul>
    </div>
  )
}
