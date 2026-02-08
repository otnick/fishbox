import type { Coordinates } from './geolocation'

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

function parseExifGps(buffer: ArrayBuffer): Coordinates | null {
  const view = new DataView(buffer)

  let exifStart = -1
  for (let i = 0; i < view.byteLength - 9; i++) {
    // APP1 marker 0xFFE1 and Exif header.
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

  const getUint16 = (offset: number) => view.getUint16(offset, littleEndian)
  const getUint32 = (offset: number) => view.getUint32(offset, littleEndian)

  if (getUint16(tiffStart + 2) !== 0x002a) return null

  const ifd0Offset = getUint32(tiffStart + 4)
  const ifd0 = tiffStart + ifd0Offset
  if (ifd0 <= 0 || ifd0 >= view.byteLength - 2) return null

  const ifd0Count = getUint16(ifd0)
  let gpsIfdPointer: number | null = null

  for (let i = 0; i < ifd0Count; i++) {
    const entry = ifd0 + 2 + i * 12
    const tag = getUint16(entry)
    if (tag !== 0x8825) continue
    gpsIfdPointer = getUint32(entry + 8)
    break
  }

  if (!gpsIfdPointer) return null

  const gpsIfd = tiffStart + gpsIfdPointer
  if (gpsIfd <= 0 || gpsIfd >= view.byteLength - 2) return null

  const gpsCount = getUint16(gpsIfd)
  let latRef: string | null = null
  let lngRef: string | null = null
  let latParts: number[] | null = null
  let lngParts: number[] | null = null

  const readAsciiValue = (entry: number, count: number): string | null => {
    if (count <= 0) return null
    const byteLen = count * getTypeSize(2)
    let ptr = entry + 8
    if (byteLen > 4) {
      ptr = tiffStart + getUint32(entry + 8)
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

  const readRationalArray = (entry: number, count: number): number[] | null => {
    if (count <= 0) return null
    const typeSize = getTypeSize(5)
    if (!typeSize) return null
    const ptr = tiffStart + getUint32(entry + 8)
    if (ptr < 0 || ptr + count * typeSize > view.byteLength) return null

    const values: number[] = []
    for (let j = 0; j < count; j++) {
      const numerator = getUint32(ptr + j * 8)
      const denominator = getUint32(ptr + j * 8 + 4)
      if (!denominator) return null
      values.push(numerator / denominator)
    }
    return values
  }

  for (let i = 0; i < gpsCount; i++) {
    const entry = gpsIfd + 2 + i * 12
    const tag = getUint16(entry)
    const type = getUint16(entry + 2)
    const count = getUint32(entry + 4)

    if (tag === 0x0001 && type === 2) {
      latRef = readAsciiValue(entry, count)
    }
    if (tag === 0x0002 && type === 5) {
      latParts = readRationalArray(entry, count)
    }
    if (tag === 0x0003 && type === 2) {
      lngRef = readAsciiValue(entry, count)
    }
    if (tag === 0x0004 && type === 5) {
      lngParts = readRationalArray(entry, count)
    }
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

export async function extractCoordinatesFromImage(file: File): Promise<Coordinates | null> {
  if (!file.type.toLowerCase().includes('jpeg') && !file.type.toLowerCase().includes('jpg')) {
    return null
  }
  try {
    const buffer = await file.arrayBuffer()
    return parseExifGps(buffer)
  } catch (error) {
    console.error('Error reading EXIF GPS:', error)
    return null
  }
}

