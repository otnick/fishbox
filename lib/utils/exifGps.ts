import type { Coordinates } from './geolocation'

export interface ImageExifMetadata {
  coordinates: Coordinates | null
  capturedAt: Date | null
}

interface ExifContext {
  view: DataView
  tiffStart: number
  littleEndian: boolean
}

function toDecimalDegrees(parts: number[]): number | null {
  if (parts.length < 3) return null
  const [deg, min, sec] = parts
  if (![deg, min, sec].every((n) => Number.isFinite(n))) return null
  return deg + min / 60 + sec / 3600
}

function getTypeSize(type: number): number {
  switch (type) {
    case 1: // BYTE
    case 2: // ASCII
    case 7: // UNDEFINED
      return 1
    case 3: // SHORT
      return 2
    case 4: // LONG
    case 9: // SLONG
      return 4
    case 5: // RATIONAL
    case 10: // SRATIONAL
      return 8
    default:
      return 0
  }
}

function getExifContext(buffer: ArrayBuffer): ExifContext | null {
  const view = new DataView(buffer)
  let exifStart = -1

  for (let i = 0; i < view.byteLength - 9; i++) {
    if (
      view.getUint8(i) === 0xff &&
      view.getUint8(i + 1) === 0xe1 &&
      view.getUint8(i + 4) === 0x45 &&
      view.getUint8(i + 5) === 0x78 &&
      view.getUint8(i + 6) === 0x69 &&
      view.getUint8(i + 7) === 0x66 &&
      view.getUint8(i + 8) === 0x00 &&
      view.getUint8(i + 9) === 0x00
    ) {
      exifStart = i + 4
      break
    }
  }

  if (exifStart < 0) return null

  const tiffStart = exifStart + 6
  const littleEndian =
    view.getUint8(tiffStart) === 0x49 && view.getUint8(tiffStart + 1) === 0x49
  const bigEndian =
    view.getUint8(tiffStart) === 0x4d && view.getUint8(tiffStart + 1) === 0x4d

  if (!littleEndian && !bigEndian) return null

  const marker = view.getUint16(tiffStart + 2, littleEndian)
  if (marker !== 0x002a) return null

  return { view, tiffStart, littleEndian }
}

function getIfdPointer(ctx: ExifContext, ifdOffset: number, tagToFind: number): number | null {
  const { view, littleEndian, tiffStart } = ctx
  if (ifdOffset <= 0 || ifdOffset >= view.byteLength - 2) return null

  const getUint16 = (offset: number) => view.getUint16(offset, littleEndian)
  const getUint32 = (offset: number) => view.getUint32(offset, littleEndian)

  const count = getUint16(ifdOffset)
  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12
    const tag = getUint16(entry)
    if (tag === tagToFind) {
      const ptr = getUint32(entry + 8)
      const absolute = tiffStart + ptr
      if (absolute > 0 && absolute < view.byteLength) return absolute
      return null
    }
  }

  return null
}

function readAsciiValue(ctx: ExifContext, entry: number, count: number): string | null {
  if (count <= 0) return null
  const { view, littleEndian, tiffStart } = ctx
  const byteLen = count * getTypeSize(2)
  let ptr = entry + 8
  if (byteLen > 4) {
    ptr = tiffStart + view.getUint32(entry + 8, littleEndian)
  }
  if (ptr < 0 || ptr + count > view.byteLength) return null

  let out = ''
  for (let j = 0; j < count; j++) {
    const ch = view.getUint8(ptr + j)
    if (ch === 0) break
    out += String.fromCharCode(ch)
  }

  return out || null
}

function readRationalArray(ctx: ExifContext, entry: number, count: number): number[] | null {
  if (count <= 0) return null
  const { view, littleEndian, tiffStart } = ctx
  const typeSize = getTypeSize(5)
  if (!typeSize) return null

  const ptr = tiffStart + view.getUint32(entry + 8, littleEndian)
  if (ptr < 0 || ptr + count * typeSize > view.byteLength) return null

  const values: number[] = []
  for (let j = 0; j < count; j++) {
    const numerator = view.getUint32(ptr + j * 8, littleEndian)
    const denominator = view.getUint32(ptr + j * 8 + 4, littleEndian)
    if (!denominator) return null
    values.push(numerator / denominator)
  }

  return values
}

