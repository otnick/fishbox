'use client'

import { CheckCircle2, Clock, Pencil, XCircle } from 'lucide-react'

interface VerificationBadgeProps {
  status?: 'pending' | 'verified' | 'rejected' | 'manual'
  aiVerified?: boolean
  className?: string
}

export default function VerificationBadge({
  status,
  aiVerified,
  className,
}: VerificationBadgeProps) {
  const effectiveStatus = status ?? 'pending'
  const isVerified = effectiveStatus === 'verified' || aiVerified
  const isManual = effectiveStatus === 'manual'
  const isRejected = effectiveStatus === 'rejected'

  let label = 'Ausstehend'
  let Icon = Clock
  let colorClass = 'bg-blue-500/90 text-white'

  if (isVerified) {
    label = 'Verifiziert'
    Icon = CheckCircle2
    colorClass = 'bg-green-500/90 text-white'
  } else if (isManual) {
    label = 'Manuell'
    Icon = Pencil
    colorClass = 'bg-yellow-500/90 text-white'
  } else if (isRejected) {
    label = 'Abgelehnt'
    Icon = XCircle
    colorClass = 'bg-red-500/90 text-white'
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${colorClass} p-2 rounded-full group cursor-help shadow-lg ${className || ''}`}
    >
      <Icon className="w-4 h-4" />
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {label}
      </div>
    </div>
  )
}
