'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Fish, 
} from 'lucide-react'

interface AuthProps {
  onSuccess: () => void
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage({ type: 'success', text: 'Erfolgreich angemeldet!' })
          onSuccess()
        }
      } else {
        // Register
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage({
            type: 'success',
            text: 'Account erstellt! Bitte bestätige deine E-Mail-Adresse.',
          })
          setEmail('')
          setPassword('')
        }
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Bitte E-Mail-Adresse eingeben' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Magic Link wurde an deine E-Mail gesendet!',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Fehler beim Senden des Magic Links',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-deeper to-ocean-dark flex items-center justify-center p-4">
      <div className="bg-ocean/30 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Logo/Header */}
        <div className="text-center mb-8">
            <Fish className="w-12 h-12 mx-auto mb-2 text-ocean-light" />
          <h2 className="text-3xl font-bold text-white mb-2">FishBox</h2>
          <p className="text-ocean-light">
            {isLogin ? 'Willkommen zurück!' : 'Erstelle deinen Account'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'error'
                ? 'bg-red-500/20 border border-red-500 text-red-200'
                : 'bg-green-500/20 border border-green-500 text-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-ocean-light mb-2">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              className="w-full px-4 py-3 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-ocean-light mb-2">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            />
            {!isLogin && (
              <p className="text-sm text-ocean-light mt-1">
                Mindestens 6 Zeichen
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ocean hover:bg-ocean-light text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Laden...' : isLogin ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        {/* Magic Link */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full border border-ocean-light/30 text-ocean-light hover:bg-ocean-light/10 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            🪄 Magic Link senden
          </button>
          <p className="text-xs text-ocean-light text-center mt-2">
            Login ohne Passwort per E-Mail
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage(null)
            }}
            className="text-ocean-light hover:text-white transition-colors"
          >
            {isLogin ? (
              <>
                Noch kein Account?{' '}
                <span className="font-semibold">Jetzt registrieren</span>
              </>
            ) : (
              <>
                Schon einen Account?{' '}
                <span className="font-semibold">Anmelden</span>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-sm text-ocean-light">
          <p>Deine Daten werden sicher in der Cloud gespeichert</p>
        </div>
      </div>
    </div>
  )
}
