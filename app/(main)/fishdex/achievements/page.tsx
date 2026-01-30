'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import type { Achievement, UserAchievement } from '@/lib/types/fishdex'
import { ArrowLeft, Trophy, Star, Lock, Target, BookOpen, Users } from 'lucide-react'

interface AchievementWithProgress extends Achievement {
  unlocked: boolean
  unlockedAt?: string
  progress?: any
}

export default function AchievementsPage() {
  const user = useCatchStore(state => state.user)
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadAchievements()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadAchievements = async () => {
    if (!user) return

    try {
      // Load all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })

      if (achievementsError) throw achievementsError

      // Load user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)

      if (userError) throw userError

      // Merge data
      const unlockedMap = new Map(
        (userAchievements || []).map(ua => [
          ua.achievement_id,
          { unlockedAt: ua.unlocked_at, progress: ua.progress }
        ])
      )

      const achievementsWithProgress: AchievementWithProgress[] = (allAchievements || []).map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id)?.unlockedAt,
        progress: unlockedMap.get(a.id)?.progress
      }))

      setAchievements(achievementsWithProgress)
    } catch (error) {
      console.error('Error loading achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = achievements.length
    const unlocked = achievements.filter(a => a.unlocked).length
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0
    const totalXP = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + (a.xp_reward || 0), 0)

    return { total, unlocked, percentage, totalXP }
  }, [achievements])

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return achievements
    return achievements.filter(a => a.category === selectedCategory)
  }, [achievements, selectedCategory])

  const categories = [
    { id: 'all', name: 'Alle', icon: Trophy },
    { id: 'collection', name: 'Sammlung', icon: BookOpen },
    { id: 'skill', name: 'Fähigkeiten', icon: Target },
    { id: 'social', name: 'Sozial', icon: Users },
    { id: 'special', name: 'Besonders', icon: Star }
  ]

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'bronze': return 'bg-orange-900/30 border-orange-600/50 text-orange-400'
      case 'silver': return 'bg-gray-600/30 border-gray-400/50 text-gray-300'
      case 'gold': return 'bg-yellow-900/30 border-yellow-600/50 text-yellow-400'
      case 'platinum': return 'bg-purple-900/30 border-purple-600/50 text-purple-400'
      case 'diamond': return 'bg-cyan-900/30 border-cyan-600/50 text-cyan-400'
      default: return 'bg-ocean/30 border-ocean-light/50 text-ocean-light'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-ocean-light">Lade Erfolge...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Back Button */}
      <Link
        href="/fishdex"
        className="inline-flex items-center gap-2 text-ocean-light hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Zurück zur FishDex
      </Link>

      {/* Header */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              Erfolge
            </h1>
            <p className="text-ocean-light mt-1">
              Schalte Achievements frei und sammle XP!
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-ocean-dark/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {stats.unlocked}/{stats.total}
            </div>
            <div className="text-ocean-light text-sm">Freigeschaltet</div>
          </div>

          <div className="bg-ocean-dark/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {stats.percentage}%
            </div>
            <div className="text-ocean-light text-sm">Fortschritt</div>
          </div>

          <div className="bg-ocean-dark/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {stats.totalXP}
            </div>
            <div className="text-ocean-light text-sm">Gesamt XP</div>
          </div>

          <div className="bg-ocean-dark/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {achievements.filter(a => a.unlocked && a.badge_color === 'diamond').length}
            </div>
            <div className="text-ocean-light text-sm">Diamanten</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white font-semibold">Gesamtfortschritt</span>
            <span className="text-ocean-light">{stats.unlocked}/{stats.total}</span>
          </div>
          <div className="w-full bg-ocean-dark rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => {
          const count = achievements.filter(a => 
            cat.id === 'all' ? true : a.category === cat.id
          ).length
          const unlocked = achievements.filter(a => 
            (cat.id === 'all' ? true : a.category === cat.id) && a.unlocked
          ).length
          
          const IconComponent = cat.icon

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
                ${selectedCategory === cat.id
                  ? 'bg-ocean text-white'
                  : 'bg-ocean/30 text-ocean-light hover:bg-ocean/50'
                }
              `}
            >
              <IconComponent className="w-4 h-4" />
              <span className="font-semibold">{cat.name}</span>
              <span className="text-xs opacity-75">({unlocked}/{count})</span>
            </button>
          )
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`
              relative rounded-xl p-6 border-2 transition-all
              ${achievement.unlocked
                ? `${getBadgeColor(achievement.badge_color)} hover:scale-105`
                : 'bg-ocean-dark/50 border-ocean-light/20 opacity-60'
              }
            `}
          >
            {/* Lock Badge */}
            {!achievement.unlocked && (
              <div className="absolute top-3 right-3">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
            )}

            {/* Icon */}
            <div className="text-5xl mb-4 text-center">
              {achievement.unlocked ? achievement.icon || '🏆' : '🔒'}
            </div>

            {/* Name */}
            <h3 className={`text-xl font-bold text-center mb-2 ${
              achievement.unlocked ? 'text-white' : 'text-gray-500'
            }`}>
              {achievement.name}
            </h3>

            {/* Description */}
            <p className={`text-sm text-center mb-4 ${
              achievement.unlocked ? 'text-ocean-light' : 'text-gray-600'
            }`}>
              {achievement.description}
            </p>

            {/* XP Reward */}
            <div className="flex items-center justify-center gap-2">
              <Star className={`w-4 h-4 ${
                achievement.unlocked ? 'text-yellow-400' : 'text-gray-600'
              }`} />
              <span className={`font-bold ${
                achievement.unlocked ? 'text-yellow-400' : 'text-gray-600'
              }`}>
                +{achievement.xp_reward} XP
              </span>
            </div>

            {/* Unlocked Date */}
            {achievement.unlocked && achievement.unlockedAt && (
              <div className="mt-4 pt-4 border-t border-white/20 text-xs text-center text-ocean-light">
                Freigeschaltet:{' '}
                {new Date(achievement.unlockedAt).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAchievements.length === 0 && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <Trophy className="w-16 h-16 text-ocean-light mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Keine Erfolge in dieser Kategorie
          </h3>
          <p className="text-ocean-light">
            Wähle eine andere Kategorie aus.
          </p>
        </div>
      )}
    </div>
  )
}