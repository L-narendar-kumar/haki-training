import { EXERCISES } from '../data/exercises'
import type { Profile, TrainingPlan } from '../types'
import {
  EQUIPMENT_LABEL,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  LIMITATION_LABEL,
  WEEKDAY_SHORT,
  canDo,
  sanitizePlan,
} from './planner'

export const AI_MODEL = 'claude-haiku-5-5'

export class AiPlanError extends Error {}

function describeProfile(p: Profile): string {
  const days = [...p.trainingDays].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d])
  return [
    `Goal: ${GOAL_LABEL[p.goal]}`,
    `Experience: ${EXPERIENCE_LABEL[p.experience]}`,
    `Age: ${p.age}, sex: ${p.sex}, height: ${p.heightCm} cm, weight: ${p.weightKg} kg` +
      (p.targetWeightKg ? `, target weight: ${p.targetWeightKg} kg` : ''),
    `Equipment: ${EQUIPMENT_LABEL[p.equipment]}`,
    `Training days: ${days.length} per week (${days.join(', ')}), about ${p.sessionMinutes} minutes per session`,
    `Limitations / injuries: ${p.limitations.length ? p.limitations.map((l) => LIMITATION_LABEL[l]).join(', ') : 'none'}`,
  ].join('\n')
}

/**
 * One-time call to Claude to write a personalised plan. The API key is the
 * player's own and goes straight from their browser to Anthropic.
 */
export async function generateAiPlan(profile: Profile, apiKey: string): Promise<TrainingPlan> {
  const [{ default: Anthropic }, { zodOutputFormat }, { z }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/zod'),
    import('zod'),
  ])

  const allowed = EXERCISES.filter((e) => canDo(e, profile))
  const catalogue = allowed
    .map((e) => `- ${e.id}: ${e.name} (${e.category}; ${e.mode === 'time' ? 'timed, reps = seconds per set' : e.mode === 'reps' ? 'bodyweight reps' : 'weight × reps'})`)
    .join('\n')

  const PlanSchema = z.object({
    name: z.string(),
    summary: z.string(),
    days: z.array(
      z.object({
        name: z.string(),
        exercises: z.array(z.object({ exerciseId: z.string(), sets: z.number(), reps: z.number() })),
      }),
    ),
  })

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  let response
  try {
    response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system:
        'You are an experienced strength and conditioning coach. You design safe, effective weekly training plans ' +
        'for one person, using only the exercises you are given. Match volume to their experience, fit each session ' +
        'into their time budget (count roughly 8–10 minutes per exercise including rest), and respect every injury.',
      messages: [
        {
          role: 'user',
          content:
            `Design a training plan for this person.\n\n${describeProfile(profile)}\n\n` +
            `Use ONLY these exercise ids (anything else will be discarded):\n${catalogue}\n\n` +
            `Rules:\n` +
            `- Create exactly ${profile.trainingDays.length} distinct day(s); they will be assigned to the training days in order.\n` +
            `- Give each day a short name (e.g. "Upper Power", "Legs & Core").\n` +
            `- For timed exercises, "reps" is seconds per set (cardio can be 1 set of e.g. 900 seconds).\n` +
            `- "summary" is 1–2 sentences addressed to the person explaining why the plan fits their goal.\n` +
            `- "name" is a short, motivating plan name.`,
        },
      ],
      output_config: { format: zodOutputFormat(PlanSchema) },
    })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiPlanError('The API key was rejected. Check it and try again.')
    if (err instanceof Anthropic.PermissionDeniedError) throw new AiPlanError('This API key is not allowed to use the model.')
    if (err instanceof Anthropic.RateLimitError) throw new AiPlanError('Rate limited by the API. Wait a minute and try again.')
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 'network'
      throw new AiPlanError(
        status === 400 && /credit/i.test(err.message)
          ? 'Your API account has no credits. Add credits at console.anthropic.com.'
          : `The AI request failed (${status}).`,
      )
    }
    throw new AiPlanError('Could not reach the AI service. Check your connection.')
  }

  if (response.stop_reason === 'refusal') throw new AiPlanError('The AI declined to write this plan.')
  if (!response.parsed_output) throw new AiPlanError('The AI returned an unreadable plan.')

  const plan = sanitizePlan(response.parsed_output, profile)
  if (!plan) throw new AiPlanError('The AI plan had no usable exercises.')
  return plan
}
