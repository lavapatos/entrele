import { useCallback, useEffect, useRef, useState } from 'react'

import { DAILY_TIME_ZONE } from '../game/constants'
import { getDateKey } from '../game/daily'
import {
  createEmptyStats,
  createStatsFromDailyResults,
  expireStreak,
  recordDailyResult,
} from '../game/stats'
import type { GameStats } from '../game/stats'
import {
  loadCachedDailyPuzzle,
  loadPendingDailyResults,
  queuePendingDailyResult,
  removePendingDailyResult,
  saveCachedDailyPuzzle,
} from '../storage/private-access-storage'
import { loadStats, saveStats } from '../storage/stats-storage'
import { PrivateAccessError } from './types'
import type {
  CompletedDailyResult,
  PrivateAccessErrorReason,
  PrivateDailyPuzzle,
  PrivateGameGateway,
  PrivateIdentity,
} from './types'

export type AuthenticationStatus = 'checking' | 'signed-out' | 'signed-in'
export type PrivateDailyStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

type UsePrivateGameAccessOptions = Readonly<{
  gateway: PrivateGameGateway | null
  now?: Date
}>

export type PrivateGameAccess = Readonly<{
  authenticationStatus: AuthenticationStatus
  dailyStatus: PrivateDailyStatus
  dailyErrorReason: PrivateAccessErrorReason | null
  identity: PrivateIdentity | null
  puzzle: PrivateDailyPuzzle | null
  stats: GameStats
  signIn(username: string, password: string): Promise<void>
  signOut(): Promise<void>
  recordCompletedResult(result: CompletedDailyResult): void
  refresh(): Promise<void>
}>

