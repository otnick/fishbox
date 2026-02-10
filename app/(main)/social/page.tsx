'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Heart, MessageCircle, MapPin, Ruler, Image as ImageIcon } from 'lucide-react'
import VerificationBadge from '@/components/VerificationBadge'

interface Activity {
  id: string
  user_id: string
  username: string
  species: string
  length: number
  weight?: number
  photo_url?: string
  location?: string
  created_at: string
  verification_status?: 'pending' | 'verified' | 'rejected' | 'manual'
  ai_verified?: boolean
  likes_count: number
  comments_count: number
  user_has_liked: boolean
  photo_count?: number
}

export default function SocialPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'explore'>('friends')
  const [friendIds, setFriendIds] = useState<string[]>([])
  const user = useCatchStore((state) => state.user)

  useEffect(() => {
    if (user) {
      fetchActivities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab])

  const fetchActivities = async () => {
    if (!user) return

    try {
      setLoading(true)

      let catchQuery = supabase
        .from('catches')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30)

      if (activeTab === 'friends') {
        const { data: friendships, error: friendsError } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted')

        if (friendsError) throw friendsError

        const ids = (friendships || []).map(f => f.friend_id)
        setFriendIds(ids)

        if (ids.length === 0) {
          setActivities([])
          setLoading(false)
          return
        }

        catchQuery = catchQuery.in('user_id', ids)
      }

      const { data: catches, error } = await catchQuery

      if (error) throw error

      const activitiesWithData = await Promise.all(
        (catches || []).map(async (catchItem) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', catchItem.user_id)
            .single()

          const { count: likesCount } = await supabase
            .from('catch_likes')
            .select('*', { count: 'exact', head: true })
            .eq('catch_id', catchItem.id)

          const { count: commentsCount } = await supabase
            .from('catch_comments')
            .select('*', { count: 'exact', head: true })
            .eq('catch_id', catchItem.id)

          const { data: userLike } = await supabase
            .from('catch_likes')
            .select('id')
            .eq('catch_id', catchItem.id)
            .eq('user_id', user.id)
            .single()

          const { count: photoCount } = await supabase
            .from('catch_photos')
            .select('*', { count: 'exact', head: true })
            .eq('catch_id', catchItem.id)

          return {
            id: catchItem.id,
            user_id: catchItem.user_id,
            username: profile?.username || 'angler',
            species: catchItem.species,
            length: catchItem.length,
            weight: catchItem.weight,
            photo_url: catchItem.photo_url,
            location: catchItem.location,
            created_at: catchItem.created_at,
            verification_status: catchItem.verification_status,
            ai_verified: catchItem.ai_verified,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_has_liked: !!userLike,
            photo_count: photoCount || 0,
          }
        })
      )

      setActivities(activitiesWithData)
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = async (activityId: string) => {
    if (!user) return

    const activity = activities.find(a => a.id === activityId)
    if (!activity) return

    try {
      if (activity.user_has_liked) {
        await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', activityId)
          .eq('user_id', user.id)

        setActivities(prev => prev.map(a =>
          a.id === activityId
            ? { ...a, likes_count: a.likes_count - 1, user_has_liked: false }
            : a
        ))
      } else {
        await supabase
          .from('catch_likes')
          .insert({
            catch_id: activityId,
            user_id: user.id,
          })

        setActivities(prev => prev.map(a =>
          a.id === activityId
            ? { ...a, likes_count: a.likes_count + 1, user_has_liked: true }
            : a
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="text-ocean-light">Laden...</div>
        </div>
      </div>
    )
  }

  const showEmptyState = activities.length === 0

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-ocean-light" />
          Social Feed
        </h1>
        <p className="text-ocean-light">
          {activities.length} {activities.length === 1 ? 'Fang' : 'Fänge'}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-semibold ${
            activeTab === 'friends'
              ? 'bg-ocean text-white'
              : 'text-ocean-light hover:text-white'
          }`}
        >
          Freunde{friendIds.length > 0 ? ` (${friendIds.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-semibold ${
            activeTab === 'explore'
              ? 'bg-ocean text-white'
              : 'text-ocean-light hover:text-white'
          }`}
        >
          Entdecken
        </button>
      </div>

      {showEmptyState ? (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">?</div>
          <h3 className="text-2xl font-bold text-white mb-2">Keine Aktivitäten</h3>
          <p className="text-ocean-light">
            {activeTab === 'friends'
              ? 'Noch keine öffentlichen Fänge von deinen Freunden.'
              : 'Noch keine öffentlichen Fänge verfügbar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Feed Grid - Better Desktop Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/catch/${activity.id}`}
                className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
            {/* Photo */}
            {activity.photo_url && (
              <div className="relative h-56 bg-ocean-dark">
                <Image
                  src={activity.photo_url}
                  alt={activity.species}
                  fill
                  sizes="100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <VerificationBadge
                  status={activity.verification_status}
                  aiVerified={activity.ai_verified}
                  className="absolute top-2 left-2"
                />
                {/* Photo Count Badge */}
                {activity.photo_count && activity.photo_count > 1 && (
                  <div className="absolute top-3 right-3 bg-ocean-deeper/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-white" />
                    <span className="text-white text-xs font-semibold">
                          {activity.photo_count}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  {/* User */}
                  <div className="flex items-center gap-2 mb-3">
                    <Link
                      href={`/user/${activity.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-ocean-light hover:text-white transition-colors text-sm font-semibold"
                    >
                      @{activity.username}
                    </Link>
                    <span className="text-ocean-light/50 text-xs">?</span>
                    <span className="text-ocean-light/70 text-xs">
                      {format(new Date(activity.created_at), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>

              {/* Species */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-bold text-white group-hover:text-ocean-light transition-colors">
                  {activity.species}
                </h3>
                {!activity.photo_url && (
                  <VerificationBadge
                    status={activity.verification_status}
                    aiVerified={activity.ai_verified}
                    className="ml-1"
                  />
                )}
              </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-ocean-dark/50 rounded p-2">
                      <div className="text-ocean-light text-xs flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        Länge
                      </div>
                      <div className="text-white font-semibold">{activity.length} cm</div>
                    </div>

                    {activity.weight && (
                      <div className="bg-ocean-dark/50 rounded p-2">
                        <div className="text-ocean-light text-xs">Gewicht</div>
                        <div className="text-white font-semibold">
                          {activity.weight > 1000
                            ? `${(activity.weight / 1000).toFixed(2)} kg`
                            : `${activity.weight} g`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  {activity.location && (
                    <div className="flex items-center gap-2 text-ocean-light text-sm mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{activity.location}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4 border-t border-ocean-light/20">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleLike(activity.id)
                      }}
                      className={`flex items-center gap-2 transition-all ${
                        activity.user_has_liked
                          ? 'text-red-400 scale-110'
                          : 'text-ocean-light hover:text-red-400 hover:scale-105'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${activity.user_has_liked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-semibold">{activity.likes_count}</span>
                    </button>

                    <div className="flex items-center gap-2 text-ocean-light">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">{activity.comments_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
