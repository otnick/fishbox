'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import { Users, UserPlus, UserCheck, UserX, Search, Fish, Award } from 'lucide-react'

interface Friend {
  id: string
  username: string
  bio?: string
  stats?: {
    catches: number
    species: number
  }
}

interface FriendRequest {
  id: string
  friend_id: string
  username: string
  created_at: string
}

export default function FriendsPage() {
  const user = useCatchStore((state) => state.user)
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

  useEffect(() => {
    if (user) {
      fetchFriends()
      fetchRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchFriends = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      if (error) throw error

      const friendIds = data.map(f => f.friend_id)

      if (friendIds.length === 0) {
        setFriends([])
        setLoading(false)
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .in('id', friendIds)

      // Get stats for each friend
      const friendsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: catches } = await supabase
            .from('catches')
            .select('species')
            .eq('user_id', profile.id)
            .eq('is_public', true)

          return {
            ...profile,
            stats: {
              catches: catches?.length || 0,
              species: new Set(catches?.map(c => c.species)).size || 0,
            },
          }
        })
      )

      setFriends(friendsWithStats)
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      if (error) throw error

      const userIds = data.map(r => r.user_id)

      if (userIds.length === 0) {
        setRequests([])
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)

      const requestsWithProfiles = data.map(req => {
        const profile = profiles?.find(p => p.id === req.user_id)
        return {
          id: req.id,
          friend_id: req.user_id,
          username: profile?.username || 'Unbekannt',
          created_at: req.created_at,
        }
      })

      setRequests(requestsWithProfiles)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .ilike('username', `%${query}%`)
        .neq('id', user.id)
        .limit(10)

      if (error) throw error

      // Get stats for search results
      const resultsWithStats = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: catches } = await supabase
            .from('catches')
            .select('species')
            .eq('user_id', profile.id)
            .eq('is_public', true)

          return {
            ...profile,
            stats: {
              catches: catches?.length || 0,
              species: new Set(catches?.map(c => c.species)).size || 0,
            },
          }
        })
      )

      setSearchResults(resultsWithStats)
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const sendRequest = async (friendId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        })

      if (error) throw error

      alert('Freundschaftsanfrage gesendet!')
      setSearchResults(prev => prev.filter(u => u.id !== friendId))
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Anfrage bereits gesendet!')
      } else {
        alert('Fehler beim Senden der Anfrage')
      }
    }
  }

  const acceptRequest = async (requestId: string, friendId: string) => {
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      await supabase
        .from('friendships')
        .insert({
          user_id: user!.id,
          friend_id: friendId,
          status: 'accepted',
        })

      fetchFriends()
      fetchRequests()
      alert('Freundschaftsanfrage angenommen!')
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  const rejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)

      fetchRequests()
      alert('Anfrage abgelehnt')
    } catch (error) {
      console.error('Error rejecting request:', error)
    }
  }

  const removeFriend = async (friendId: string) => {
    if (!confirm('Freund wirklich entfernen?')) return

    try {
      await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user!.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user!.id})`)

      fetchFriends()
      alert('Freund entfernt')
    } catch (error) {
      console.error('Error removing friend:', error)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-ocean-light" />
          Freunde
        </h1>
        <p className="text-ocean-light mt-1">
          {friends.length} {friends.length === 1 ? 'Freund' : 'Freunde'}
          {requests.length > 0 && ` • ${requests.length} ${requests.length === 1 ? 'Anfrage' : 'Anfragen'}`}
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
          <Users className="w-4 h-4 inline mr-2" />
          Freunde ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-semibold relative ${
            activeTab === 'requests'
              ? 'bg-ocean text-white'
              : 'text-ocean-light hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          Anfragen ({requests.length})
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-semibold ${
            activeTab === 'search'
              ? 'bg-ocean text-white'
              : 'text-ocean-light hover:text-white'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Suchen
        </button>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
              <div className="text-ocean-light">Laden...</div>
            </div>
          ) : friends.length === 0 ? (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
              <Users className="w-16 h-16 text-ocean-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Noch keine Freunde</h3>
              <p className="text-ocean-light mb-6">Suche nach Anglern und füge sie als Freunde hinzu!</p>
              <button
                onClick={() => setActiveTab('search')}
                className="bg-gradient-to-r from-ocean-light to-ocean hover:from-ocean hover:to-ocean-dark text-white font-semibold py-3 px-8 rounded-lg transition-all"
              >
                Freunde finden
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 hover:bg-ocean/40 transition-all duration-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Link href={`/user/${friend.username}`}>
                      <div>
                        <h3 className="text-lg font-bold text-white hover:text-ocean-light transition-colors">
                          @{friend.username}
                        </h3>
                        {friend.bio && (
                          <p className="text-ocean-light text-sm mt-1 line-clamp-2">
                            {friend.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-ocean-dark/50 rounded p-2">
                      <div className="text-ocean-light text-xs flex items-center gap-1">
                        <Fish className="w-3 h-3" />
                        Fänge
                      </div>
                      <div className="text-white font-semibold">{friend.stats?.catches || 0}</div>
                    </div>
                    <div className="bg-ocean-dark/50 rounded p-2">
                      <div className="text-ocean-light text-xs flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Arten
                      </div>
                      <div className="text-white font-semibold">{friend.stats?.species || 0}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/user/${friend.username}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-ocean hover:bg-ocean-light text-white rounded text-sm transition-colors">
                        Profil ansehen
                      </button>
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
              <UserCheck className="w-16 h-16 text-ocean-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Keine Anfragen</h3>
              <p className="text-ocean-light">Du hast keine ausstehenden Freundschaftsanfragen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 flex items-center justify-between hover:bg-ocean/40 transition-all"
                >
                  <Link href={`/user/${request.username}`}>
                    <div>
                      <h3 className="text-lg font-bold text-white hover:text-ocean-light transition-colors">
                        @{request.username}
                      </h3>
                      <p className="text-ocean-light text-sm">
                        Möchte dein Freund sein
                      </p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(request.id, request.friend_id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Annehmen
                    </button>
                    <button
                      onClick={() => rejectRequest(request.id)}
                      className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-light" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                placeholder="Suche nach Username..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              />
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 hover:bg-ocean/40 transition-all duration-300"
                >
                  <Link href={`/user/${result.username}`}>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white hover:text-ocean-light transition-colors">
                        @{result.username}
                      </h3>
                      {result.bio && (
                        <p className="text-ocean-light text-sm mt-1 line-clamp-2">
                          {result.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-ocean-dark/50 rounded p-2">
                      <div className="text-ocean-light text-xs">Fänge</div>
                      <div className="text-white font-semibold">{result.stats?.catches || 0}</div>
                    </div>
                    <div className="bg-ocean-dark/50 rounded p-2">
                      <div className="text-ocean-light text-xs">Arten</div>
                      <div className="text-white font-semibold">{result.stats?.species || 0}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => sendRequest(result.id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-ocean-light to-ocean hover:from-ocean hover:to-ocean-dark text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Anfrage senden
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
              <Search className="w-16 h-16 text-ocean-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Keine Ergebnisse</h3>
              <p className="text-ocean-light">
                Keine User mit &quot;{searchQuery}&quot; gefunden.
              </p>
            </div>
          ) : (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
              <Search className="w-16 h-16 text-ocean-light mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Suche nach Anglern</h3>
              <p className="text-ocean-light">
                Gib einen Username ein um nach anderen Anglern zu suchen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