export function usePrivateGameAccess({
  gateway,
  now,
}: UsePrivateGameAccessOptions): PrivateGameAccess {
  const [authenticationStatus, setAuthenticationStatus] = useState<AuthenticationStatus>(
    gateway ? 'checking' : 'signed-out',
  )
  const [dailyStatus, setDailyStatus] = useState<PrivateDailyStatus>('idle')
  const [dailyErrorReason, setDailyErrorReason] = useState<PrivateAccessErrorReason | null>(null)
  const [identity, setIdentity] = useState<PrivateIdentity | null>(null)
  const [puzzle, setPuzzle] = useState<PrivateDailyPuzzle | null>(null)
  const [stats, setStats] = useState<GameStats>(() => createEmptyStats())
  const identityRef = useRef<PrivateIdentity | null>(null)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)

  const adoptIdentity = useCallback((nextIdentity: PrivateIdentity | null) => {
    const currentId = identityRef.current?.id ?? null
    const nextId = nextIdentity?.id ?? null

    if (currentId !== nextId) generationRef.current += 1
    identityRef.current = nextIdentity
    setIdentity(nextIdentity)
    setAuthenticationStatus(nextIdentity ? 'signed-in' : 'signed-out')

    if (!nextIdentity) {
      setPuzzle(null)
      setDailyStatus('idle')
      setDailyErrorReason(null)
      setStats(createEmptyStats())
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!gateway || !identityRef.current) return
    if (refreshInFlightRef.current) return refreshInFlightRef.current

    const generation = generationRef.current
    const currentDateKey = getDateKey(now ?? new Date(), DAILY_TIME_ZONE)

    const run = async () => {
      let activePuzzle = loadCachedDailyPuzzle(currentDateKey)

      if (activePuzzle && mountedRef.current && generation === generationRef.current) {
        setPuzzle(activePuzzle)
        setDailyStatus('ready')
        setDailyErrorReason(null)
      } else if (mountedRef.current && generation === generationRef.current) {
        setDailyStatus('loading')
        setDailyErrorReason(null)
      }

      try {
        const remotePuzzle = await gateway.loadDailyPuzzle()
        if (!mountedRef.current || generation !== generationRef.current) return

        activePuzzle = remotePuzzle
        saveCachedDailyPuzzle(remotePuzzle)
        setPuzzle(remotePuzzle)
        setDailyStatus('ready')
        setDailyErrorReason(null)
      } catch (error) {
        if (!mountedRef.current || generation !== generationRef.current) return

        setDailyErrorReason(getAccessErrorReason(error))
        if (!activePuzzle) {
          setPuzzle(null)
          setDailyStatus('unavailable')
        }
      }

      const pendingResults = loadPendingDailyResults()
      for (const result of pendingResults) {
        try {
          await gateway.saveCompletedResult(result)
          removePendingDailyResult(result.dateKey)
        } catch {
          break
        }
      }

      if (!mountedRef.current || generation !== generationRef.current) return

      const remainingPendingResults = loadPendingDailyResults()

      try {
        const remoteResults = await gateway.loadCompletedResults()
        if (!mountedRef.current || generation !== generationRef.current) return

        const remoteDateKeys = new Set(remoteResults.map((result) => result.dateKey))
        const mergedResults = [
          ...remoteResults,
          ...remainingPendingResults.filter((result) => !remoteDateKeys.has(result.dateKey)),
        ]
        const nextStats = expireStreak(
          createStatsFromDailyResults(mergedResults),
          activePuzzle?.dateKey ?? currentDateKey,
        )

        setStats(nextStats)
        saveStats(nextStats)
      } catch {
        let fallbackStats = loadStats()
        for (const result of remainingPendingResults) {
          fallbackStats = recordDailyResult(fallbackStats, result)
        }

        const nextStats = expireStreak(fallbackStats, activePuzzle?.dateKey ?? currentDateKey)
        setStats(nextStats)
        saveStats(nextStats)
      }
    }

    const inFlight = run().finally(() => {
      if (refreshInFlightRef.current === inFlight) refreshInFlightRef.current = null
    })
    refreshInFlightRef.current = inFlight
    return inFlight
  }, [gateway, now])

  useEffect(() => {
    mountedRef.current = true

    if (!gateway) {
      adoptIdentity(null)
      return () => {
        mountedRef.current = false
      }
    }

    let active = true
    const unsubscribe = gateway.watchIdentity((nextIdentity) => {
      if (active) adoptIdentity(nextIdentity)
    })

    void gateway
      .getIdentity()
      .then((nextIdentity) => {
        if (active) adoptIdentity(nextIdentity)
      })
      .catch(() => {
        if (active) adoptIdentity(null)
      })

    return () => {
      active = false
      mountedRef.current = false
      generationRef.current += 1
      unsubscribe()
    }
  }, [adoptIdentity, gateway])

  useEffect(() => {
    if (authenticationStatus !== 'signed-in') return
    void refresh()
  }, [authenticationStatus, identity?.id, refresh])

  useEffect(() => {
    if (now || authenticationStatus !== 'signed-in') return

    const handleRefresh = () => void refresh()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleRefresh()
    }
    const intervalId = window.setInterval(() => {
      const currentDateKey = getDateKey(new Date(), DAILY_TIME_ZONE)
      if (puzzle?.dateKey !== currentDateKey) handleRefresh()
    }, 60_000)

    window.addEventListener('focus', handleRefresh)
    window.addEventListener('online', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('online', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [authenticationStatus, now, puzzle?.dateKey, refresh])

  async function signIn(username: string, password: string): Promise<void> {
    if (!gateway) {
      throw new PrivateAccessError('not-configured', 'El acceso privado no está configurado.')
    }

    const nextIdentity = await gateway.signIn(username, password)
    adoptIdentity(nextIdentity)
  }

  async function signOut(): Promise<void> {
    if (!gateway) return
    await gateway.signOut()
    adoptIdentity(null)
  }

  function recordCompletedResult(result: CompletedDailyResult): void {
    queuePendingDailyResult(result)
    setStats((currentStats) => {
      const nextStats = recordDailyResult(currentStats, result)
      saveStats(nextStats)
      return nextStats
    })

    if (!gateway || !identityRef.current) return

    void gateway
      .saveCompletedResult(result)
      .then(() => removePendingDailyResult(result.dateKey))
      .catch(() => undefined)
  }

  return {
    authenticationStatus,
    dailyStatus,
    dailyErrorReason,
    identity,
    puzzle,
    stats,
    signIn,
    signOut,
    recordCompletedResult,
    refresh,
  }
}

function getAccessErrorReason(error: unknown): PrivateAccessErrorReason {
  return error instanceof PrivateAccessError ? error.reason : 'unavailable'
}
