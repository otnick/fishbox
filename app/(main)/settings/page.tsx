'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCatchStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { User, Package, FileSpreadsheet, Settings } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { 
  notificationService, 
  getNotificationPreference, 
  setNotificationPreference 
} from '@/lib/utils/notifications'

interface Profile {
  username: string
  bio?: string
  pinned_catch_ids?: string[]
}

export default function ProfilePage() {
  const { user, catches, signOut } = useCatchStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  useEffect(() => {
    setNotificationsEnabled(getNotificationPreference())
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfile = async () => {
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setProfileForm({
        username: data.username || '',
        bio: data.bio || '',
      })
    }
  }

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profileForm.username,
          bio: profileForm.bio,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      await fetchProfile()
      setEditingProfile(false)
      toast('Profil gespeichert!', 'success')
    } catch (error: any) {
      toast('Fehler: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await notificationService.requestPermission()
      if (granted) {
        setNotificationPreference(true)
        setNotificationsEnabled(true)
        await notificationService.send({
          title: 'Benachrichtigungen aktiviert!',
          body: 'Du erhältst jetzt Updates zu Likes, Kommentaren und mehr.',
        })
      }
    } else {
      setNotificationPreference(false)
      setNotificationsEnabled(false)
    }
  }

  const handleExportJSON = () => {
    const data = JSON.stringify(catches, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fishbox-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const headers = ['Datum', 'Art', 'Länge (cm)', 'Gewicht (g)', 'Ort', 'Köder', 'Notizen']
    const rows = catches.map(c => [
      format(new Date(c.date), 'dd.MM.yyyy'),
      c.species,
      c.length,
      c.weight || '',
      c.location || '',
      c.bait || '',
      c.notes || '',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fishbox-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-ocean-light" />
          Einstellungen
        </h1>
        <p className="text-ocean-light mt-1">Verwalte dein Konto und deine Daten</p>
      </div>

      {/* User Info */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Profil</h2>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="text-ocean-light hover:text-white text-sm transition-colors"
          >
            {editingProfile ? 'Abbrechen' : 'Bearbeiten'}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-ocean-light text-sm mb-2">Username</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
                placeholder="dein_username"
              />
              <p className="text-xs text-ocean-light mt-1">Wird überall als @{profileForm.username} angezeigt</p>
            </div>

            <div>
              <label className="block text-ocean-light text-sm mb-2">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
                rows={3}
                placeholder="Erzähl etwas über dich..."
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-ocean hover:bg-ocean-light text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-ocean-light text-sm">E-Mail</div>
              <div className="text-white font-semibold">{user?.email}</div>
            </div>
            <div>
              <div className="text-ocean-light text-sm">Username</div>
              <div className="text-white font-semibold text-lg">@{profile?.username || 'Nicht gesetzt'}</div>
            </div>
            {profile?.bio && (
              <div>
                <div className="text-ocean-light text-sm">Bio</div>
                <div className="text-white">{profile.bio}</div>
              </div>
            )}
            <div>
              <div className="text-ocean-light text-sm">Mitglied seit</div>
              <div className="text-white font-semibold">
                {user?.created_at 
                  ? format(new Date(user.created_at), 'dd. MMMM yyyy', { locale: de })
                  : '-'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Public Profile Link */}
      {profile?.username && (
        <div className="bg-gradient-to-r from-ocean-light/20 to-ocean/20 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-ocean-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Dein öffentliches Profil
              </h2>
              <p className="text-ocean-light text-sm mb-3">
                Teile deinen FishDex und deine besten Fänge mit anderen Anglern
              </p>
              <div className="flex flex-wrap items-center gap-2 bg-ocean-dark/50 rounded-lg px-3 py-2 w-full sm:w-fit">
                <span className="text-ocean-light text-sm">fishbox.app/user/</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold break-all">{user?.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/user/${user?.id}`)
                      toast('Link kopiert!', 'success')
                    }}
                    className="text-ocean-light hover:text-white transition-colors"
                    title="Link kopieren"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <Link 
              href={`/user/${user?.id}`}
              className="w-full sm:w-auto bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-6 rounded-lg transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Profil ansehen
            </Link>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Daten exportieren</h2>
        <p className="text-ocean-light text-sm mb-4">
          Exportiere deine Fänge als Backup oder zur Weiterverarbeitung
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExportJSON}
            className="flex-1 bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Als JSON exportieren
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Als CSV exportieren
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Einstellungen</h2>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 border-b border-ocean-light/20">
            <div>
              <div className="text-white font-semibold">Benachrichtigungen</div>
              <div className="text-ocean-light text-sm">
                Erhalte Updates zu Likes, Kommentaren und Freunden
              </div>
            </div>
            <label className="self-start inline-flex cursor-pointer items-center gap-3">
              <span className="sr-only">Benachrichtigungen umschalten</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={notificationsEnabled}
                onChange={toggleNotifications}
              />
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors shadow-inner ${
                  notificationsEnabled
                    ? 'bg-green-500/90 border-green-400/60'
                    : 'bg-gray-700 border-gray-500/60'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 border-b border-ocean-light/20">
            <div>
              <div className="text-white font-semibold">Dark Mode</div>
              <div className="text-ocean-light text-sm">Immer aktiv</div>
            </div>
            <div className="self-start sm:self-auto text-white">?</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-4">Account löschen</h2>
        <p className="text-red-300 text-sm mb-4">
          Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden permanent gelöscht.
        </p>
        <button
          onClick={() => toast('Account-Löschung: Bitte kontaktiere den Support', 'info')}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Account löschen
        </button>
      </div>

      {/* Logout */}
      <div className="text-center">
        <button
          onClick={signOut}
          className="bg-ocean-dark hover:bg-ocean text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}


