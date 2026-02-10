'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Auth from '@/components/auth/Auth'
import { useCatchStore } from '@/lib/store'

export default function Home() {
  const user = useCatchStore((state) => state.user)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user) {
    return null
  }

  return <Auth onSuccess={() => router.push('/dashboard')} />
}
