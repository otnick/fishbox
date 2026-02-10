'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import Link from 'next/link'
import { Trophy, Fish, TrendingUp, Award, Eye } from 'lucide-react'
import VerificationBadge from '@/components/VerificationBadge'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

interface LeaderboardEntry {
  user_id: string
  username: string
  total_catches: number
  total_weight: number
  biggest_catch: number
  biggest_catch_species: string
  biggest_catch_id: string
  unique_species: number
  recent_catch_photo?: string
  recent_catch_status?: 'pending' | 'verified' | 'rejected' | 'manual'
  recent_catch_ai_verified?: boolean
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month')
  const [category, setCategory] = useState<'catches' | 'weight' | 'size' | 'species'>('catches')
  const [speciesFilter, setSpeciesFilter] = useState<string>('all')
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const user = useCatchStore((state) => state.user)

  useEffect(() => {
    fetchLeaderboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, category, speciesFilter])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date(0)

      if (timeframe === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (timeframe === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      let query = supabase
        .from('catches')
        .select('*')
        .eq('is_public', true)
        .gte('date', startDate.toISOString())

      if (speciesFilter !== 'all') {
        query = query.eq('species', speciesFilter)
      }

      const { data: catches, error} = await query

      if (error) {
        console.error('Error fetching leaderboard:', error)
        return
      }

      const species = [...new Set(catches.map((c: any) => c.species))].sort()
      setAvailableSpecies(species)

      const userStats = new Map<string, {
        catches: number
        totalWeight: number
        biggestCatch: number
        biggestCatchSpecies: string
        biggestCatchId: string
        species: Set<string>
        recentPhoto?: string
        recentStatus?: 'pending' | 'verified' | 'rejected' | 'manual'
        recentAiVerified?: boolean
      }>()

      catches.forEach((c: any) => {
        if (!userStats.has(c.user_id)) {
          userStats.set(c.user_id, {
            catches: 0,
            totalWeight: 0,
            biggestCatch: 0,
            biggestCatchSpecies: '',
            biggestCatchId: '',
            species: new Set(),
            recentPhoto: undefined,
          })
        }

        const stats = userStats.get(c.user_id)!
        stats.catches++
        stats.totalWeight += c.weight || 0
        stats.species.add(c.species)

        if (c.length > stats.biggestCatch) {
          stats.biggestCatch = c.length
          stats.biggestCatchSpecies = c.species
          stats.biggestCatchId = c.id
        }

        if (!stats.recentPhoto && c.photo_url) {
          stats.recentPhoto = c.photo_url
          stats.recentStatus = c.verification_status
          stats.recentAiVerified = c.ai_verified
        }
      })

      const userIds = Array.from(userStats.keys())
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)

      const leaderboardData: LeaderboardEntry[] = userIds
        .map(userId => {
          const stats = userStats.get(userId)!
          const profile = profiles?.find(p => p.id === userId)

          return {
            user_id: userId,
            username: profile?.username || 'angler',
            total_catches: stats.catches,
            total_weight: stats.totalWeight,
            biggest_catch: stats.biggestCatch,
            biggest_catch_species: stats.biggestCatchSpecies,
            biggest_catch_id: stats.biggestCatchId,
            unique_species: stats.species.size,
            recent_catch_photo: stats.recentPhoto,
            recent_catch_status: stats.recentStatus,
            recent_catch_ai_verified: stats.recentAiVerified,
          }
        })
        .sort((a, b) => {
          switch (category) {
            case 'weight':
              return b.total_weight - a.total_weight
            case 'size':
              return b.biggest_catch - a.biggest_catch
            case 'species':
              return b.unique_species - a.unique_species
            default:
              return b.total_catches - a.total_catches
          }
        })
        .slice(0, 100)

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error in fetchLeaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMedal = (index: number) => {
    if (index === 0) return '#1'
    if (index === 1) return '#2'
    if (index === 2) return '#3'
    return null
  }

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'weight':
        return `${(entry.total_weight / 1000).toFixed(1)} kg`
      case 'size':
        return `${entry.biggest_catch} cm (${entry.biggest_catch_species})`
      case 'species':
        return `${entry.unique_species} Arten`
      default:
        return `${entry.total_catches} Fänge`
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-ocean-light" />
          Bestenliste
        </h1>
        <p className="text-ocean-light mt-1">Top 100 Angler im Ranking</p>
      </div>

      <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-ocean-light text-sm mb-2">Zeitraum</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none transition-all"
            >
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
              <option value="all">Alle Zeit</option>
            </select>
          </div>

          <div>
            <label className="block text-ocean-light text-sm mb-2">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none transition-all"
            >
              <option value="catches">Meiste Fänge</option>
              <option value="weight">Gesamt-Gewicht</option>
              <option value="size">Größter Fisch</option>
              <option value="species">Meiste Arten</option>
            </select>
          </div>

          <div>
            <label className="block text-ocean-light text-sm mb-2">Fischart</label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none transition-all"
            >
              <option value="all">Alle Arten</option>
              {availableSpecies.map(species => (
                <option key={species} value={species}>{species}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="grid" />
      ) : leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Noch keine Einträge"
          description="Sei der Erste im Ranking! Mache deine Fänge Öffentlich und zeig was du drauf hast."
          actionLabel="Zu meinen Fängen"
          actionHref="/catches"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.user_id === user?.id
            const medal = getMedal(index)

            return (
              <div
                key={entry.user_id}
                className={`
                  bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden 
                  hover:bg-ocean/40 transition-all duration-300 
                  hover:shadow-xl hover:scale-105 animate-slide-up
                  ${isCurrentUser ? 'ring-2 ring-ocean-light shadow-lg' : ''}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative">
                  {entry.recent_catch_photo ? (
                    <div className="relative h-32 bg-ocean-dark">
                      <Image
                        src={entry.recent_catch_photo}
                        alt="Recent catch"
                        fill
                        sizes="100vw"
            className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <VerificationBadge
                          status={entry.recent_catch_status}
                          aiVerified={entry.recent_catch_ai_verified}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-ocean-deeper to-transparent" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-ocean-light/20 to-ocean-dark/20 flex items-center justify-center">
                      <Fish className="w-12 h-12 text-ocean-light/50" />
                    </div>
                  )}
                  {!entry.recent_catch_photo && (
                    <div className="absolute top-2 left-2">
                      <VerificationBadge
                        status={entry.recent_catch_status}
                        aiVerified={entry.recent_catch_ai_verified}
                      />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-ocean-deeper/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="text-white font-bold text-lg">
                      {medal || `#${index + 1}`}
                    </span>
                  </div>
                  {isCurrentUser && (
                    <div className="absolute top-2 right-2 bg-ocean-light/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-semibold">Du</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <Link href={`/user/${entry.user_id}`}>
                    <h3 className="text-lg font-bold text-white hover:text-ocean-light transition-colors mb-2 flex items-center gap-2">
                      @{entry.username}
                      {index < 3 && <Award className="w-4 h-4 text-ocean-light" />}
                    </h3>
                  </Link>

                  <div className="mb-3 p-3 bg-gradient-to-br from-ocean-dark/50 to-ocean/30 rounded-lg">
                    <div className="text-ocean-light text-xs mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {category === 'catches' && 'Gesamt Fänge'}
                      {category === 'weight' && 'Gesamt Gewicht'}
                      {category === 'size' && 'Größter Fisch'}
                      {category === 'species' && 'Verschiedene Arten'}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {getCategoryValue(entry)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="bg-ocean-dark/30 rounded p-2">
                      <div className="text-ocean-light text-xs flex items-center gap-1">
                        <Fish className="w-3 h-3" />
                        Fänge
                      </div>
                      <div className="text-white font-semibold">{entry.total_catches}</div>
                    </div>
                    <div className="bg-ocean-dark/30 rounded p-2">
                      <div className="text-ocean-light text-xs">Arten</div>
                      <div className="text-white font-semibold">{entry.unique_species}</div>
                    </div>
                  </div>

                  {entry.biggest_catch_id && (
                    <Link href={`/catch/${entry.biggest_catch_id}`}>
                      <button className="w-full px-3 py-2 bg-gradient-to-r from-ocean-dark/50 to-ocean/30 rounded text-ocean-light hover:from-ocean hover:to-ocean-dark hover:text-white transition-all text-sm flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        Größten Fang ansehen
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

