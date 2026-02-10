'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Fish,
  Home,
  Map,
  Menu,
  User,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Fange', href: '/catches', icon: Fish },
  { name: 'Karte', href: '/map', icon: Map },
  { name: 'Statistiken', href: '/stats', icon: BarChart3 },
  { name: 'Profil', href: '/profile', icon: User },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
]

interface NavigationProps {
  userEmail?: string
}

export default function Navigation({ userEmail }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-ocean-dark px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Fish className="w-8 h-8 text-ocean-light" />
              <span className="text-2xl font-bold text-white">FishBox</span>
            </Link>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors
                            ${
                              isActive
                                ? 'bg-ocean text-white'
                                : 'text-ocean-light hover:text-white hover:bg-ocean/50'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>

              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-ocean-light">
                  <User className="w-5 h-5" />
                  <span className="sr-only">Dein Profil</span>
                  <span className="truncate">{userEmail}</span>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-ocean-dark px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-ocean-light lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Menu offnen</span>
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-white">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Fish className="w-6 h-6" />
            FishBox
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-ocean-dark px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Fish className="w-7 h-7 text-ocean-light" />
                <span className="text-xl font-bold text-white">FishBox</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-ocean-light"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Schliessen</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-white/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          -mx-3 flex items-center gap-x-3 rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors
                          ${
                            isActive
                              ? 'bg-ocean text-white'
                              : 'text-ocean-light hover:bg-ocean/50 hover:text-white'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
                <div className="py-6">
                  <div className="text-sm text-ocean-light">
                    Angemeldet als
                    <div className="mt-1 font-semibold text-white truncate">{userEmail}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-ocean-dark border-t border-ocean-light/20 lg:hidden">
        <div className="flex justify-around">
          {navigation.slice(0, 4).map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center py-2 px-3 transition-colors flex-1
                  ${isActive ? 'text-white' : 'text-ocean-light'}
                `}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-3 text-ocean-light flex-1"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-xs">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  )
}
