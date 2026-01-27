'use client'

import { useState } from 'react'
import { useCatchStore } from '@/lib/store'

interface CatchFormProps {
  onSuccess: () => void
}

const FISH_SPECIES = [
  'Hecht',
  'Zander',
  'Barsch',
  'Karpfen',
  'Forelle',
  'Aal',
  'Wels',
  'Döbel',
  'Rotauge',
  'Brassen',
  'Schleie',
  'Andere',
]

export default function CatchForm({ onSuccess }: CatchFormProps) {
  const addCatch = useCatchStore((state) => state.addCatch)
  
  const [formData, setFormData] = useState({
    species: '',
    length: '',
    weight: '',
    location: '',
    bait: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    addCatch({
      species: formData.species,
      length: Number(formData.length),
      weight: Number(formData.weight),
      location: formData.location,
      bait: formData.bait,
      notes: formData.notes,
      date: new Date(formData.date),
      photo: undefined, // TODO: Add photo upload
      coordinates: undefined, // TODO: Add GPS
    })

    // Reset form
    setFormData({
      species: '',
      length: '',
      weight: '',
      location: '',
      bait: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    })

    onSuccess()
  }

  return (
    <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Neuer Fang</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Species */}
          <div>
            <label className="block text-ocean-light mb-2">Fischart *</label>
            <select
              required
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="">Wähle eine Art</option>
              {FISH_SPECIES.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          {/* Length */}
          <div>
            <label className="block text-ocean-light mb-2">Länge (cm) *</label>
            <input
              type="number"
              required
              min="1"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. 45"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-ocean-light mb-2">Gewicht (g)</label>
            <input
              type="number"
              min="1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. 1200"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-ocean-light mb-2">Datum *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-ocean-light mb-2">Gewässer</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. Elbe bei Hamburg"
            />
          </div>

          {/* Bait */}
          <div>
            <label className="block text-ocean-light mb-2">Köder</label>
            <input
              type="text"
              value={formData.bait}
              onChange={(e) => setFormData({ ...formData, bait: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. Wobbler, Wurm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-ocean-light mb-2">Notizen</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none resize-none"
            placeholder="Zusätzliche Informationen..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-ocean hover:bg-ocean-light text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Fang speichern
          </button>
          <button
            type="button"
            onClick={onSuccess}
            className="px-6 py-3 rounded-lg border border-ocean-light/30 text-ocean-light hover:bg-ocean-light/10 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
