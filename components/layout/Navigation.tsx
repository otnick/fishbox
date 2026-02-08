'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useCatchStore } from '@/lib/store'
import { 
  Home, 
  Fish, 
  Map, 
  BarChart3, 
  Users, 
  Trophy, 
  UserCircle,
  UserPlus,
  X,
  Image as ImageIcon,
  BookOpen,
  Plus
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Fänge', href: '/catches', icon: Fish },
  { name: 'FishDex', href: '/fishdex', icon: BookOpen },
  { name: 'Galerie', href: '/gallery', icon: ImageIcon },
  { name: 'Karte', href: '/map', icon: Map },
  { name: 'Statistiken', href: '/stats', icon: BarChart3 },
  { name: 'Social', href: '/social', icon: Users },
  { name: 'Bestenliste', href: '/leaderboard', icon: Trophy },
  { name: 'Freunde', href: '/friends', icon: UserPlus },
  { name: 'Profil', href: '/profile', icon: UserCircle },
]

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isCatchModalOpen = useCatchStore((state) => state.isCatchModalOpen)
  const toggleCatchModal = useCatchStore((state) => state.toggleCatchModal)

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-ocean-deeper/95 backdrop-blur-xl border-r border-ocean-light/10">
        <div className="flex-1 flex flex-col min-h-0 pt-8 pb-4">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-light to-ocean flex items-center justify-center shadow-lg">
                <Fish className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">FishBox</span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex-1 flex flex-col overflow-y-auto px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-ocean-light/20 to-ocean/20 text-white shadow-lg ring-1 ring-ocean-light/20'
                      : 'text-ocean-light hover:text-white hover:bg-ocean/30'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-ocean-light' : ''}`} />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-ocean-light animate-pulse" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-ocean-deeper/95 backdrop-blur-xl border-t border-ocean-light/10 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="relative grid grid-cols-5 items-center h-20 px-2">
          {[
            { name: 'Dashboard', href: '/dashboard', icon: Home, colClass: 'col-start-1' },
            { name: 'Fänge', href: '/catches', icon: Fish, colClass: 'col-start-2' },
            { name: 'FishDex', href: '/fishdex', icon: BookOpen, colClass: 'col-start-4' },
            { name: 'Galerie', href: '/gallery', icon: ImageIcon, colClass: 'col-start-5' },
          ].map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  ${item.colClass}
                  flex flex-col items-center justify-end gap-1 px-3 py-2 pb-2 rounded-xl transition-all
                  ${isActive
                    ? 'text-white'
                    : 'text-ocean-light'
                  }
                `}
              >
                <Icon className={`w-6 h-6 -translate-y-0.5 ${isActive ? 'text-ocean-light' : ''}`} />
                <span className="text-xs font-medium leading-none">{item.name}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={toggleCatchModal}
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-14 h-14 rounded-full bg-gradient-to-br from-ocean-light to-ocean text-white shadow-2xl flex items-center justify-center border-4 border-ocean-deeper transition-transform duration-200"
            aria-label="Neuer Fang"
          >
            <Plus className={`w-7 h-7 transition-transform duration-200 ${isCatchModalOpen ? 'rotate-45' : ''}`} />
          </button>
          <span
            className={`absolute left-1/2 -translate-x-1/2 text-xs font-medium leading-none ${isCatchModalOpen ? 'text-white' : 'text-ocean-light'}`}
            style={{ bottom: '1.2rem' }}
          >
            Fang
          </span>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-ocean-deeper rounded-t-3xl shadow-2xl p-6 space-y-2 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Navigation</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-ocean/30 text-ocean-light"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-ocean-light/20 to-ocean/20 text-white'
                      : 'text-ocean-light hover:bg-ocean/30'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-ocean-light' : ''}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
