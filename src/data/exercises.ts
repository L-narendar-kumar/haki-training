import type { Category, Exercise } from '../types'

export const CATEGORY_LABEL: Record<Category, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
}

export const EXERCISES: Exercise[] = [
  // ---------- Chest ----------
  {
    id: 'pushup',
    name: 'Push-up',
    category: 'chest',
    mode: 'reps',
    equipment: 'Bodyweight',
    primary: ['Chest', 'Triceps', 'Front delts'],
    steps: [
      'Hands slightly wider than shoulders, body in a straight line from head to heels.',
      'Brace your core and squeeze your glutes.',
      'Lower until your chest is a fist away from the floor, elbows ~45° from your body.',
      'Push the floor away until your arms are straight.',
    ],
    tips: ['Too hard? Do them with hands on a bench.', 'Don’t let your hips sag or pike up.'],
  },
  {
    id: 'bench_press',
    name: 'Barbell Bench Press',
    category: 'chest',
    mode: 'reps_weight',
    equipment: 'Barbell, bench',
    primary: ['Chest', 'Triceps', 'Front delts'],
    steps: [
      'Lie with eyes under the bar, feet flat, shoulder blades pinched together.',
      'Grip slightly wider than shoulders and unrack with straight arms.',
      'Lower the bar to mid-chest with control, elbows ~45–70°.',
      'Press back up and slightly toward your face until arms lock out.',
    ],
    tips: ['Use a spotter or safety pins when going heavy.', 'Keep your butt on the bench.'],
  },
  {
    id: 'db_incline_press',
    name: 'Incline Dumbbell Press',
    category: 'chest',
    mode: 'reps_weight',
    equipment: 'Dumbbells, incline bench',
    primary: ['Upper chest', 'Front delts', 'Triceps'],
    steps: [
      'Set the bench to 30–45°. Sit back with dumbbells on your thighs, then kick them up.',
      'Start with dumbbells over your shoulders, palms forward.',
      'Lower until you feel a stretch in your chest.',
      'Press up and slightly together.',
    ],
    tips: ['Log the weight of ONE dumbbell.'],
  },
  {
    id: 'dips',
    name: 'Dips',
    category: 'chest',
    mode: 'reps',
    equipment: 'Parallel bars',
    primary: ['Lower chest', 'Triceps'],
    steps: [
      'Support yourself on straight arms between the bars.',
      'Lean slightly forward and lower until shoulders are just below elbows.',
      'Press back up to straight arms.',
    ],
    tips: ['Stop if you feel shoulder pain. Use a band for assistance.'],
  },
  // ---------- Back ----------
  {
    id: 'pullup',
    name: 'Pull-up',
    category: 'back',
    mode: 'reps',
    equipment: 'Pull-up bar',
    primary: ['Lats', 'Biceps', 'Upper back'],
    steps: [
      'Hang from the bar with an overhand grip, slightly wider than shoulders.',
      'Pull your shoulder blades down, then drive elbows toward your ribs.',
      'Pull until your chin clears the bar.',
      'Lower all the way to a dead hang with control.',
    ],
    tips: ['Can’t do one yet? Do slow negatives or band-assisted reps.'],
  },
  {
    id: 'barbell_row',
    name: 'Barbell Row',
    category: 'back',
    mode: 'reps_weight',
    equipment: 'Barbell',
    primary: ['Lats', 'Upper back', 'Rear delts'],
    steps: [
      'Hinge at the hips with a flat back, torso ~45°, bar hanging at knee height.',
      'Pull the bar to your lower ribs, squeezing your shoulder blades.',
      'Lower with control.',
    ],
    tips: ['Don’t jerk the weight with your lower back.'],
  },
  {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    category: 'back',
    mode: 'reps_weight',
    equipment: 'Cable machine',
    primary: ['Lats', 'Biceps'],
    steps: [
      'Sit with thighs under the pads, grip wider than shoulders.',
      'Lean back slightly and pull the bar to your upper chest.',
      'Return slowly until arms are straight.',
    ],
    tips: ['Think “elbows down to pockets”, not “hands down”.'],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'back',
    mode: 'reps_weight',
    equipment: 'Barbell',
    primary: ['Glutes', 'Hamstrings', 'Lower back', 'Traps'],
    steps: [
      'Stand with mid-foot under the bar, feet hip-width.',
      'Hinge down and grip the bar just outside your legs.',
      'Chest up, back flat, pull the slack out of the bar.',
      'Push the floor away and stand tall, then lower by hinging at the hips.',
    ],
    tips: ['Keep the bar touching your legs.', 'Never round your lower back under load.'],
  },
  // ---------- Legs ----------
  {
    id: 'squat_bw',
    name: 'Bodyweight Squat',
    category: 'legs',
    mode: 'reps',
    equipment: 'Bodyweight',
    primary: ['Quads', 'Glutes'],
    steps: [
      'Feet shoulder-width, toes slightly out.',
      'Sit down and back, keeping your chest up and knees tracking over toes.',
      'Go to at least parallel, then stand up.',
    ],
    tips: ['Arms forward help with balance.'],
  },
  {
    id: 'back_squat',
    name: 'Barbell Back Squat',
    category: 'legs',
    mode: 'reps_weight',
    equipment: 'Barbell, rack',
    primary: ['Quads', 'Glutes', 'Adductors'],
    steps: [
      'Bar on your upper back (not your neck), hands just outside shoulders.',
      'Unrack, step back, feet shoulder-width.',
      'Brace hard and sit down between your heels to at least parallel.',
      'Drive up, keeping your chest and hips rising together.',
    ],
    tips: ['Set safety pins just below your bottom position.'],
  },
  {
    id: 'lunge',
    name: 'Walking Lunge',
    category: 'legs',
    mode: 'reps',
    equipment: 'Bodyweight or dumbbells',
    primary: ['Quads', 'Glutes'],
    steps: [
      'Step forward and lower until both knees are ~90°.',
      'Push through the front heel and step into the next lunge.',
    ],
    tips: ['Count each leg as one rep.'],
  },
  {
    id: 'rdl',
    name: 'Romanian Deadlift',
    category: 'legs',
    mode: 'reps_weight',
    equipment: 'Barbell or dumbbells',
    primary: ['Hamstrings', 'Glutes'],
    steps: [
      'Stand tall holding the weight, soft knees.',
      'Push your hips back, sliding the weight down your thighs.',
      'Stop when you feel a strong hamstring stretch (usually mid-shin).',
      'Squeeze glutes to stand back up.',
    ],
    tips: ['Your back stays flat the whole time.'],
  },
  {
    id: 'calf_raise',
    name: 'Calf Raise',
    category: 'legs',
    mode: 'reps',
    equipment: 'Step or floor',
    primary: ['Calves'],
    steps: ['Stand on the balls of your feet.', 'Rise as high as possible, pause, lower slowly.'],
    tips: ['Use a step for a bigger range of motion.'],
  },
  // ---------- Shoulders ----------
  {
    id: 'ohp',
    name: 'Overhead Press',
    category: 'shoulders',
    mode: 'reps_weight',
    equipment: 'Barbell or dumbbells',
    primary: ['Shoulders', 'Triceps'],
    steps: [
      'Bar at your collarbones, grip just outside shoulders.',
      'Brace your core and glutes.',
      'Press straight up, moving your head back then through once the bar passes.',
      'Lock out overhead, then lower to the start.',
    ],
    tips: ['Don’t lean back — squeeze your glutes.'],
  },
  {
    id: 'lateral_raise',
    name: 'Lateral Raise',
    category: 'shoulders',
    mode: 'reps_weight',
    equipment: 'Dumbbells',
    primary: ['Side delts'],
    steps: [
      'Hold dumbbells at your sides, slight bend in the elbows.',
      'Raise your arms out to the side up to shoulder height.',
      'Lower slowly.',
    ],
    tips: ['Light weight, strict form. Log ONE dumbbell’s weight.'],
  },
  {
    id: 'pike_pushup',
    name: 'Pike Push-up',
    category: 'shoulders',
    mode: 'reps',
    equipment: 'Bodyweight',
    primary: ['Shoulders', 'Triceps'],
    steps: [
      'Start in a push-up, walk feet in so your hips are high (an upside-down V).',
      'Bend your elbows to lower the top of your head toward the floor.',
      'Press back up.',
    ],
    tips: ['Elevate your feet to make it harder.'],
  },
  // ---------- Arms ----------
  {
    id: 'bicep_curl',
    name: 'Dumbbell Curl',
    category: 'arms',
    mode: 'reps_weight',
    equipment: 'Dumbbells',
    primary: ['Biceps'],
    steps: [
      'Stand with dumbbells at your sides, palms forward.',
      'Curl up without swinging, elbows pinned to your sides.',
      'Lower slowly to full extension.',
    ],
    tips: ['Log ONE dumbbell’s weight.'],
  },
  {
    id: 'tricep_dip_bench',
    name: 'Bench Dip',
    category: 'arms',
    mode: 'reps',
    equipment: 'Bench or chair',
    primary: ['Triceps'],
    steps: [
      'Hands on the edge of a bench behind you, legs out in front.',
      'Lower until elbows are ~90°.',
      'Press back up.',
    ],
    tips: ['Bend your knees to make it easier.'],
  },
  {
    id: 'skull_crusher',
    name: 'Skull Crusher',
    category: 'arms',
    mode: 'reps_weight',
    equipment: 'EZ bar or dumbbells',
    primary: ['Triceps'],
    steps: [
      'Lie on a bench holding the weight above your chest.',
      'Bend only at the elbows to lower it toward your forehead.',
      'Extend back up.',
    ],
    tips: ['Keep your upper arms still.'],
  },
  // ---------- Core ----------
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    mode: 'time',
    equipment: 'Bodyweight',
    primary: ['Abs', 'Obliques'],
    steps: [
      'Forearms on the floor, elbows under shoulders.',
      'Body straight from head to heels; squeeze glutes and brace abs.',
      'Hold without letting your hips sag.',
    ],
    tips: ['Quality over time — stop when form breaks.'],
  },
  {
    id: 'situp',
    name: 'Sit-up',
    category: 'core',
    mode: 'reps',
    equipment: 'Bodyweight',
    primary: ['Abs', 'Hip flexors'],
    steps: [
      'Lie on your back, knees bent, feet flat.',
      'Curl your torso up until you’re sitting upright.',
      'Lower back down with control.',
    ],
    tips: ['Don’t yank your neck with your hands.'],
  },
  {
    id: 'hanging_leg_raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    mode: 'reps',
    equipment: 'Pull-up bar',
    primary: ['Lower abs', 'Hip flexors'],
    steps: [
      'Hang from a bar, body still.',
      'Raise your legs (straight or bent) until hips are flexed past 90°.',
      'Lower slowly without swinging.',
    ],
    tips: ['Bent knees is the easier version.'],
  },
  {
    id: 'burpee',
    name: 'Burpee',
    category: 'core',
    mode: 'reps',
    equipment: 'Bodyweight',
    primary: ['Full body', 'Conditioning'],
    steps: [
      'From standing, squat down and place your hands on the floor.',
      'Jump your feet back into a plank and do a push-up.',
      'Jump your feet back in, then jump up with arms overhead.',
    ],
    tips: ['Pace yourself — these get hard fast.'],
  },
  // ---------- Cardio ----------
  {
    id: 'run',
    name: 'Running',
    category: 'cardio',
    mode: 'time',
    equipment: 'Shoes',
    primary: ['Heart & lungs', 'Legs'],
    steps: [
      'Warm up with 5 minutes of brisk walking.',
      'Run at a pace where you can still speak in short sentences.',
      'Cool down with a few minutes of walking.',
    ],
    tips: ['New to running? Alternate 1 min running / 1 min walking.'],
  },
  {
    id: 'jump_rope',
    name: 'Jump Rope',
    category: 'cardio',
    mode: 'time',
    equipment: 'Jump rope',
    primary: ['Calves', 'Heart & lungs'],
    steps: [
      'Hold handles at hip height, elbows close to your body.',
      'Turn the rope with your wrists, small hops on the balls of your feet.',
    ],
    tips: ['Start with 30 s on / 30 s off intervals.'],
  },
  {
    id: 'cycling',
    name: 'Cycling',
    category: 'cardio',
    mode: 'time',
    equipment: 'Bike or stationary bike',
    primary: ['Legs', 'Heart & lungs'],
    steps: ['Set seat height so your knee is slightly bent at the bottom.', 'Keep a steady cadence.'],
    tips: ['Great low-impact option for rest days.'],
  },
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)

