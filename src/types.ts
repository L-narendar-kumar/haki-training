export type StatKey = 'str' | 'agi' | 'end' | 'vit'

export type TrackMode = 'reps_weight' | 'reps' | 'time'

export type Category = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'mobility'

/** Minimum equipment level an exercise needs. none < dumbbells < gym. */
export type Equipment = 'none' | 'dumbbells' | 'gym'

export type Limitation = 'knees' | 'lower_back' | 'shoulders' | 'wrists'

export interface Exercise {
  id: string
  name: string
  category: Category
  mode: TrackMode
  equipment: string // human-readable
  needs: Equipment
  avoidFor: Limitation[]
  compound?: boolean
  primary: string[]
  steps: string[]
  tips: string[]
}

// ---------- Player profile & plan ----------

export type Goal = 'muscle' | 'fat_loss' | 'strength' | 'endurance' | 'general'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female' | 'other'

export interface Profile {
  name: string
  goal: Goal
  experience: Experience
  age: number
  sex: Sex
  heightCm: number
  weightKg: number
  targetWeightKg: number | null
  equipment: Equipment
  /** Weekdays to train, 0 = Sunday … 6 = Saturday. */
  trainingDays: number[]
  sessionMinutes: number
  limitations: Limitation[]
}

export interface PlanExercise {
  exerciseId: string
  sets: number
  /** Reps per set, or seconds per set for timed exercises. */
  reps: number
}

export interface PlanDay {
  name: string
  exercises: PlanExercise[]
}

export interface TrainingPlan {
  source: 'rules' | 'ai'
  createdAt: number
  name: string
  summary: string
  days: PlanDay[]
  /** schedule[weekday] = index into days, or null for a rest day. */
  schedule: (number | null)[]
}

// ---------- Workouts ----------

export interface WorkoutSet {
  reps: number // reps, or seconds when mode is 'time'
  weight: number // kg; 0 for bodyweight / time
}

export interface WorkoutEntry {
  exerciseId: string
  sets: WorkoutSet[]
  /** Planned target shown while training, e.g. "3 × 10". */
  target?: string
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

// ---------- Quests ----------

export type QuestKind = 'workouts' | 'sets' | 'volume' | 'variety' | 'reps' | 'time'

export interface Quest {
  id: string
  title: string
  description: string
  kind: QuestKind
  target: number
  exerciseIds?: string[] // which exercises count (reps / time / sets quests)
  xp: number
  penalty?: boolean
  claimed: boolean
}

export interface DailyQuests {
  date: string
  restDay: boolean
  quests: Quest[]
  bonusClaimed: boolean
}

// ---------- Player ----------

export interface Player {
  name: string
  level: number
  xp: number // xp into current level
  totalXp: number
  statPoints: number
  stats: Record<StatKey, number>
  /** Index into RANKS. Only rises by passing a rank-up trial. */
  rank: number
  /** When the current rank-up trial became available (level cap reached). */
  trialUnlockedAt: number | null
  streak: number
  lastClearDate: string | null
  title: string | null // equipped achievement id
  penaltyActive: boolean
}

export interface GameState {
  version: 2
  createdAt: number
  profile: Profile
  plan: TrainingPlan
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
  | { type: 'trialReady'; from: string; to: string }
  | { type: 'stat'; gains: Partial<Record<StatKey, number>> }
  | { type: 'questClear'; title: string; xp: number }
  | { type: 'achievement'; id: string; name: string; description: string }
  | { type: 'penalty'; message: string }
  | { type: 'info'; title: string; message: string }
