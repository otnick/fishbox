'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { FishSpecies, Achievement } from '@/lib/types/fishdex'
import { Trophy, Star, ArrowRight } from 'lucide-react'

interface ScanAnimationProps {
  species: FishSpecies
  newAchievements?: Achievement[]
  onClose: () => void
}

export default function ScanAnimation({ species, newAchievements = [], onClose }: ScanAnimationProps) {
  const [stage, setStage] = useState<'scanning' | 'reveal' | 'achievements'>('scanning')
  const [progress, setProgress] = useState(0)

  // Debug: Component mounted
  useEffect(() => {
    console.log('🎬 ScanAnimation MOUNTED!', { species: species.name, achievements: newAchievements.length })
    return () => console.log('🎬 ScanAnimation UNMOUNTED')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Scanning animation
    if (stage === 'scanning') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setStage('reveal'), 300)
            return 100
          }
          return prev + 2
        })
      }, 30)

      return () => clearInterval(interval)
    }
  }, [stage])

  useEffect(() => {
    // Auto advance from reveal to achievements
    if (stage === 'reveal' && newAchievements.length > 0) {
      const timer = setTimeout(() => {
        setStage('achievements')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [stage, newAchievements.length])

  const getRarityStars = (rarity: number) => {
    return '⭐'.repeat(rarity)
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      {/* Scanning Stage */}
      {stage === 'scanning' && (
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <div className="text-6xl mb-4 animate-bounce">📡</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Scanne Fischart...
            </h2>
            <p className="text-ocean-light">
              Analysiere DNA-Muster
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-ocean-dark rounded-full h-4 overflow-hidden mb-4">
            <div
              className="bg-gradient-to-r from-ocean-light via-green-400 to-ocean h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-ocean-light text-sm">
            {progress}%
          </div>

          {/* Scan Lines Animation */}
          <div className="relative h-32 mt-8 overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-light/20 to-transparent animate-scan" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-400/20 to-transparent animate-scan-slow" />
          </div>
        </div>
      )}

      {/* Reveal Stage */}
      {stage === 'reveal' && (
        <div className="text-center max-w-md w-full animate-scale-in">
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              NEUE ENTDECKUNG!
            </h2>
            <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-full mb-4">
              <Star className="w-5 h-5" />
              <span className="font-bold">ERSTFANG!</span>
            </div>
          </div>

          {/* Species Card */}
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-ocean-dark mb-4">
              {species.image_url ? (
                <Image
                  src={species.image_url}
                  alt={species.name}
                  fill
                  className="object-contain animate-fade-in"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-9xl">🐟</span>
                </div>
              )}
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              {species.name}
            </h3>
            {species.scientific_name && (
              <p className="text-ocean-light text-sm italic mb-3">
                {species.scientific_name}
              </p>
            )}
            
            <div className="flex items-center justify-center gap-2">
              <span className="text-ocean-light text-sm">Seltenheit:</span>
              <span className="text-yellow-400">{getRarityStars(species.rarity)}</span>
            </div>
          </div>

          {/* Rewards */}
          <div className="bg-ocean-dark/50 rounded-lg p-4 mb-6">
            <div className="text-green-400 font-bold mb-2">+100 XP</div>
            <div className="text-ocean-light text-sm">
              +1 zur FishDex ({species.region})
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href={`/fishdex/${species.id}`}
              className="flex-1 bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Zur FishDex
              <ArrowRight className="w-4 h-4" />
            </Link>
            {newAchievements.length === 0 && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-ocean-dark hover:bg-ocean text-white rounded-lg transition-colors"
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Achievements Stage */}
      {stage === 'achievements' && newAchievements.length > 0 && (
        <div className="text-center max-w-md w-full animate-scale-in">
          <div className="mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white mb-2">
              ERFOLG FREIGESCHALTET!
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            {newAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border-2 border-yellow-400/50"
              >
                <div className="text-4xl mb-3">{achievement.icon || '🏆'}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {achievement.name}
                </h3>
                <p className="text-ocean-light text-sm mb-3">
                  {achievement.description}
                </p>
                <div className="inline-block bg-yellow-900/30 text-yellow-400 px-4 py-2 rounded-full text-sm font-bold">
                  +{achievement.xp_reward} XP
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              href="/fishdex/achievements"
              className="flex-1 bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Alle Erfolge
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-ocean-dark hover:bg-ocean text-white rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Skip Button (always available) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-ocean-light hover:text-white transition-colors z-10 text-2xl font-bold w-10 h-10 flex items-center justify-center"
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes scan-slow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .animate-scan-slow {
          animation: scan-slow 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}