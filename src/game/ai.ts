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
  type RawPlan,
} from './planner'

export type AiProvider = 'gemini' | 'claude'

export const AI_PROVIDERS: Record<
  AiProvider,
  { label: string; model: string; keyHint: string; keyUrl: string; cost: string; keyPattern: RegExp }
> = {
  gemini: {
    label: 'Google Gemini',
    model: 'gemini-3.8-flash',
    keyHint: 'Paste your AI Studio key',
    keyUrl: 'aistudio.google.com',
    cost: 'Free with an AI Studio key (free-tier prompts may be used by Google to improve its products).',
    keyPattern: /^AIza/,
  },
  claude: {
    label: 'Anthropic Claude',
    model: 'claude-haiku-5-5',
    keyHint: 'sk-ant-…',
    keyUrl: 'console.anthropic.com',
    cost: 'Paid API credits, well under $0.01 per plan.',
    keyPattern: /^sk-ant-/,
  },
}

export class AiPlanError extends Error {}

/** Each single request may take this long before it is abandoned. */
const ATTEMPT_TIMEOUT_MS = 30_000

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')
}

/** Short, readable detail from an unexpected error, so failures can be diagnosed. */
function detail(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.replace(/\s+/g, ' ').slice(0, 160)
}

/** Load an SDK chunk. Fails if the app updated in the background since this page was loaded. */
async function load<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    throw new AiPlanError('The app was updated in the background. Close it fully, reopen it, and try again.')
  }
}

const SYSTEM_PROMPT =
  'You are an experienced strength and conditioning coach. You design safe, effective weekly training plans ' +
  'for one person, using only the exercises you are given. Match volume to their experience, fit each session ' +
  'into their time budget (count roughly 8–10 minutes per exercise including rest), and respect every injury.'

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

function userPrompt(profile: Profile): string {
  const catalogue = EXERCISES.filter((e) => canDo(e, profile))
    .map(
      (e) =>
        `- ${e.id}: ${e.name} (${e.category}; ${
          e.mode === 'time' ? 'timed, reps = seconds per set' : e.mode === 'reps' ? 'bodyweight reps' : 'weight × reps'
        })`,
    )
    .join('\n')
  return (
    `Design a training plan for this person.\n\n${describeProfile(profile)}\n\n` +
    `Use ONLY these exercise ids (anything else will be discarded):\n${catalogue}\n\n` +
    `Rules:\n` +
    `- Create exactly ${profile.trainingDays.length} distinct day(s); they will be assigned to the training days in order.\n` +
    `- Give each day a short name (e.g. "Upper Power", "Legs & Core").\n` +
    `- For timed exercises, "reps" is seconds per set (cardio can be 1 set of e.g. 900 seconds).\n` +
    `- "summary" is 1–2 sentences addressed to the person explaining why the plan fits their goal.\n` +
    `- "name" is a short, motivating plan name.`
  )
}

/** Same shape for both providers. */
const PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                exerciseId: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'integer' },
              },
              required: ['exerciseId', 'sets', 'reps'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'exercises'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'summary', 'days'],
  additionalProperties: false,
} as const

function isRawPlan(x: unknown): x is RawPlan {
  const p = x as RawPlan
  return !!p && Array.isArray(p.days) && p.days.every((d) => d && Array.isArray(d.exercises))
}

async function claudePlan(profile: Profile, apiKey: string, signal: AbortSignal): Promise<unknown> {
  const [{ default: Anthropic }, { zodOutputFormat }, { z }] = await load(() =>
    Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/zod'), import('zod')]),
  )
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
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: ATTEMPT_TIMEOUT_MS })
  try {
    const response = await client.messages.parse(
      {
        model: AI_PROVIDERS.claude.model,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt(profile) }],
        output_config: { format: zodOutputFormat(PlanSchema) },
      },
      { signal },
    )
    if (response.stop_reason === 'refusal') throw new AiPlanError('The AI declined to write this plan.')
    return response.parsed_output
  } catch (err) {
    if (err instanceof AiPlanError) throw err
    if (signal.aborted) throw new AiPlanError('Cancelled.')
    if (err instanceof Anthropic.APIConnectionTimeoutError)
      throw new AiPlanError('Claude took too long to answer. Try again, or use the built-in plan.')
    if (err instanceof Anthropic.AuthenticationError) throw new AiPlanError('The API key was rejected. Check it and try again.')
    if (err instanceof Anthropic.PermissionDeniedError) throw new AiPlanError('This API key is not allowed to use the model.')
    if (err instanceof Anthropic.RateLimitError) throw new AiPlanError('Rate limited by the API. Wait a minute and try again.')
    if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) {
      throw new AiPlanError('Claude is overloaded right now. Try again in a minute, or use the built-in plan.')
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiPlanError(
        err.status === 400 && /credit/i.test(err.message)
          ? 'Your Anthropic account has no API credits. Add credits at console.anthropic.com.'
          : `The AI request failed (${err.status ?? 'network'}): ${detail(err)}`,
      )
    }
    throw new AiPlanError(`Could not reach the AI service (${detail(err)}). Check your connection.`)
  }
}

