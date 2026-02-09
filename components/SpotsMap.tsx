'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import type { Catch } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface SpotsMapProps {
  catches: Catch[]
  selectedSpot?: { lat: number; lng: number } | null
  selectedZoom?: number
  showHeatmap?: boolean
  clustered?: boolean
}

function FitBounds({ catches, disabled }: { catches: Catch[]; disabled?: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!disabled && catches.length > 0) {
      const bounds = L.latLngBounds(
        catches
          .filter((c) => c.coordinates)
          .map((c) => [c.coordinates!.lat, c.coordinates!.lng] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [catches, map, disabled])

  return null
}

function ZoomToSpot({
  spot,
  zoom,
}: {
  spot?: { lat: number; lng: number } | null
  zoom?: number
}) {
  const map = useMap()

  useEffect(() => {
    if (!spot) return
    map.flyTo([spot.lat, spot.lng], zoom || 15, { duration: 0.6 })
  }, [map, spot, zoom])

  return null
}

function HeatmapLayer({
  catches,
  enabled,
}: {
  catches: Catch[]
  enabled?: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || catches.length === 0) return

    const points: Array<[number, number, number]> = catches
      .filter((c) => c.coordinates)
      .map((c) => {
        const weight = c.length ? Math.min(3, Math.max(1, c.length / 50)) : 1
        return [c.coordinates!.lat, c.coordinates!.lng, weight]
      })

    if (points.length === 0) return

    const layer = L.heatLayer(points, {
      radius: 25,
      blur: 18,
      maxZoom: 16,
      minOpacity: 0.4,
    })

    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [catches, enabled, map])

  return null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ClusteredMarkers({
  catches,
  enabled,
}: {
  catches: Catch[]
  enabled?: boolean
}) {
  const map = useMap()

  const groupedSpots = useMemo(() => {
    const spots = new Map<string, Catch[]>()

    catches.forEach((c) => {
      if (!c.coordinates) return
      const key = `${c.coordinates.lat.toFixed(5)},${c.coordinates.lng.toFixed(5)}`
      if (!spots.has(key)) spots.set(key, [])
      spots.get(key)!.push(c)
    })

    return Array.from(spots.values()).map((catchList) => ({
      coordinates: catchList[0].coordinates!,
      catches: catchList,
      location: catchList[0].location || 'Unbekannt',
    }))
  }, [catches])

  useEffect(() => {
    if (!enabled) return

    const clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 48,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        const level = count < 10 ? 'small' : count < 30 ? 'medium' : 'large'
        const size = count < 10 ? 42 : count < 30 ? 50 : 58
        return L.divIcon({
          html: `<div class="fishbox-cluster fishbox-cluster--${level}"><span>${count}</span></div>`,
          className: 'fishbox-cluster-wrap',
          iconSize: L.point(size, size),
        })
      },
    })

    groupedSpots.forEach((spot) => {
      const sortedByDate = [...spot.catches].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      const topSpecies = Array.from(new Set(sortedByDate.map((c) => c.species))).slice(0, 3)
      const latest = sortedByDate[0]
      const verifiedCount = spot.catches.filter((c) => c.ai_verified || c.verification_status === 'verified').length
      const daysSinceLast = latest ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24)) : 999
      const countScore = Math.min(35, spot.catches.length * 5)
      const speciesScore = Math.min(25, topSpecies.length * 8)
      const verifyScore = Math.round((verifiedCount / Math.max(1, spot.catches.length)) * 25)
      const recencyScore = daysSinceLast <= 7 ? 15 : daysSinceLast <= 30 ? 11 : daysSinceLast <= 90 ? 7 : 3
      const qualityScore = Math.min(100, countScore + speciesScore + verifyScore + recencyScore)
      const addCatchHref = `/catches?new=1&lat=${spot.coordinates.lat}&lng=${spot.coordinates.lng}&location=${encodeURIComponent(spot.location)}`
      const rows = sortedByDate
        .slice(0, 3)
        .map((c) => {
          const date = format(new Date(c.date), 'dd.MM.yyyy', { locale: de })
          return `<div style="padding:6px 0;border-top:1px solid #e5e7eb;">
            <div style="font-weight:600;">${escapeHtml(c.species)} • ${c.length} cm</div>
            <div style="font-size:12px;color:#4b5563;">${date}${c.bait ? ` • Köder: ${escapeHtml(c.bait)}` : ''}</div>
            <a href="/catch/${c.id}" style="font-size:12px;color:#1d4ed8;font-weight:600;">Details</a>
          </div>`
        })
        .join('')

      const popupHtml = `
        <div style="min-width:240px;max-width:280px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px;">${escapeHtml(spot.location)}</div>
          <div style="font-size:13px;color:#4b5563;margin-bottom:8px;">${spot.catches.length} Fänge hier</div>
          <div style="font-size:12px;margin-bottom:8px;">
            <strong>Qualität:</strong> ${qualityScore}/100<br/>
            <strong>Letzter Fang:</strong> ${latest ? `${escapeHtml(latest.species)} • ${format(new Date(latest.date), 'dd.MM.yyyy', { locale: de })}` : '-'}<br/>
            <strong>Top Arten:</strong> ${topSpecies.map((s) => escapeHtml(s)).join(', ') || '-'}
          </div>
          ${rows}
          ${spot.catches.length > 3 ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">...und ${spot.catches.length - 3} weitere</div>` : ''}
          <a href="${addCatchHref}" style="display:inline-block;margin-top:8px;font-size:12px;color:#1d4ed8;font-weight:700;">+ Fang hier eintragen</a>
        </div>
      `

      const marker = L.marker([spot.coordinates.lat, spot.coordinates.lng], { icon })
      marker.bindPopup(popupHtml)
      clusterLayer.addLayer(marker)
    })

    clusterLayer.addTo(map)
    return () => {
      map.removeLayer(clusterLayer)
    }
  }, [groupedSpots, enabled, map])

  return null
}

export default function SpotsMap({
  catches,
  selectedSpot,
  selectedZoom,
  showHeatmap,
  clustered = true,
}: SpotsMapProps) {
  const center = useMemo(() => {
    if (catches.length === 0) return [52.52, 13.405] as [number, number]
    const firstCatch = catches[0]
    return [firstCatch.coordinates!.lat, firstCatch.coordinates!.lng] as [number, number]
  }, [catches])

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusteredMarkers catches={catches} enabled={!showHeatmap && clustered} />

        <FitBounds catches={catches} disabled={!!selectedSpot} />
        <ZoomToSpot spot={selectedSpot} zoom={selectedZoom} />
        <HeatmapLayer catches={catches} enabled={showHeatmap} />
      </MapContainer>
    </div>
  )
}
