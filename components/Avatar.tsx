'use client'

import { createAvatar } from '@dicebear/core'
import { identicon } from '@dicebear/collection'
import Image from 'next/image'

interface AvatarProps {
  seed: string
  src?: string | null
  size?: number
  className?: string
  alt?: string
}

export default function Avatar({ seed, src, size = 48, className = '', alt = 'Avatar' }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  const svg = createAvatar(identicon, {
    seed,
    size,
  }).toString()

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  return (
    <Image
      src={dataUri}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={`rounded-full ${className}`}
    />
  )
}
