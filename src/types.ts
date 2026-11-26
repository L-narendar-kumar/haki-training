export type StatKey = 'str' | 'agi' | 'end' | 'vit'

export type TrackMode = 'reps_weight' | 'reps' | 'time'

export type Category = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'

export interface Exercise {
  id: string
  name: string
  category: Category
  mode: TrackMode
  equipment: string
  primary: string[]
  steps: string[]
  tips: string[]
}

export interface WorkoutSet {
  reps: number // reps, or seconds when mode is 'time'
  weight: number // kg; 0 for bodyweight / time
}

export interface WorkoutEntry {
  exerciseId: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  date: string // YYYY-MM-DD (local)
  startedAt: number
  finishedAt: number
  entries: WorkoutEntry[]
  xp: number
}

export interface ActiveWorkout {
  startedAt: number
  entries: WorkoutEntry[]
}

export type QuestKind = 'workouts' | 'sets' | 'volume' | 'variety' | 'reps' | 'time'

export interface Quest {
  id: string
  title: string
  description: string
  kind: QuestKind
  target: number
  exerciseIds?: string[] // for 'reps' / 'time' quests: which exercises count
  xp: number
  penalty?: boolean
  claimed: boolean
}

export interface DailyQuests {
  date: string
  quests: Quest[]
  bonusClaimed: boolean
}

export interface Player {
  name: string
  level: number
  xp: number // xp into current level
  totalXp: number
  statPoints: number
  stats: Record<StatKey, number>
  streak: number
  lastClearDate: string | null // last date all daily quests were cleared
  title: string | null // equipped achievement id
  penaltyActive: boolean
}

export interface GameState {
  version: 1
  createdAt: number
  player: Player
  workouts: Workout[]
  daily: DailyQuests
  achievements: Record<string, number> // id -> unlocked timestamp
  active: ActiveWorkout | null
}

export type GameEvent =
  | { type: 'xp'; amount: number; reason: string }
  | { type: 'levelUp'; level: number; points: number }
  | { type: 'rankUp'; rank: string }
  | { type: 'questClear'; title: string; xp: number }
  | { type: 'achievement'; id: string; name: string; description: string }
  | { type: 'penalty'; message: string }
  | { type: 'info'; title: string; message: string }
