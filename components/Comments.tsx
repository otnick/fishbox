'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useToast } from '@/components/ToastProvider'
import Avatar from '@/components/Avatar'
import { useConfirm } from '@/components/ConfirmDialogProvider'

interface Comment {
  id: string
  user_id: string
  user_email: string
  avatar_url?: string | null
  comment: string
  created_at: string
}

interface CommentsProps {
  catchId: string
}

export default function Comments({ catchId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const user = useCatchStore((state) => state.user)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('catch_comments')
        .select('*')
        .eq('catch_id', catchId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get user IDs
      const userIds = [...new Set(data.map((c: any) => c.user_id))]
      
      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)

      const commentsData = data.map((c: any) => ({
        ...c,
        user_email: profiles?.find(p => p.id === c.user_id)?.username || 'angler',
        avatar_url: profiles?.find(p => p.id === c.user_id)?.avatar_url || null,
      }))

      setComments(commentsData)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('catch_comments')
        .insert({
          catch_id: catchId,
          user_id: user.id,
          comment: newComment.trim(),
        })

      if (error) throw error

      setNewComment('')
      await fetchComments()
    } catch (error) {
      console.error('Error posting comment:', error)
      toast('Fehler beim Posten', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      title: 'Kommentar löschen?',
      message: 'Möchtest du diesen Kommentar wirklich löschen?',
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('catch_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      await fetchComments()
      toast('Kommentar gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  if (loading) {
    return <div className="text-ocean-light text-sm">Kommentare laden...</div>
  }

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Kommentar schreiben..."
            className="flex-1 px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="bg-ocean hover:bg-ocean-light text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
          >
            {submitting ? '...' : 'Senden'}
          </button>
        </form>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-ocean-light text-sm text-center py-4">
          Noch keine Kommentare
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-ocean-dark/50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar
                    seed={comment.user_email || comment.user_id}
                    src={comment.avatar_url}
                    size={28}
                    className="w-7 h-7"
                    alt={`@${comment.user_email}`}
                  />
                  <Link href={`/user/${comment.user_id}`}>
                    <div className="font-semibold text-white text-sm hover:text-ocean-light transition-colors cursor-pointer">
                      @{comment.user_email}
                    </div>
                  </Link>
                </div>
                <div className="text-xs text-ocean-light">
                  {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>
              {comment.user_id === user?.id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Löschen
                </button>
              )}
              <p className="text-white text-sm">{comment.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
