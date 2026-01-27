# 🚀 Setup-Anleitung - Schnellstart

## Schritt-für-Schritt

### 1. Abhängigkeiten installieren

```bash
npm install
```

**Problem mit npm?** Versuche:
```bash
npm install --legacy-peer-deps
```

### 2. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft jetzt auf [http://localhost:3000](http://localhost:3000)

### 3. Erste Schritte

✅ Du siehst jetzt:
- Ein 3D-Aquarium (noch leer)
- "Neuer Fang" Button
- Statistiken (alle bei 0)

✅ Füge einen Test-Fang hinzu:
1. Klick auf "+ Neuer Fang"
2. Wähle z.B. "Hecht"
3. Gib 55 cm ein
4. Klick "Fang speichern"

✅ Siehst du den Fisch im 3D-Aquarium schwimmen? 🎉

## Was funktioniert jetzt schon?

- ✅ Fänge hinzufügen, löschen
- ✅ 3D-Aquarium mit Animation
- ✅ Statistiken
- ✅ Lokaler Speicher (Daten bleiben beim Reload)
- ✅ Responsive Design

## Als nächstes

### Deine 3D-Modelle einbauen

1. **Modelle vorbereiten:**
   - Format: `.glb` (empfohlen) oder `.gltf`
   - In `public/models/` ablegen
   - z.B. `hecht.glb`, `zander.glb`

2. **Fish.tsx anpassen:**

```tsx
// In components/Fish.tsx
import { useGLTF } from '@react-three/drei'

export default function Fish({ position, species, length }: FishProps) {
  const modelPath = `/models/${species.toLowerCase()}.glb`
  const { scene } = useGLTF(modelPath)
  
  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={(length / 50) * 0.8}
      castShadow
    />
  )
}

// Preload für bessere Performance
useGLTF.preload('/models/hecht.glb')
useGLTF.preload('/models/zander.glb')
// ... weitere Modelle
```

3. **Fallback behalten:**
   - Behalte die aktuelle Placeholder-Geometrie als Fallback
   - Falls ein Modell fehlt, zeige Placeholder

### Supabase einrichten (optional)

**Warum?** Für Cloud-Sync, Multi-Device, Accounts

1. **Account erstellen:**
   - Gehe zu [supabase.com](https://supabase.com)
   - "Start your project" klicken
   - Organisation & Projekt erstellen

2. **Credentials kopieren:**
   - Settings > API
   - Kopiere "Project URL" und "anon public"

3. **`.env.local` erstellen:**

```bash
cp .env.local.example .env.local
```

Füge deine Credentials ein:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

4. **Datenbank Setup:**
   - SQL Editor öffnen
   - Inhalt von `supabase/schema.sql` kopieren
   - Ausführen (Run)

5. **Authentication aktivieren:**
   - Authentication > Providers
   - Email aktivieren
   - Optional: Google, GitHub etc.

### Foto-Upload hinzufügen

Kommt in der nächsten Phase! Vorbereitet ist:
- Supabase Storage Bucket
- Upload-Policies
- Feld im Formular

## Probleme?

### Port 3000 schon belegt?

```bash
npm run dev -- -p 3001
```

### TypeScript Fehler?

```bash
npm run build
```
Zeigt alle Fehler. Häufigster Fehler: Missing dependencies.

### 3D-Aquarium zeigt nichts?

1. Browser-Console öffnen (F12)
2. Fehler checken
3. Wahrscheinlich: WebGL nicht unterstützt

### Fische schwimmen nicht?

- Normale Animationen sind drin
- Wenn du eigene Modelle lädst: Animations sind optional

## Performance-Tipps

- Halte Polygon-Count niedrig (< 10k pro Fisch)
- Nutze `.glb` statt `.gltf` (komprimiert)
- Preload häufig genutzte Modelle
- Bei vielen Fängen: Pagination einbauen

## Deployment

### Vercel (Empfohlen)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Andere Hosts
- Netlify ✅
- Railway ✅
- Render ✅
- Cloudflare Pages ✅

## Nächste Features planen

1. **Foto-Upload** (einfach)
2. **GPS-Integration** (mittel)
3. **Export/Import** (einfach)
4. **Dark/Light Mode** (einfach)
5. **PWA** (mittel)
6. **Social Features** (komplex)

## Fragen?

- GitHub Issues erstellen
- Discord/Slack Community
- Stack Overflow mit "react-three-fiber" Tag

**Happy Coding! 🎣**
