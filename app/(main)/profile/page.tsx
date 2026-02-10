'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCatchStore } from '@/lib/store'

export default function ProfileRedirectPage() {
  const user = useCatchStore((state) => state.user)
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    router.replace(`/user/${user.id}`)
  }, [user, router])

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-ocean-light">
      Profil wird geladen...
    </div>
  )
}