/** Tried in order: if the main model stays overloaded, fall back to the lighter one. */
const GEMINI_MODELS = [AI_PROVIDERS.gemini.model, 'gemini-3.5-flash-lite']

async function geminiPlan(profile: Profile, apiKey: string, signal: AbortSignal): Promise<unknown> {
  const { GoogleGenAI, ApiError, ThinkingLevel } = await load(() => import('@google/genai'))
  // Each attempt is capped, so a stuck connection can't spin forever. Retries are done below (the SDK's
  // own retries would also repeat timed-out attempts, which made a hung server take minutes).
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: ATTEMPT_TIMEOUT_MS } })
  // Worst case: main model times out (30s), then the lighter one times out (30s) — about a minute.
  const attempts = GEMINI_MODELS.flatMap((model) => [
    { model, retry: false },
    { model, retry: true }, // only used after an overload (5xx), never after a timeout
  ])
  let response
  let lastProblem = ''
  let skipRetryOf = ''
  for (const { model, retry } of attempts) {
    if (retry && skipRetryOf === model) continue
    if (retry) await new Promise((r) => setTimeout(r, 2000))
    try {
      response = await ai.models.generateContent({
        model,
        contents: userPrompt(profile),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: PLAN_JSON_SCHEMA,
          // Planning doesn't need deep reasoning; low thinking answers much faster.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: signal,
        },
      })
      break
    } catch (err) {
      if (signal.aborted) throw new AiPlanError('Cancelled.')
      const last = model === GEMINI_MODELS.at(-1)
      if (isAbort(err)) {
        lastProblem = 'took too long to answer'
        skipRetryOf = model // don't wait on a hung model twice
        if (!last) continue
        throw new AiPlanError('Gemini took too long to answer. Try again in a minute, or use the built-in plan.')
      }
      if (!(err instanceof ApiError))
        throw new AiPlanError(`Could not reach Gemini (${detail(err)}). Check your connection.`)
      if (err.status >= 500) {
        lastProblem = 'is overloaded'
        if (!(last && retry)) continue // retry once, then the lighter model
        throw new AiPlanError('Gemini is overloaded right now. Try again in a minute, or use the built-in plan.')
      }
      if (err.status === 400 && /api key/i.test(err.message))
        throw new AiPlanError('The API key was rejected. Check it and try again.')
      if (err.status === 403)
        throw new AiPlanError(
          /leaked/i.test(err.message)
            ? 'Google reports this key as leaked. Create a new key in AI Studio.'
            : `This key is not allowed to use Gemini: ${detail(err)}`,
        )
      if (err.status === 429) throw new AiPlanError('Free-tier limit reached. Wait a minute and try again.')
      throw new AiPlanError(`Gemini request failed (${err.status}): ${detail(err)}`)
    }
  }
  if (!response) throw new AiPlanError(`Gemini ${lastProblem || 'did not answer'}. Try again, or use the built-in plan.`)

  if (response.promptFeedback?.blockReason) throw new AiPlanError('The AI declined to write this plan.')
  const finish = response.candidates?.[0]?.finishReason
  if (finish && finish !== 'STOP') {
    throw new AiPlanError(finish === 'MAX_TOKENS' ? 'The AI response was cut off. Try again.' : 'The AI declined to write this plan.')
  }
  try {
    return JSON.parse(response.text ?? '')
  } catch {
    throw new AiPlanError('The AI returned an unreadable plan.')
  }
}

/**
 * One-time call to write a personalised plan. The key is the player's own
 * and goes straight from their browser to the provider.
 */
export async function generateAiPlan(
  profile: Profile,
  provider: AiProvider,
  apiKey: string,
  signal: AbortSignal,
): Promise<TrainingPlan> {
  const raw =
    provider === 'gemini' ? await geminiPlan(profile, apiKey, signal) : await claudePlan(profile, apiKey, signal)
  if (!isRawPlan(raw)) throw new AiPlanError('The AI returned an unreadable plan.')
  const plan = sanitizePlan(raw, profile)
  if (!plan) throw new AiPlanError('The AI plan had no usable exercises.')
  return plan
}
