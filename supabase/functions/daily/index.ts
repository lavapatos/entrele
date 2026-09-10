import { PRIVATE_DAILY_DATA } from '../_shared/daily-data.ts'
import { selectPrivateDaily } from '../_shared/select-private-daily.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (request.method !== 'POST') return respond({ code: 'method_not_allowed' }, 405)

  try {
    const userId = await getAuthenticatedUserId(request)
    const privateUserId = getRequiredSecret('ENTRELE_PRIVATE_USER_ID')

    if (!userId) return respond({ code: 'unauthorized' }, 401)
    if (userId !== privateUserId) return respond({ code: 'forbidden' }, 403)

    const puzzle = await selectPrivateDaily(
      PRIVATE_DAILY_DATA,
      getRequiredSecret('ENTRELE_DAILY_SEED'),
    )

    return respond(puzzle, 200)
  } catch {
    return respond({ code: 'daily_unavailable' }, 503)
  }
})

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = getPublishableKey()

  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !publishableKey) return null

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: authorization,
    },
  })

  if (!response.ok) return null

  const payload: unknown = await response.json()
  if (!isRecord(payload) || typeof payload.id !== 'string') return null
  return payload.id
}

function getPublishableKey(): string | null {
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')

  if (publishableKeys) {
    try {
      const parsed: unknown = JSON.parse(publishableKeys)
      if (isRecord(parsed) && typeof parsed.default === 'string') return parsed.default
    } catch {
      // Fall through to the legacy key while Supabase still provides it.
    }
  }

  return Deno.env.get('SUPABASE_ANON_KEY') ?? null
}

function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Falta ${name}.`)
  return value
}

function respond(payload: unknown, status: number): Response {
  return Response.json(payload, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
