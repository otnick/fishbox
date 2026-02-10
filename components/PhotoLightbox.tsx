'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Share2 } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'

interface Photo {
  id: string
  url: string
  species?: string
  date?: string
}

interface PhotoLightboxProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}

export default function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isZoomed, setIsZoomed] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
    setIsZoomed(false)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
    setIsZoomed(false)
  }

  const handleDownload = async () => {
    const photo = photos[currentIndex]
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fishbox-${photo.species || 'catch'}-${Date.now()}.jpg`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleShare = async () => {
    const photo = photos[currentIndex]
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mein ${photo.species || 'Fang'}`,
          text: `Check out meinen ${photo.species || 'Fang'}!`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast('Link kopiert!', 'success')
    }
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="text-white">
            <div className="font-semibold">{currentPhoto.species || 'Fang'}</div>
            <div className="text-sm text-gray-400">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isZoomed ? 'Zoom Out' : 'Zoom In'}
            >
              {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image */}
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
        <div 
          className={`relative w-full h-full transition-transform duration-300 ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Image
            src={currentPhoto.url}
            alt={currentPhoto.species || 'Catch'}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex gap-2 justify-center overflow-x-auto max-w-7xl mx-auto pb-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => {
                  setCurrentIndex(index)
                  setIsZoomed(false)
                }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-ocean-light scale-110'
                    : 'opacity-50 hover:opacity-100'
                }`}
              >
                <Image
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="100vw"
            className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Touch Swipe Hint */}
      {photos.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-sm animate-pulse md:hidden">
          Swipe für nächstes Foto
        </div>
      )}
    </div>
  )
}
