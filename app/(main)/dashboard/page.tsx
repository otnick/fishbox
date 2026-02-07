'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCatchStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { format, subDays, isAfter } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus, MapPin, BarChart3, User, BookOpen, Trophy, LayoutDashboard } from 'lucide-react'
import FishAquarium from '@/components/FishAquarium'
import VerificationBadge from '@/components/VerificationBadge'

export default function DashboardPage() {
  const catches = useCatchStore((state) => state.catches)
  const user = useCatchStore((state) => state.user)
  const [fishDexStats, setFishDexStats] = useState<{discovered: number, total: number} | null>(null)

  useEffect(() => {
    if (user) {
      loadFishDexStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadFishDexStats = async () => {
    if (!user) return
    
    try {
      // Get total Deutschland species
      const { count: total } = await supabase
        .from('fish_species')
        .select('*', { count: 'exact', head: true })
        .contains('region', ['deutschland'])

      // Get user's discovered species
      const { count: discovered } = await supabase
        .from('user_fishdex')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setFishDexStats({ discovered: discovered || 0, total: total || 0 })
    } catch (error) {
      console.error('Error loading FishDex stats:', error)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalCatches = catches.length
    const uniqueSpecies = new Set(catches.map(c => c.species)).size
    const biggestCatch = catches.length > 0 ? Math.max(...catches.map(c => c.length)) : 0
    const recentCatches = catches.filter(c => 
      isAfter(new Date(c.date), subDays(new Date(), 7))
    ).length

    return { totalCatches, uniqueSpecies, biggestCatch, recentCatches }
  }, [catches])

  const recentCatchesList = catches.slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-ocean-light" />
          Dashboard
        </h1>
        <p className="text-ocean-light mt-1">Willkommen zurück! Hier ist deine Übersicht.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6">
          <div className="text-ocean-light text-sm">Gesamt</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.totalCatches}</div>
          <div className="text-ocean-light text-xs mt-1">Fänge</div>
        </div>

        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6">
          <div className="text-ocean-light text-sm">Diese Woche</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.recentCatches}</div>
          <div className="text-ocean-light text-xs mt-1">Neue Fänge</div>
        </div>

        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6">
          <div className="text-ocean-light text-sm">Größter</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.biggestCatch}</div>
          <div className="text-ocean-light text-xs mt-1">cm</div>
        </div>

        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6">
          <div className="text-ocean-light text-sm">Arten</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.uniqueSpecies}</div>
          <div className="text-ocean-light text-xs mt-1">Verschiedene</div>
        </div>
      </div>

      {/* 3D Aquarium */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden p-4">
        <h2 className="text-xl font-bold text-white mb-4">Dein Aquarium</h2>
        <div className="rounded-xl overflow-hidden">
          <FishAquarium />
        </div>
      </div>

      {/* FishDex Widget */}
      {fishDexStats && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-ocean-light" />
              <h2 className="text-xl font-bold text-white">FishDex</h2>
            </div>
            <Link
              href="/fishdex"
              className="text-ocean-light hover:text-white text-sm transition-colors"
            >
              Zur FishDex →
            </Link>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ocean-light">Deutschland</span>
              <span className="text-white font-semibold">
                {fishDexStats.discovered}/{fishDexStats.total} (
                {fishDexStats.total > 0 
                  ? Math.round((fishDexStats.discovered / fishDexStats.total) * 100)
                  : 0}%)
              </span>
            </div>
            <div className="w-full bg-ocean-dark rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-ocean-light to-ocean h-full transition-all duration-500"
                style={{ 
                  width: `${fishDexStats.total > 0 
                    ? (fishDexStats.discovered / fishDexStats.total) * 100 
                    : 0}%` 
                }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/fishdex"
              className="bg-ocean-dark/50 rounded-lg p-4 hover:bg-ocean-dark transition-colors"
            >
              <div className="text-2xl font-bold text-white mb-1">
                {fishDexStats.discovered}
              </div>
              <div className="text-ocean-light text-sm">Entdeckt</div>
            </Link>
            <Link
              href="/fishdex/achievements"
              className="bg-ocean-dark/50 rounded-lg p-4 hover:bg-ocean-dark transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {fishDexStats.total - fishDexStats.discovered}
                </div>
                <div className="text-ocean-light text-sm">Zu finden</div>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400/50" />
            </Link>
          </div>

          {fishDexStats.discovered === 0 && (
            <div className="mt-4 text-center p-4 bg-ocean-dark/30 rounded-lg">
              <p className="text-ocean-light text-sm">
                💡 Fange deinen ersten Fisch um die FishDex zu starten!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Catches */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Letzte Fänge</h2>
          <Link 
            href="/catches"
            className="text-ocean-light hover:text-white text-sm transition-colors"
          >
            Alle ansehen →
          </Link>
        </div>

        {recentCatchesList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎣</div>
            <p className="text-ocean-light mb-4">Noch keine Fänge</p>
            <Link
              href="/catches"
              className="inline-block bg-ocean hover:bg-ocean-light text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Ersten Fang hinzufügen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCatchesList.map((catchData) => (
              <Link key={catchData.id} href={`/catch/${catchData.id}`}>
                <div className="flex items-center gap-4 bg-ocean-dark/50 rounded-lg p-4 hover:bg-ocean-dark transition-colors cursor-pointer group">
                  {catchData.photo && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={catchData.photo}
                        alt={catchData.species}
                        fill
                        className="object-cover rounded-lg group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute -top-1 -left-1">
                        <VerificationBadge
                          status={catchData.verification_status as any}
                          aiVerified={catchData.ai_verified}
                          className="scale-75 origin-top-left"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-white truncate group-hover:text-ocean-light transition-colors">
                        {catchData.species}
                      </div>
                      {!catchData.photo && (
                        <VerificationBadge
                          status={catchData.verification_status as any}
                          aiVerified={catchData.ai_verified}
                          className="scale-75 origin-left"
                        />
                      )}
                    </div>
                    <div className="text-sm text-ocean-light">
                      {catchData.length} cm
                      {catchData.weight && ` • ${catchData.weight > 1000 
                        ? `${(catchData.weight / 1000).toFixed(1)} kg`
                        : `${catchData.weight} g`
                      }`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-ocean-light">
                      {format(new Date(catchData.date), 'dd.MM.yyyy', { locale: de })}
                    </div>
                    {catchData.location && (
                      <div className="text-xs text-ocean-light/70 truncate max-w-[100px]">
                        📍 {catchData.location}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/catches"
          className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 hover:bg-ocean/50 transition-colors text-center group"
        >
          <Plus className="w-12 h-12 mx-auto mb-3 text-ocean-light group-hover:text-white transition-colors" />
          <div className="text-white font-semibold text-sm sm:text-base">Fang hinzufügen</div>
        </Link>

        <Link
          href="/map"
          className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 hover:bg-ocean/50 transition-colors text-center group"
        >
          <MapPin className="w-12 h-12 mx-auto mb-3 text-ocean-light group-hover:text-white transition-colors" />
          <div className="text-white font-semibold text-sm sm:text-base">Spots anzeigen</div>
        </Link>

        <Link
          href="/stats"
          className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 hover:bg-ocean/50 transition-colors text-center group"
        >
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-ocean-light group-hover:text-white transition-colors" />
          <div className="text-white font-semibold text-sm sm:text-base">Statistiken</div>
        </Link>

        <Link
          href="/profile"
          className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 hover:bg-ocean/50 transition-colors text-center group"
        >
          <User className="w-12 h-12 mx-auto mb-3 text-ocean-light group-hover:text-white transition-colors" />
          <div className="text-white font-semibold text-sm sm:text-base">Profil</div>
        </Link>
      </div>
    </div>
  )
}
