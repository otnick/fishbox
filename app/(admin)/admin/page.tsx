'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Shield, Users, Trash2, Sliders, Fish, RefreshCw, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ConfirmDialogProvider'

type AdminSettings = {
  shiny_lucky_chance: number
  shiny_percentile: number
  shiny_min_history: number
}

type AdminUser = {
  id: string
  email: string | null
  created_at: string
}

type AdminCatch = {
  id: string
  species: string
  length: number
  date: string
  is_public: boolean
}

const DEFAULT_SETTINGS: AdminSettings = {
  shiny_lucky_chance: 0.02,
  shiny_percentile: 0.95,
  shiny_min_history: 8,
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [userCatches, setUserCatches] = useState<AdminCatch[]>([])
  const [catchesLoading, setCatchesLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/admin/users', {
        headers: await getAuthHeaders(),
      })
      if (!resp.ok) {
        throw new Error('Konnte User nicht laden')
      }
      const payload = await resp.json()
      setUsers(payload.users || [])
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      const adminFlag =
        session?.user?.app_metadata?.is_admin === true ||
        session?.user?.app_metadata?.is_admin === 'true' ||
        session?.user?.user_metadata?.is_admin === true ||
        session?.user?.user_metadata?.is_admin === 'true'

      setIsAdmin(!!adminFlag)

      if (!adminFlag) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('admin_settings')
        .select('shiny_lucky_chance, shiny_percentile, shiny_min_history')
        .eq('id', 1)
        .single()

      if (!error && data) {
        setSettings({
          shiny_lucky_chance: Number(data.shiny_lucky_chance) || DEFAULT_SETTINGS.shiny_lucky_chance,
          shiny_percentile: Number(data.shiny_percentile) || DEFAULT_SETTINGS.shiny_percentile,
          shiny_min_history: Number(data.shiny_min_history) || DEFAULT_SETTINGS.shiny_min_history,
        })
      }

      await loadUsers()
      setLoading(false)
    }

    init()
  }, [loadUsers])

  const loadCatchesForUser = async (userId: string) => {
    setCatchesLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/admin/catches?user_id=${encodeURIComponent(userId)}`, {
        headers: await getAuthHeaders(),
      })
      if (!resp.ok) {
        throw new Error('Konnte Fänge nicht laden')
      }
      const payload = await resp.json()
      setUserCatches(payload.catches || [])
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler')
    } finally {
      setCatchesLoading(false)
    }
  }

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user)
    await loadCatchesForUser(user.id)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          shiny_lucky_chance: settings.shiny_lucky_chance,
          shiny_percentile: settings.shiny_percentile,
          shiny_min_history: settings.shiny_min_history,
        })
        .eq('id', 1)
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Konnte Einstellungen nicht speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Nutzer löschen?',
      message: 'Diesen Nutzer wirklich löschen? Das entfernt alle Daten.',
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (!confirmed) return
    setError(null)
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      if (!resp.ok) throw new Error('Konnte Nutzer nicht löschen')
      await loadUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
        setUserCatches([])
      }
      toast('Nutzer gelöscht', 'success')
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen')
    }
  }

  const handleDeleteCatch = async (catchId: string) => {
    const confirmed = await confirm({
      title: 'Fang löschen?',
      message: 'Diesen Fang wirklich löschen?',
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (!confirmed) return
    setError(null)
    try {
      const resp = await fetch(`/api/admin/catches/${catchId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      if (!resp.ok) throw new Error('Konnte Fang nicht löschen')
      if (selectedUser) {
        await loadCatchesForUser(selectedUser.id)
      }
      toast('Fang gelöscht', 'success')
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen')
    }
  }

  const handleRecalculateTrophies = async () => {
    const confirmed = await confirm({
      title: 'Trophäen neu berechnen?',
      message: 'Das kann etwas dauern. Fortfahren?',
      confirmLabel: 'Starten',
      cancelLabel: 'Abbrechen',
    })
    if (!confirmed) return
    setRecalculating(true)
    setError(null)
    try {
      const resp = await fetch('/api/admin/recalculate-trophies', {
        method: 'POST',
        headers: await getAuthHeaders(),
      })
      if (!resp.ok) throw new Error('Neuberechnung fehlgeschlagen')
      const payload = await resp.json()
      toast(`Trophäen aktualisiert: ${payload.updated || 0}`, 'success')
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Neuberechnung')
    } finally {
      setRecalculating(false)
    }
  }

  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      totalCatches: userCatches.length,
    }
  }, [users.length, userCatches.length])

  if (loading) {
    return <div className="text-ocean-light">Laden...</div>
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="bg-ocean/30 rounded-xl p-6">
          <div className="flex items-center gap-3 text-white font-semibold">
            <Shield className="w-5 h-5 text-yellow-300" />
            Kein Zugriff
          </div>
          <p className="text-ocean-light text-sm mt-2">
            Diese Seite ist nur für Admins.
          </p>
          <Link href="/profile" className="inline-flex items-center gap-2 text-ocean-light mt-4">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-yellow-300" />
            Admin Panel
          </h1>
          <p className="text-ocean-light mt-1">Trophäen‑Einstellungen und Nutzerverwaltung</p>
        </div>
        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-2 text-ocean-light hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-ocean/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sliders className="w-5 h-5 text-ocean-light" />
            Trophäen‑Einstellungen
          </div>
          <div>
            <label className="text-ocean-light text-sm">Lucky‑Chance (0‑1)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={settings.shiny_lucky_chance}
              onChange={(e) => setSettings({ ...settings, shiny_lucky_chance: Number(e.target.value) })}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30"
            />
          </div>
          <div>
            <label className="text-ocean-light text-sm">Perzentil (0‑1)</label>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="0.99"
              value={settings.shiny_percentile}
              onChange={(e) => setSettings({ ...settings, shiny_percentile: Number(e.target.value) })}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30"
            />
          </div>
          <div>
            <label className="text-ocean-light text-sm">Min. Sample Size</label>
            <input
              type="number"
              min="1"
              value={settings.shiny_min_history}
              onChange={(e) => setSettings({ ...settings, shiny_min_history: Number(e.target.value) })}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-ocean hover:bg-ocean-light text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          <button
            onClick={handleRecalculateTrophies}
            disabled={recalculating}
            className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {recalculating ? 'Berechne...' : 'Trophäen neu berechnen'}
          </button>
        </div>

        <div className="bg-ocean/30 rounded-xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Users className="w-5 h-5 text-ocean-light" />
              Nutzerverwaltung
            </div>
            <div className="text-ocean-light text-xs">
              Nutzer: {stats.totalUsers} • Fänge: {stats.totalCatches}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              {usersLoading ? (
                <div className="text-ocean-light text-sm">Lade Nutzer...</div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition ${
                      selectedUser?.id === user.id
                        ? 'bg-ocean text-white'
                        : 'bg-ocean-dark/40 text-ocean-light hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-semibold break-all">{user.email || user.id}</div>
                    <div className="text-xs opacity-70">{new Date(user.created_at).toLocaleDateString()}</div>
                  </button>
                ))
              )}
            </div>

            <div className="bg-ocean-dark/40 rounded-lg p-3 min-h-[220px]">
              {!selectedUser ? (
                <div className="text-ocean-light text-sm">Wähle einen Nutzer aus</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm break-all">
                        {selectedUser.email || selectedUser.id}
                      </div>
                      <div className="text-ocean-light text-xs">
                        Erstellt: {new Date(selectedUser.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="text-red-300 hover:text-red-200"
                      title="Nutzer löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border-t border-ocean-light/20 pt-3">
                    <div className="text-ocean-light text-xs mb-2">Fänge</div>
                    {catchesLoading ? (
                      <div className="text-ocean-light text-sm">Lade Fänge...</div>
                    ) : userCatches.length === 0 ? (
                      <div className="text-ocean-light text-sm">Keine Fänge</div>
                    ) : (
                      <div className="space-y-2">
                        {userCatches.map((catchItem) => (
                          <div
                            key={catchItem.id}
                            className="flex items-center justify-between bg-ocean/30 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-white text-sm truncate">{catchItem.species}</div>
                              <div className="text-ocean-light text-xs">
                                {catchItem.length} cm • {new Date(catchItem.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Fish className="w-4 h-4 text-ocean-light" />
                              <button
                                onClick={() => handleDeleteCatch(catchItem.id)}
                                className="text-red-300 hover:text-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