export interface PlanDay {
  name: string
  exercises: { id: string; sets: number; reps: string }[]
}

export interface Plan {
  id: string
  name: string
  level: string
  perWeek: string
  description: string
  days: PlanDay[]
}

export const PLANS: Plan[] = [
  {
    id: 'home_bodyweight',
    name: 'Home Awakening',
    level: 'Beginner',
    perWeek: '3 days',
    description: 'No equipment needed. Build the base before touching iron.',
    days: [
      {
        name: 'Full Body',
        exercises: [
          { id: 'pushup', sets: 3, reps: '8–15' },
          { id: 'squat_bw', sets: 3, reps: '15–20' },
          { id: 'lunge', sets: 3, reps: '10/leg' },
          { id: 'pike_pushup', sets: 3, reps: '6–10' },
          { id: 'plank', sets: 3, reps: '30–60 s' },
          { id: 'burpee', sets: 2, reps: '10' },
        ],
      },
    ],
  },
  {
    id: 'full_body_gym',
    name: 'Iron Foundation',
    level: 'Beginner',
    perWeek: '3 days (A/B alternating)',
    description: 'Classic gym full-body routine. Add a little weight each week.',
    days: [
      {
        name: 'Day A',
        exercises: [
          { id: 'back_squat', sets: 3, reps: '5–8' },
          { id: 'bench_press', sets: 3, reps: '5–8' },
          { id: 'barbell_row', sets: 3, reps: '8–10' },
          { id: 'plank', sets: 3, reps: '45 s' },
        ],
      },
      {
        name: 'Day B',
        exercises: [
          { id: 'deadlift', sets: 3, reps: '5' },
          { id: 'ohp', sets: 3, reps: '6–8' },
          { id: 'lat_pulldown', sets: 3, reps: '8–12' },
          { id: 'hanging_leg_raise', sets: 3, reps: '8–12' },
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push · Pull · Legs',
    level: 'Intermediate',
    perWeek: '3–6 days',
    description: 'Split routine for more volume per muscle. Run it once or twice a week.',
    days: [
      {
        name: 'Push',
        exercises: [
          { id: 'bench_press', sets: 4, reps: '6–8' },
          { id: 'ohp', sets: 3, reps: '8–10' },
          { id: 'db_incline_press', sets: 3, reps: '8–12' },
          { id: 'lateral_raise', sets: 3, reps: '12–15' },
          { id: 'skull_crusher', sets: 3, reps: '10–12' },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { id: 'deadlift', sets: 3, reps: '5' },
          { id: 'pullup', sets: 4, reps: 'max' },
          { id: 'barbell_row', sets: 3, reps: '8–10' },
          { id: 'bicep_curl', sets: 3, reps: '10–12' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { id: 'back_squat', sets: 4, reps: '6–8' },
          { id: 'rdl', sets: 3, reps: '8–10' },
          { id: 'lunge', sets: 3, reps: '10/leg' },
          { id: 'calf_raise', sets: 4, reps: '15–20' },
          { id: 'hanging_leg_raise', sets: 3, reps: '10–15' },
        ],
      },
    ],
  },
]
