'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCatchStore, type Catch } from '@/lib/store'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { format, getHours, startOfMonth, subDays } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  BarChart3,
  CloudSun,
  CalendarDays,
  Clock3,
  Crosshair,
  X,
  Thermometer,
  Wind,
  Gauge,
  Droplets,
  Filter,
  GitCompare,
  RotateCcw,
  FileImage,
  FileSpreadsheet,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import FilterBar from '@/components/FilterBar'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

const ACCENT = '#4a90e2'
const ACCENT_SOFT = 'rgba(74, 144, 226, 0.25)'
const GRID = 'rgba(74, 144, 226, 0.18)'
const TICK = '#9dc9eb'
const SURFACE = 'rgba(18, 53, 80, 0.55)'
const PIE_COLORS = ['#4a90e2', '#2c5f8d', '#4a7c59', '#d4af37', '#c41e3a', '#8b7355', '#6ea7d3', '#3d8b6d']
const COMPARE_COLOR = '#d4af37'

type RangeFilter = 'all' | '30d' | '90d' | '365d'
type VerificationFilter = 'all' | 'verified' | 'manual' | 'pending'
type WeatherFilter = 'all' | 'with' | 'without'
const DEFAULT_RANGE: RangeFilter = '365d'
const DEFAULT_VERIFICATION: VerificationFilter = 'all'
const DEFAULT_WEATHER: WeatherFilter = 'all'
const DEFAULT_BAIT = 'all'
const DEFAULT_WEATHER_DESC = 'all'

const basePlugins = {
  legend: {
    labels: { color: TICK },
  },
  tooltip: {
    backgroundColor: '#0f3047',
    borderColor: '#2c5f8d',
    borderWidth: 1,
    titleColor: '#ffffff',
    bodyColor: '#e6f4ff',
  },
}

const lineBaseOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
}

const barBaseOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
}

const doughnutBaseOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
}

function weatherSourceLabel(source?: string) {
  if (source === 'historical') return 'Archiv'
  if (source === 'current') return 'Aktuell'
  if (source === 'forecast') return 'Prognose'
  return 'Unbekannt'
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function isVerifiedCatch(c: Catch): boolean {
  return Boolean(c.ai_verified || c.verification_status === 'verified')
}

function buildSpeciesStats(species: string, source: Catch[]) {
  const list = source.filter((c) => c.species === species)
  if (!list.length) return null

  const monthMap = new Map<string, number>()
  const hourMap = new Map<number, number>()
  const weatherTypeMap = new Map<string, number>()
  const sourceMap = new Map<string, number>()
  const lengthBuckets = new Map<string, number>([
    ['<20cm', 0],
    ['20-39cm', 0],
    ['40-59cm', 0],
    ['60-79cm', 0],
    ['80cm+', 0],
  ])

  list.forEach((c) => {
    const d = new Date(c.date)
    const mKey = toMonthKey(startOfMonth(d))
    monthMap.set(mKey, (monthMap.get(mKey) || 0) + 1)
    hourMap.set(getHours(d), (hourMap.get(getHours(d)) || 0) + 1)

    if (c.length < 20) lengthBuckets.set('<20cm', (lengthBuckets.get('<20cm') || 0) + 1)
    else if (c.length < 40) lengthBuckets.set('20-39cm', (lengthBuckets.get('20-39cm') || 0) + 1)
    else if (c.length < 60) lengthBuckets.set('40-59cm', (lengthBuckets.get('40-59cm') || 0) + 1)
    else if (c.length < 80) lengthBuckets.set('60-79cm', (lengthBuckets.get('60-79cm') || 0) + 1)
    else lengthBuckets.set('80cm+', (lengthBuckets.get('80cm+') || 0) + 1)

    if (c.weather) {
      const wt = c.weather.description || 'Unbekannt'
      weatherTypeMap.set(wt, (weatherTypeMap.get(wt) || 0) + 1)
      const src = c.weather.source || 'unknown'
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1)
    }
  })

  const sortedMonths = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
  const weights = list.filter((c) => c.weight)

  return {
    species,
    total: list.length,
    avgLength: Math.round(list.reduce((sum, c) => sum + c.length, 0) / list.length),
    avgWeight:
      weights.length > 0
        ? Math.round((weights.reduce((sum, c) => sum + (c.weight || 0), 0) / weights.length) / 1000)
        : null,
    biggest: Math.max(...list.map((c) => c.length)),
    monthly: {
      labels: sortedMonths.map(([k]) => format(new Date(`${k}-01T00:00:00`), 'MMM yy', { locale: de })),
      values: sortedMonths.map(([, v]) => v),
    },
    hourly: Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, value: hourMap.get(h) || 0 })),
    lengthBuckets: Array.from(lengthBuckets.entries()).map(([label, value]) => ({ label, value })),
    weatherTypes: Array.from(weatherTypeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6),
    weatherSources: Array.from(sourceMap.entries()).map(([source, value]) => ({
      source,
      label: weatherSourceLabel(source),
      value,
    })),
  }
}