function parseExifDateTime(value: string | null): Date | null {
  if (!value) return null
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, y, m, d, h, min, s] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  const hour = Number(h)
  const minute = Number(min)
  const second = Number(s)

  if ([year, month, day, hour, minute, second].some((n) => Number.isNaN(n))) return null

  // EXIF DateTime has no timezone. Treat as local device time.
  return new Date(year, month - 1, day, hour, minute, second)
}

function parseCoordinates(ctx: ExifContext, ifd0: number): Coordinates | null {
  const gpsIfd = getIfdPointer(ctx, ifd0, 0x8825)
  if (!gpsIfd) return null

  const { view, littleEndian } = ctx
  const count = view.getUint16(gpsIfd, littleEndian)

  let latRef: string | null = null
  let lngRef: string | null = null
  let latParts: number[] | null = null
  let lngParts: number[] | null = null

  for (let i = 0; i < count; i++) {
    const entry = gpsIfd + 2 + i * 12
    const tag = view.getUint16(entry, littleEndian)
    const type = view.getUint16(entry + 2, littleEndian)
    const valueCount = view.getUint32(entry + 4, littleEndian)

    if (tag === 0x0001 && type === 2) latRef = readAsciiValue(ctx, entry, valueCount)
    if (tag === 0x0002 && type === 5) latParts = readRationalArray(ctx, entry, valueCount)
    if (tag === 0x0003 && type === 2) lngRef = readAsciiValue(ctx, entry, valueCount)
    if (tag === 0x0004 && type === 5) lngParts = readRationalArray(ctx, entry, valueCount)
  }

  if (!latRef || !lngRef || !latParts || !lngParts) return null

  const lat = toDecimalDegrees(latParts)
  const lng = toDecimalDegrees(lngParts)
  if (lat == null || lng == null) return null

  const signedLat = latRef.toUpperCase() === 'S' ? -lat : lat
  const signedLng = lngRef.toUpperCase() === 'W' ? -lng : lng

  if (Math.abs(signedLat) > 90 || Math.abs(signedLng) > 180) return null

  return { lat: signedLat, lng: signedLng }
}

function parseCapturedAt(ctx: ExifContext, ifd0: number): Date | null {
  const exifIfd = getIfdPointer(ctx, ifd0, 0x8769)
  if (exifIfd) {
    const { view, littleEndian } = ctx
    const count = view.getUint16(exifIfd, littleEndian)
    for (let i = 0; i < count; i++) {
      const entry = exifIfd + 2 + i * 12
      const tag = view.getUint16(entry, littleEndian)
      const type = view.getUint16(entry + 2, littleEndian)
      const valueCount = view.getUint32(entry + 4, littleEndian)
      if (tag === 0x9003 && type === 2) {
        const text = readAsciiValue(ctx, entry, valueCount)
        const parsed = parseExifDateTime(text)
        if (parsed) return parsed
      }
    }
  }

  // Fallback to IFD0 DateTime tag.
  const { view, littleEndian } = ctx
  const count = view.getUint16(ifd0, littleEndian)
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12
    const tag = view.getUint16(entry, littleEndian)
    const type = view.getUint16(entry + 2, littleEndian)
    const valueCount = view.getUint32(entry + 4, littleEndian)
    if (tag === 0x0132 && type === 2) {
      const text = readAsciiValue(ctx, entry, valueCount)
      const parsed = parseExifDateTime(text)
      if (parsed) return parsed
    }
  }

  return null
}

export async function extractExifMetadataFromImage(file: File): Promise<ImageExifMetadata> {
  if (!file.type.toLowerCase().includes('jpeg') && !file.type.toLowerCase().includes('jpg')) {
    return { coordinates: null, capturedAt: null }
  }

  try {
    const buffer = await file.arrayBuffer()
    const ctx = getExifContext(buffer)
    if (!ctx) return { coordinates: null, capturedAt: null }

    const { view, littleEndian, tiffStart } = ctx
    const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian)
    const ifd0 = tiffStart + ifd0Offset
    if (ifd0 <= 0 || ifd0 >= view.byteLength - 2) {
      return { coordinates: null, capturedAt: null }
    }

    const coordinates = parseCoordinates(ctx, ifd0)
    const capturedAt = parseCapturedAt(ctx, ifd0)

    return { coordinates, capturedAt }
  } catch (error) {
    console.error('Error reading EXIF metadata:', error)
    return { coordinates: null, capturedAt: null }
  }
}

export async function extractCoordinatesFromImage(file: File): Promise<Coordinates | null> {
  const metadata = await extractExifMetadataFromImage(file)
  return metadata.coordinates
}
