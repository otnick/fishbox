'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Activity {
  id: string
  user_email: string
  activity_type: string
  species?: string
  length?: number
  photo?: string
  created_at: string
}

export default function SocialPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const user = useCatchStore((state) => state.user)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      // Fetch recent public catches
      const { data: catches, error } = await supabase
        .from('catches')
        .select('id, user_id, species, length, photo_url, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching activities:', error)
        return
      }

      // Get user emails (simplified - in production use profiles table)
      const userIds = [...new Set(catches.map((c: any) => c.user_id))]
      const { data: { users } } = await supabase.auth.admin.listUsers()

      const activitiesData = catches.map((c: any) => {
        const userEmail = users?.find(u => u.id === c.user_id)?.email || 'Unbekannt'
        
        return {
          id: c.id,
          user_email: userEmail,
          activity_type: 'catch',
          species: c.species,
          length: c.length,
          photo: c.photo_url,
          created_at: c.created_at,
        }
      })

      setActivities(activitiesData)
    } catch (error) {
      console.error('Error in fetchActivities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (catchId: string) => {
    if (!user) return

    try {
      // Toggle like
      const { data: existing } = await supabase
        .from('catch_likes')
        .select('id')
        .eq('catch_id', catchId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        // Unlike
        await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', catchId)
          .eq('user_id', user.id)
      } else {
        // Like
        await supabase
          .from('catch_likes')
          .insert({ catch_id: catchId, user_id: user.id })
      }

      // Refresh
      fetchActivities()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">👥 Social</h1>
        <p className="text-ocean-light mt-1">Sieh was andere Angler fangen</p>
      </div>

      {/* Info Box */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">💡</div>
          <div>
            <h3 className="text-white font-semibold mb-2">Teile deine Fänge!</h3>
            <p className="text-ocean-light text-sm">
              Mache deine Fänge öffentlich, um in der Community sichtbar zu werden.
              In deinen Fängen kannst du einzelne Fänge auf &quot;Öffentlich&quot; stellen.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="text-ocean-light">Laden...</div>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🎣</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Noch keine Aktivitäten
          </h3>
          <p className="text-ocean-light">
            Sei der Erste, der einen öffentlichen Fang teilt!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-ocean/40 transition-colors"
            >
              {/* Photo */}
              {activity.photo && (
                <div className="relative w-full h-64">
                  <Image
                    src={activity.photo}
                    alt={activity.species}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-white">
                      {activity.user_email.split('@')[0]}
                    </div>
                    <div className="text-ocean-light text-sm">
                      {format(new Date(activity.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-white text-lg font-semibold">
                    🎣 {activity.species} gefangen!
                  </div>
                  <div className="text-ocean-light">
                    {activity.length} cm
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-ocean-light/20">
                  <button
                    onClick={() => handleLike(activity.id)}
                    className="flex items-center gap-2 text-ocean-light hover:text-white transition-colors"
                  >
                    <span className="text-xl">❤️</span>
                    <span className="text-sm">Gefällt mir</span>
                  </button>
                  <button className="flex items-center gap-2 text-ocean-light hover:text-white transition-colors">
                    <span className="text-xl">💬</span>
                    <span className="text-sm">Kommentieren</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {activities.length >= 50 && (
        <div className="text-center">
          <button
            onClick={fetchActivities}
            className="bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Mehr laden
          </button>
        </div>
      )}
    </div>
  )
}