export default function StatsPage() {
  const catches = useCatchStore((state) => state.catches)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasInitializedFromQuery = useRef(false)

  const [tab, setTab] = useState<'overview' | 'species'>('overview')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>(DEFAULT_RANGE)
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>(DEFAULT_VERIFICATION)
  const [weatherFilter, setWeatherFilter] = useState<WeatherFilter>(DEFAULT_WEATHER)
  const [baitFilter, setBaitFilter] = useState<string>(DEFAULT_BAIT)
  const [weatherDescFilter, setWeatherDescFilter] = useState<string>(DEFAULT_WEATHER_DESC)

  const filteredCatches = useMemo(() => {
    let data = [...catches]

    if (rangeFilter !== 'all') {
      const days = rangeFilter === '30d' ? 30 : rangeFilter === '90d' ? 90 : 365
      const from = subDays(new Date(), days)
      data = data.filter((c) => new Date(c.date).getTime() >= from.getTime())
    }

    if (verificationFilter !== 'all') {
      data = data.filter((c) => {
        if (verificationFilter === 'verified') return isVerifiedCatch(c)
        if (verificationFilter === 'manual') return c.verification_status === 'manual'
        return c.verification_status === 'pending' && !c.ai_verified
      })
    }

    if (weatherFilter !== 'all') {
      data = data.filter((c) => (weatherFilter === 'with' ? Boolean(c.weather) : !c.weather))
    }

    if (baitFilter !== DEFAULT_BAIT) {
      data = data.filter((c) => (c.bait || '') === baitFilter)
    }

    if (weatherDescFilter !== DEFAULT_WEATHER_DESC) {
      data = data.filter((c) => (c.weather?.description || 'Unbekannt') === weatherDescFilter)
    }

    return data
  }, [catches, rangeFilter, verificationFilter, weatherFilter, baitFilter, weatherDescFilter])

  const baitOptions = useMemo(() => {
    return Array.from(new Set(catches.map((c) => c.bait).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'de'))
  }, [catches])

  const weatherDescOptions = useMemo(() => {
    return Array.from(new Set(catches.map((c) => c.weather?.description).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b, 'de')
    )
  }, [catches])

  const speciesOptions = useMemo(() => {
    return Array.from(new Set(filteredCatches.map((c) => c.species))).sort((a, b) => a.localeCompare(b, 'de'))
  }, [filteredCatches])

  const [selectedSpecies, setSelectedSpecies] = useState<string>('')
  const [compareSpecies, setCompareSpecies] = useState<string>('')
  const [showCompare, setShowCompare] = useState(false)
  const overviewTrendRef = useRef<any>(null)
  const speciesTrendRef = useRef<any>(null)

  useEffect(() => {
    if (!speciesOptions.length) {
      setSelectedSpecies('')
      if (!showCompare) setCompareSpecies('')
      return
    }

    if (!selectedSpecies || !speciesOptions.includes(selectedSpecies)) {
      setSelectedSpecies(speciesOptions[0])
    }

    if (showCompare) {
      if ((compareSpecies && !speciesOptions.includes(compareSpecies)) || compareSpecies === selectedSpecies) {
        setCompareSpecies('')
      }
    } else if (compareSpecies) {
      setCompareSpecies('')
    }
  }, [speciesOptions, selectedSpecies, compareSpecies, showCompare])

  useEffect(() => {
    if (hasInitializedFromQuery.current) return

    const qTab = searchParams.get('tab')
    const qRange = searchParams.get('range')
    const qVerify = searchParams.get('verify')
    const qWeather = searchParams.get('weather')
    const qBait = searchParams.get('bait')
    const qWeatherDesc = searchParams.get('weatherDesc')
    const qSpecies = searchParams.get('species')
    const qCompare = searchParams.get('compare')

    if (qTab === 'overview' || qTab === 'species') setTab(qTab)
    if (qRange === 'all' || qRange === '30d' || qRange === '90d' || qRange === '365d') setRangeFilter(qRange)
    if (qVerify === 'all' || qVerify === 'verified' || qVerify === 'manual' || qVerify === 'pending') {
      setVerificationFilter(qVerify)
    }
    if (qWeather === 'all' || qWeather === 'with' || qWeather === 'without') setWeatherFilter(qWeather)
    if (qBait) setBaitFilter(qBait)
    if (qWeatherDesc) setWeatherDescFilter(qWeatherDesc)
    if (qSpecies) setSelectedSpecies(qSpecies)
    if (qCompare) {
      setShowCompare(true)
      setCompareSpecies(qCompare)
    }

    hasInitializedFromQuery.current = true
  }, [searchParams])

  useEffect(() => {
    if (!hasInitializedFromQuery.current) return

    const params = new URLSearchParams()
    if (tab !== 'overview') params.set('tab', tab)
    if (rangeFilter !== DEFAULT_RANGE) params.set('range', rangeFilter)
    if (verificationFilter !== DEFAULT_VERIFICATION) params.set('verify', verificationFilter)
    if (weatherFilter !== DEFAULT_WEATHER) params.set('weather', weatherFilter)
    if (baitFilter !== DEFAULT_BAIT) params.set('bait', baitFilter)
    if (weatherDescFilter !== DEFAULT_WEATHER_DESC) params.set('weatherDesc', weatherDescFilter)
    if (tab === 'species' && selectedSpecies) params.set('species', selectedSpecies)
    if (tab === 'species' && showCompare && compareSpecies && compareSpecies !== selectedSpecies) {
      params.set('compare', compareSpecies)
    }

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [
    tab,
    rangeFilter,
    verificationFilter,
    weatherFilter,
    baitFilter,
    weatherDescFilter,
    selectedSpecies,
    compareSpecies,
    showCompare,
    pathname,
    router,
    searchParams,
  ])

  const overview = useMemo(() => {
    const monthMap = new Map<string, number>()
    const speciesMap = new Map<string, number>()
    const baitMap = new Map<string, number>()
    const hourMap = new Map<number, number>()

    filteredCatches.forEach((c) => {
      const d = new Date(c.date)
      const monthKey = toMonthKey(startOfMonth(d))
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
      speciesMap.set(c.species, (speciesMap.get(c.species) || 0) + 1)
      hourMap.set(getHours(d), (hourMap.get(getHours(d)) || 0) + 1)
      if (c.bait) baitMap.set(c.bait, (baitMap.get(c.bait) || 0) + 1)
    })

    const sortedMonths = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)

    const catchesPerMonth = {
      labels: sortedMonths.map(([k]) => format(new Date(`${k}-01T00:00:00`), 'MMM yy', { locale: de })),
      values: sortedMonths.map(([, v]) => v),
    }

    const speciesDist = Array.from(speciesMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const baitTop = Array.from(baitMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)

    const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, value: hourMap.get(h) || 0 }))

    const catchesWithWeather = filteredCatches.filter((c) => c.weather)
    const tempRanges = new Map<string, number>()
    const weatherTypes = new Map<string, number>()
    const sourceMap = new Map<string, number>()

    catchesWithWeather.forEach((c) => {
      const w = c.weather!
      const t = w.temperature
      const range = t < 10 ? '<10°C' : t < 15 ? '10-15°C' : t < 20 ? '15-20°C' : t < 25 ? '20-25°C' : '25°C+'
      tempRanges.set(range, (tempRanges.get(range) || 0) + 1)
      weatherTypes.set(w.description || 'Unbekannt', (weatherTypes.get(w.description || 'Unbekannt') || 0) + 1)
      sourceMap.set(w.source || 'unknown', (sourceMap.get(w.source || 'unknown') || 0) + 1)
    })

    const avgLength = filteredCatches.length
      ? Math.round(filteredCatches.reduce((sum, c) => sum + c.length, 0) / filteredCatches.length)
      : 0

    const catchesWithWeight = filteredCatches.filter((c) => c.weight)
    const avgWeightKg = catchesWithWeight.length
      ? Math.round((catchesWithWeight.reduce((sum, c) => sum + (c.weight || 0), 0) / catchesWithWeight.length) / 1000)
      : null

    const weatherAvg = catchesWithWeather.length
      ? {
          temp: Math.round(catchesWithWeather.reduce((sum, c) => sum + (c.weather?.temperature || 0), 0) / catchesWithWeather.length),
          wind: Math.round(catchesWithWeather.reduce((sum, c) => sum + (c.weather?.windSpeed || 0), 0) / catchesWithWeather.length),
          pressure: Math.round(catchesWithWeather.reduce((sum, c) => sum + (c.weather?.pressure || 0), 0) / catchesWithWeather.length),
          humidity: Math.round(catchesWithWeather.reduce((sum, c) => sum + (c.weather?.humidity || 0), 0) / catchesWithWeather.length),
        }
      : null

    return {
      catchesPerMonth,
      speciesDist,
      baitTop,
      hours,
      tempByRange: Array.from(tempRanges.entries()).map(([label, value]) => ({ label, value })),
      weatherTypes: Array.from(weatherTypes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      weatherSources: Array.from(sourceMap.entries()).map(([source, value]) => ({
        source,
        label: weatherSourceLabel(source),
        value,
        percent: catchesWithWeather.length ? Math.round((value / catchesWithWeather.length) * 100) : 0,
      })),
      avgLength,
      avgWeightKg,
      topSpecies: speciesDist[0] || null,
      topBait: baitTop[0] || null,
      weatherAvg,
      weatherCount: catchesWithWeather.length,
    }
  }, [filteredCatches])

  const primarySpeciesStats = useMemo(() => buildSpeciesStats(selectedSpecies, filteredCatches), [selectedSpecies, filteredCatches])
  const compareSpeciesStats = useMemo(
    () => (showCompare && compareSpecies ? buildSpeciesStats(compareSpecies, filteredCatches) : null),
    [showCompare, compareSpecies, filteredCatches]
  )
  const speciesDeepInsights = useMemo(() => {
    if (!selectedSpecies || !primarySpeciesStats) return null
    const list = filteredCatches
      .filter((c) => c.species === selectedSpecies)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (!list.length) return null

    const baitMap = new Map<string, number>()
    const weatherMap = new Map<string, number>()
    list.forEach((c) => {
      if (c.bait) baitMap.set(c.bait, (baitMap.get(c.bait) || 0) + 1)
      if (c.weather?.description) weatherMap.set(c.weather.description, (weatherMap.get(c.weather.description) || 0) + 1)
    })

    const topBait = Array.from(baitMap.entries()).sort((a, b) => b[1] - a[1])[0] || null
    const topWeather = Array.from(weatherMap.entries()).sort((a, b) => b[1] - a[1])[0] || null

    const pbSeries: Array<{ date: string; value: number }> = []
    let currentPb = -1
    list.forEach((c) => {
      if (c.length > currentPb) {
        currentPb = c.length
        pbSeries.push({ date: new Date(c.date).toISOString(), value: c.length })
      }
    })

    const bestHour = primarySpeciesStats.hourly.reduce((best, curr) => (curr.value > best.value ? curr : best), primarySpeciesStats.hourly[0])
    const bestMonthIdx = primarySpeciesStats.monthly.values.findIndex((v) => v === Math.max(...primarySpeciesStats.monthly.values))
    const bestMonth =
      bestMonthIdx !== undefined && bestMonthIdx >= 0
        ? { label: primarySpeciesStats.monthly.labels[bestMonthIdx] || '-', value: primarySpeciesStats.monthly.values[bestMonthIdx] || 0 }
        : null

    const lastPb = pbSeries[pbSeries.length - 1] || null

    return {
      topBait,
      topWeather,
      bestHour: bestHour || null,
      bestMonth,
      pbCount: pbSeries.length,
      lastPb,
    }
  }, [selectedSpecies, filteredCatches, primarySpeciesStats])

  const insights = useMemo(() => {
    if (!filteredCatches.length) return []

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const last30 = filteredCatches.filter((c) => now - new Date(c.date).getTime() <= 30 * dayMs).length
    const prev30 = filteredCatches.filter((c) => {
      const age = now - new Date(c.date).getTime()
      return age > 30 * dayMs && age <= 60 * dayMs
    }).length

    const bestHour = overview.hours.reduce((best, curr) => (curr.value > best.value ? curr : best), overview.hours[0])
    const verifiedRate = Math.round((filteredCatches.filter((c) => isVerifiedCatch(c)).length / filteredCatches.length) * 100)
    const strongestWeather = overview.weatherTypes[0]
    const trendDelta = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null

    const lines = [
      `Hauptzeitfenster: ${bestHour.label} mit ${bestHour.value} Fängen.`,
      `Verifizierungsquote: ${verifiedRate}% in den gefilterten Daten.`,
    ]

    if (trendDelta !== null) {
      lines.push(`Momentum: ${trendDelta >= 0 ? '+' : ''}${trendDelta}% vs. die 30 Tage davor.`)
    }

    if (strongestWeather) {
      lines.push(`Top Wetterlage: ${strongestWeather[0]} (${strongestWeather[1]} Fänge).`)
    }

    return lines
  }, [filteredCatches, overview.hours, overview.weatherTypes])

  const anomalies = useMemo(() => {
    if (filteredCatches.length < 8) return []

    const items: Array<{ title: string; detail: string }> = []
    const avgLength = overview.avgLength
    const veryLarge = filteredCatches.filter((c) => c.length >= avgLength + 25)
    if (veryLarge.length) {
      items.push({
        title: 'Auffällig große Fänge',
        detail: `${veryLarge.length} Fang/Fänge liegen mindestens 25 cm über deinem Mittelwert.`,
      })
    }

    const maxHour = overview.hours.reduce((best, curr) => (curr.value > best.value ? curr : best), overview.hours[0])
    const avgPerHour = filteredCatches.length / 24
    if (maxHour.value >= Math.max(3, Math.ceil(avgPerHour * 2.4))) {
      items.push({
        title: 'Zeitfenster-Spitze',
        detail: `${maxHour.label} ist deutlich überdurchschnittlich (${maxHour.value} Fänge).`,
      })
    }

    if (overview.topSpecies && overview.topSpecies[1] / filteredCatches.length >= 0.5) {
      items.push({
        title: 'Sehr starke Arten-Konzentration',
        detail: `${overview.topSpecies[0]} macht ${Math.round((overview.topSpecies[1] / filteredCatches.length) * 100)}% deiner Fänge aus.`,
      })
    }

    return items.slice(0, 3)
  }, [filteredCatches, overview.avgLength, overview.hours, overview.topSpecies])

  const exportChartAsPng = (chartRef: { current: any }, fileBase: string) => {
    const chart = chartRef.current
    if (!chart || typeof chart.toBase64Image !== 'function') return
    const a = document.createElement('a')
    a.href = chart.toBase64Image('image/png', 1)
    a.download = `${fileBase}.png`
    a.click()
  }

  const csvValue = (value: string | number | Date | null | undefined) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (text.includes(';') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const exportFilteredCsv = () => {
    if (!filteredCatches.length) return
    const headers = [
      'id',
      'datum',
      'art',
      'laenge_cm',
      'gewicht_g',
      'koeder',
      'ort',
      'verifizierung',
      'ai_verified',
      'temperatur_c',
      'wind_kmh',
      'luftdruck_hpa',
      'luftfeuchte_prozent',
      'wetterbeschreibung',
      'wettersource',
      'lat',
      'lng',
    ]
    const rows = filteredCatches.map((c) =>
      [
        c.id,
        c.date,
        c.species,
        c.length,
        c.weight ?? '',
        c.bait ?? '',
        c.location ?? '',
        c.verification_status ?? '',
        c.ai_verified ? 'true' : 'false',
        c.weather?.temperature ?? '',
        c.weather?.windSpeed ?? '',
        c.weather?.pressure ?? '',
        c.weather?.humidity ?? '',
        c.weather?.description ?? '',
        c.weather?.source ?? '',
        c.coordinates?.lat ?? '',
        c.coordinates?.lng ?? '',
      ]
        .map(csvValue)
        .join(';')
    )

    const csv = [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fishbox-stats-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setTab('overview')
    setRangeFilter(DEFAULT_RANGE)
    setVerificationFilter(DEFAULT_VERIFICATION)
    setWeatherFilter(DEFAULT_WEATHER)
    setBaitFilter(DEFAULT_BAIT)
    setWeatherDescFilter(DEFAULT_WEATHER_DESC)
    setShowCompare(false)
    setCompareSpecies('')
  }

  const clearDrilldown = () => {
    setBaitFilter(DEFAULT_BAIT)
    setWeatherDescFilter(DEFAULT_WEATHER_DESC)
  }

  if (!catches.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-ocean-light" />
          Statistiken
        </h1>
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="mb-4 flex justify-center"><BarChart3 className="w-14 h-14 text-ocean-light" /></div>
          <h3 className="text-2xl font-bold text-white mb-2">Noch keine Daten</h3>
          <p className="text-ocean-light">Füge Fänge hinzu, um deine Statistiken zu sehen.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-ocean-light" />
            Statistiken
          </h1>
          <p className="text-ocean-light mt-1">Analyse deiner Fänge ({filteredCatches.length} gefiltert)</p>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div className="inline-flex bg-ocean/30 border border-ocean-light/20 rounded-xl p-1">
            <button
              onClick={() => setTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'overview' ? 'bg-ocean text-white' : 'text-ocean-light hover:text-white'}`}
            >
              Übersicht
            </button>
            <button
              onClick={() => setTab('species')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'species' ? 'bg-ocean text-white' : 'text-ocean-light hover:text-white'}`}
            >
              Art-Detail
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportChartAsPng(tab === 'overview' ? overviewTrendRef : speciesTrendRef, `fishbox-chart-${tab}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean-dark text-ocean-light border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors text-sm"
            >
              <FileImage className="w-4 h-4" />
              PNG
            </button>
            <button
              type="button"
              onClick={exportFilteredCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean-dark text-ocean-light border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={clearDrilldown}
              disabled={baitFilter === DEFAULT_BAIT && weatherDescFilter === DEFAULT_WEATHER_DESC}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean-dark text-ocean-light border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Drilldown reset
            </button>
          </div>
        </div>
      </div>

      {(baitFilter !== DEFAULT_BAIT || weatherDescFilter !== DEFAULT_WEATHER_DESC) && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-3 border border-ocean-light/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ocean-light">Aktive Drilldowns:</span>
            {baitFilter !== DEFAULT_BAIT && (
              <button
                type="button"
                onClick={() => setBaitFilter(DEFAULT_BAIT)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-dark text-xs text-ocean-light border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors"
              >
                Köder: {baitFilter}
                <X className="w-3 h-3" />
              </button>
            )}
            {weatherDescFilter !== DEFAULT_WEATHER_DESC && (
              <button
                type="button"
                onClick={() => setWeatherDescFilter(DEFAULT_WEATHER_DESC)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ocean-dark text-xs text-ocean-light border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors"
              >
                Wettertyp: {weatherDescFilter}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <FilterBar
        title="Filter"
        icon={Filter}
        activeFilters={[
          ...(rangeFilter !== DEFAULT_RANGE
            ? [{
                id: 'range',
                label:
                  rangeFilter === '30d'
                    ? 'Zeitraum: 30 Tage'
                    : rangeFilter === '90d'
                      ? 'Zeitraum: 90 Tage'
                      : 'Zeitraum: 365 Tage',
                onClear: () => setRangeFilter(DEFAULT_RANGE),
              }]
            : []),
          ...(verificationFilter !== DEFAULT_VERIFICATION
            ? [{
                id: 'verify',
                label:
                  verificationFilter === 'verified'
                    ? 'Verifiziert'
                    : verificationFilter === 'manual'
                      ? 'Manuell'
                      : 'Ausstehend',
                onClear: () => setVerificationFilter(DEFAULT_VERIFICATION),
              }]
            : []),
          ...(weatherFilter !== DEFAULT_WEATHER
            ? [{
                id: 'weather',
                label: weatherFilter === 'with' ? 'Wetter: Mit Daten' : 'Wetter: Ohne Daten',
                onClear: () => setWeatherFilter(DEFAULT_WEATHER),
              }]
            : []),
          ...(baitFilter !== DEFAULT_BAIT
            ? [{ id: 'bait', label: `Köder: ${baitFilter}`, onClear: () => setBaitFilter(DEFAULT_BAIT) }]
            : []),
          ...(weatherDescFilter !== DEFAULT_WEATHER_DESC
            ? [{ id: 'weatherDesc', label: `Wettertyp: ${weatherDescFilter}`, onClear: () => setWeatherDescFilter(DEFAULT_WEATHER_DESC) }]
            : []),
        ]}
        onClearAll={resetFilters}
        clearAllLabel="Alles zurücksetzen"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            value={rangeFilter}
            onChange={(e) => setRangeFilter(e.target.value as RangeFilter)}
            className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
          >
            <option value="all">Zeitraum: Alle</option>
            <option value="30d">Zeitraum: Letzte 30 Tage</option>
            <option value="90d">Zeitraum: Letzte 90 Tage</option>
            <option value="365d">Zeitraum: Letztes Jahr</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as VerificationFilter)}
            className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
          >
            <option value="all">Verifizierung: Alle</option>
            <option value="verified">Verifizierung: Verifiziert</option>
            <option value="manual">Verifizierung: Manuell</option>
            <option value="pending">Verifizierung: Ausstehend</option>
          </select>

          <select
            value={weatherFilter}
            onChange={(e) => setWeatherFilter(e.target.value as WeatherFilter)}
            className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
          >
            <option value="all">Wetter: Alle</option>
            <option value="with">Wetter: Mit Wetterdaten</option>
            <option value="without">Wetter: Ohne Wetterdaten</option>
          </select>
          <select
            value={weatherDescFilter}
            onChange={(e) => setWeatherDescFilter(e.target.value)}
            className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
          >
            <option value={DEFAULT_WEATHER_DESC}>Wettertyp: Alle</option>
            {weatherDescOptions.map((label) => (
              <option key={label} value={label}>
                Wettertyp: {label}
              </option>
            ))}
          </select>
          <select
            value={baitFilter}
            onChange={(e) => setBaitFilter(e.target.value)}
            className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
          >
            <option value={DEFAULT_BAIT}>Köder: Alle</option>
            {baitOptions.map((bait) => (
              <option key={bait} value={bait}>
                Köder: {bait}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 bg-ocean-dark text-ocean-light border border-ocean-light/30 rounded-lg px-3 py-2 hover:text-white hover:border-ocean-light transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filter
          </button>
        </div>
      </FilterBar>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-5 border border-ocean-light/10">
            <div className="text-white font-semibold inline-flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-ocean-light" />
              Insights
            </div>
            <div className="space-y-2 text-sm text-ocean-light">
              {insights.map((line) => (
                <p key={line}>• {line}</p>
              ))}
            </div>
          </div>

          {anomalies.length > 0 && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-5 border border-amber-300/20">
              <div className="text-white font-semibold inline-flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                Auffälligkeiten
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {anomalies.map((item) => (
                  <div key={item.title} className="rounded-lg border border-amber-200/20 bg-amber-300/10 p-3">
                    <div className="text-amber-200 text-sm font-semibold">{item.title}</div>
                    <div className="text-ocean-light text-sm mt-1">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
              <div className="text-ocean-light text-sm">Ø Größe</div>
              <div className="text-3xl font-bold text-white mt-1">{overview.avgLength}</div>
              <div className="text-ocean-light text-xs mt-1">cm</div>
            </div>
            <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
              <div className="text-ocean-light text-sm">Ø Gewicht</div>
              <div className="text-3xl font-bold text-white mt-1">{overview.avgWeightKg ?? '-'}</div>
              <div className="text-ocean-light text-xs mt-1">kg</div>
            </div>
            <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
              <div className="text-ocean-light text-sm">Top Art</div>
              <div className="text-xl font-bold text-white mt-1 truncate">{overview.topSpecies?.[0] || '-'}</div>
              <div className="text-ocean-light text-xs mt-1">{overview.topSpecies?.[1] || 0}x</div>
            </div>
            <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
              <div className="text-ocean-light text-sm">Top Köder</div>
              <div className="text-xl font-bold text-white mt-1 truncate">{overview.topBait?.[0] || '-'}</div>
              <div className="text-ocean-light text-xs mt-1">{overview.topBait?.[1] || 0}x</div>
            </div>
          </div>

          {overview.weatherAvg && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
              <h2 className="text-lg font-bold text-white mb-4 inline-flex items-center gap-2"><CloudSun className="w-5 h-5 text-ocean-light" />Wetter-Einblicke</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-ocean-light text-sm inline-flex items-center gap-1"><Thermometer className="w-4 h-4" />Temperatur</div>
                  <div className="text-2xl font-bold text-white">{overview.weatherAvg.temp}°C</div>
                </div>
                <div>
                  <div className="text-ocean-light text-sm inline-flex items-center gap-1"><Wind className="w-4 h-4" />Wind</div>
                  <div className="text-2xl font-bold text-white">{overview.weatherAvg.wind} km/h</div>
                </div>
                <div>
                  <div className="text-ocean-light text-sm inline-flex items-center gap-1"><Gauge className="w-4 h-4" />Luftdruck</div>
                  <div className="text-2xl font-bold text-white">{overview.weatherAvg.pressure} hPa</div>
                </div>
                <div>
                  <div className="text-ocean-light text-sm inline-flex items-center gap-1"><Droplets className="w-4 h-4" />Luftfeuchte</div>
                  <div className="text-2xl font-bold text-white">{overview.weatherAvg.humidity}%</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {overview.weatherSources.map((entry) => (
                  <div key={entry.source} className="px-3 py-1.5 rounded-full bg-ocean-dark/60 text-xs text-ocean-light border border-ocean-light/20">
                    {entry.label}: <span className="text-white">{entry.value}</span> ({entry.percent}%)
                  </div>
                ))}
              </div>
              {overview.weatherTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.weatherTypes.slice(0, 6).map(([label, count]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setWeatherFilter('with')
                        setWeatherDescFilter(label)
                      }}
                      className="px-3 py-1.5 rounded-full bg-ocean-dark text-ocean-light text-xs border border-ocean-light/30 hover:text-white hover:border-ocean-light transition-colors"
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
              <h2 className="text-lg font-bold text-white mb-4">Fänge pro Monat</h2>
              <div className="h-72">
                <Line
                  ref={overviewTrendRef}
                  options={{
                    ...lineBaseOptions,
                    scales: {
                      x: { ticks: { color: TICK }, grid: { color: GRID } },
                      y: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                    },
                  }}
                  data={{
                    labels: overview.catchesPerMonth.labels,
                    datasets: [
                      {
                        label: 'Fänge',
                        data: overview.catchesPerMonth.values,
                        borderColor: ACCENT,
                        backgroundColor: ACCENT_SOFT,
                        tension: 0.35,
                        fill: true,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
              <h2 className="text-lg font-bold text-white mb-4">Arten-Verteilung (Top 10)</h2>
              <div className="h-72">
                <Doughnut
                  options={{
                    ...doughnutBaseOptions,
                    cutout: '58%',
                    onClick: (_, elements) => {
                      const el = elements?.[0]
                      if (!el) return
                      const idx = el.index
                      const species = overview.speciesDist[idx]?.[0]
                      if (!species) return
                      setSelectedSpecies(species)
                      setTab('species')
                    },
                  }}
                  data={{
                    labels: overview.speciesDist.map((s) => s[0]),
                    datasets: [
                      {
                        label: 'Fänge',
                        data: overview.speciesDist.map((s) => s[1]),
                        backgroundColor: overview.speciesDist.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
                        borderColor: SURFACE,
                        borderWidth: 1,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
              <h2 className="text-lg font-bold text-white mb-4">Beste Fangzeiten</h2>
              <div className="h-72">
                <Bar
                  options={{
                    ...barBaseOptions,
                    scales: {
                      x: { ticks: { color: TICK, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
                      y: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                    },
                  }}
                  data={{
                    labels: overview.hours.map((h) => h.label),
                    datasets: [
                      {
                        label: 'Fänge',
                        data: overview.hours.map((h) => h.value),
                        backgroundColor: 'rgba(74, 124, 89, 0.8)',
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
              <h2 className="text-lg font-bold text-white mb-4">Erfolgreichste Köder</h2>
              <div className="h-72">
                <Bar
                  options={{
                    ...barBaseOptions,
                    indexAxis: 'y',
                    onClick: (_, elements) => {
                      const el = elements?.[0]
                      if (!el) return
                      const idx = el.index
                      const bait = overview.baitTop[idx]?.[0]
                      if (!bait) return
                      setBaitFilter(bait)
                    },
                    scales: {
                      x: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                      y: { ticks: { color: TICK }, grid: { display: false } },
                    },
                  }}
                  data={{
                    labels: overview.baitTop.map((b) => b[0]),
                    datasets: [
                      {
                        label: 'Fänge',
                        data: overview.baitTop.map((b) => b[1]),
                        backgroundColor: 'rgba(212, 175, 55, 0.8)',
                        borderRadius: 6,
                      },
                    ],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'species' && (
        <div className="space-y-6">
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4 border border-ocean-light/10 flex flex-col gap-3">
            <div className="text-white font-semibold inline-flex items-center gap-2"><GitCompare className="w-4 h-4 text-ocean-light" />Art-Vergleich</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
              >
                {speciesOptions.map((species) => (
                  <option key={species} value={species}>{species}</option>
                ))}
              </select>

              {showCompare ? (
                <select
                  value={compareSpecies}
                  onChange={(e) => setCompareSpecies(e.target.value)}
                  className="bg-ocean-dark text-white border border-ocean-light/30 rounded-lg px-3 py-2 focus:outline-none focus:border-ocean-light"
                >
                  <option value="">Vergleichsart wählen</option>
                  {speciesOptions
                    .filter((s) => s !== selectedSpecies)
                    .map((species) => (
                      <option key={species} value={species}>{species}</option>
                    ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCompare(true)}
                  className="bg-ocean-dark text-ocean-light border border-ocean-light/30 rounded-lg px-3 py-2 hover:text-white hover:border-ocean-light transition-colors"
                >
                  + Vergleich hinzufügen
                </button>
              )}
            </div>
            {showCompare && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompare(false)
                    setCompareSpecies('')
                  }}
                  className="text-xs text-ocean-light hover:text-white transition-colors"
                >
                  Vergleich entfernen
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
                <div className="text-ocean-light text-sm">Fänge ({primarySpeciesStats?.species || '-'})</div>
                <div className="text-3xl font-bold text-white">{primarySpeciesStats?.total || 0}</div>
              </div>
              <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
                <div className="text-ocean-light text-sm">Ø Länge</div>
                <div className="text-3xl font-bold text-white">{primarySpeciesStats?.avgLength || 0}</div>
                <div className="text-ocean-light text-xs">cm</div>
              </div>
              <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
                <div className="text-ocean-light text-sm">Ø Gewicht</div>
                <div className="text-3xl font-bold text-white">{primarySpeciesStats?.avgWeight ?? '-'}</div>
                <div className="text-ocean-light text-xs">kg</div>
              </div>
              <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-5 border border-ocean-light/10">
                <div className="text-ocean-light text-sm">Größter Fang</div>
                <div className="text-3xl font-bold text-white">{primarySpeciesStats?.biggest || 0}</div>
                <div className="text-ocean-light text-xs">cm</div>
              </div>
            </div>
            {speciesDeepInsights && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4 border border-ocean-light/10">
                  <div className="text-ocean-light text-xs inline-flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    Beste Uhrzeit
                  </div>
                  <div className="text-white font-bold mt-1">{speciesDeepInsights.bestHour?.label || '-'}</div>
                  <div className="text-ocean-light text-xs">{speciesDeepInsights.bestHour?.value || 0} Fänge</div>
                </div>
                <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4 border border-ocean-light/10">
                  <div className="text-ocean-light text-xs inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Stärkster Monat
                  </div>
                  <div className="text-white font-bold mt-1">{speciesDeepInsights.bestMonth?.label || '-'}</div>
                  <div className="text-ocean-light text-xs">{speciesDeepInsights.bestMonth?.value || 0} Fänge</div>
                </div>
                <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4 border border-ocean-light/10">
                  <div className="text-ocean-light text-xs inline-flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" />
                    Top Köder
                  </div>
                  <div className="text-white font-bold mt-1 truncate">{speciesDeepInsights.topBait?.[0] || '-'}</div>
                  <div className="text-ocean-light text-xs">{speciesDeepInsights.topBait?.[1] || 0} Fänge</div>
                </div>
                <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4 border border-ocean-light/10">
                  <div className="text-ocean-light text-xs inline-flex items-center gap-1">
                    <CloudSun className="w-3.5 h-3.5" />
                    PB-Progress
                  </div>
                  <div className="text-white font-bold mt-1">{speciesDeepInsights.lastPb?.value || '-'}{speciesDeepInsights.lastPb ? ' cm' : ''}</div>
                  <div className="text-ocean-light text-xs">{speciesDeepInsights.pbCount} neue Rekordstufen</div>
                  <div className="text-ocean-light/80 text-xs truncate mt-0.5">
                    Top Wetter: {speciesDeepInsights.topWeather?.[0] || '-'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {primarySpeciesStats && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
                  <h2 className="text-lg font-bold text-white mb-4">Monatlicher Trend</h2>
                  <div className="h-72">
                    <Line
                      ref={speciesTrendRef}
                      options={{
                        ...lineBaseOptions,
                        scales: {
                          x: { ticks: { color: TICK }, grid: { color: GRID } },
                          y: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                        },
                      }}
                      data={{
                        labels: primarySpeciesStats.monthly.labels,
                        datasets: [
                          {
                            label: primarySpeciesStats.species,
                            data: primarySpeciesStats.monthly.values,
                            borderColor: ACCENT,
                            backgroundColor: ACCENT_SOFT,
                            fill: true,
                            tension: 0.35,
                          },
                          ...(compareSpeciesStats
                            ? [
                                {
                                  label: compareSpeciesStats.species,
                                  data: compareSpeciesStats.monthly.values,
                                  borderColor: COMPARE_COLOR,
                                  backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                  fill: true,
                                  tension: 0.35,
                                },
                              ]
                            : []),
                        ],
                      }}
                    />
                  </div>
                </div>

                <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
                  <h2 className="text-lg font-bold text-white mb-4">Fangzeiten Vergleich</h2>
                  <div className="h-72">
                    <Bar
                      options={{
                        ...barBaseOptions,
                        scales: {
                          x: { ticks: { color: TICK, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
                          y: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                        },
                      }}
                      data={{
                        labels: primarySpeciesStats.hourly.map((h) => h.label),
                        datasets: [
                          {
                            label: primarySpeciesStats.species,
                            data: primarySpeciesStats.hourly.map((h) => h.value),
                            backgroundColor: 'rgba(74, 144, 226, 0.8)',
                            borderRadius: 5,
                          },
                          ...(compareSpeciesStats
                            ? [
                                {
                                  label: compareSpeciesStats.species,
                                  data: compareSpeciesStats.hourly.map((h) => h.value),
                                  backgroundColor: 'rgba(212, 175, 55, 0.8)',
                                  borderRadius: 5,
                                },
                              ]
                            : []),
                        ],
                      }}
                    />
                  </div>
                </div>

                <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
                  <h2 className="text-lg font-bold text-white mb-4">Längenverteilung ({primarySpeciesStats.species})</h2>
                  <div className="h-72">
                    <Bar
                      options={{
                        ...barBaseOptions,
                        scales: {
                          x: { ticks: { color: TICK }, grid: { display: false } },
                          y: { ticks: { color: TICK }, grid: { color: GRID }, beginAtZero: true },
                        },
                      }}
                      data={{
                        labels: primarySpeciesStats.lengthBuckets.map((b) => b.label),
                        datasets: [
                          {
                            label: 'Fänge',
                            data: primarySpeciesStats.lengthBuckets.map((b) => b.value),
                            backgroundColor: 'rgba(74, 124, 89, 0.82)',
                            borderRadius: 6,
                          },
                        ],
                      }}
                    />
                  </div>
                </div>

                <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6 border border-ocean-light/10">
                  <h2 className="text-lg font-bold text-white mb-4">Wetter ({primarySpeciesStats.species})</h2>
                  <div className="h-72 mb-4">
                    <Doughnut
                      options={{
                        ...doughnutBaseOptions,
                        cutout: '62%',
                        onClick: (_, elements) => {
                          const el = elements?.[0]
                          if (!el) return
                          const idx = el.index
                          const weatherLabel = primarySpeciesStats.weatherTypes[idx]?.[0]
                          if (!weatherLabel) return
                          setWeatherFilter('with')
                          setWeatherDescFilter(weatherLabel)
                        },
                      }}
                      data={{
                        labels: primarySpeciesStats.weatherTypes.map((w) => w[0]),
                        datasets: [
                          {
                            label: 'Fänge',
                            data: primarySpeciesStats.weatherTypes.map((w) => w[1]),
                            backgroundColor: primarySpeciesStats.weatherTypes.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
                            borderColor: SURFACE,
                            borderWidth: 1,
                          },
                        ],
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {primarySpeciesStats.weatherSources.map((s) => (
                      <div key={s.source} className="px-3 py-1.5 rounded-full bg-ocean-dark/60 text-xs text-ocean-light border border-ocean-light/20">
                        {s.label}: <span className="text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
