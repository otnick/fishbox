# 🎣 FishBox - Dein Angel-Tracker mit 3D-Visualisierung

Ein modernes Angel-Tagebuch mit interaktivem 3D-Aquarium, wo deine gefangenen Fische wie bei Pokemon herumschwimmen.

## ✨ Features

- **3D-Aquarium**: Deine Fänge schwimmen in einem interaktiven 3D-Aquarium
- **Fang-Tracking**: Speichere Art, Größe, Gewicht, Ort, Köder und mehr
- **Statistiken**: Übersicht über deine Erfolge
- **Responsive Design**: Funktioniert auf Desktop und Mobile
- **Offline-First**: Daten werden lokal gespeichert (später mit Cloud-Sync)

## 🚀 Quick Start

### 1. Installation

```bash
npm install
# oder
yarn install
```

### 2. Entwicklungsserver starten

```bash
npm run dev
# oder
yarn dev
```

Öffne [http://localhost:3000](http://localhost:3000) in deinem Browser.

## 🗄️ Supabase Setup (Optional für Cloud-Sync)

### Schritt 1: Supabase Projekt erstellen

1. Gehe zu [https://supabase.com](https://supabase.com)
2. Erstelle ein neues Projekt
3. Kopiere deine Project URL und Anon Key

### Schritt 2: Umgebungsvariablen

1. Kopiere `.env.local.example` zu `.env.local`
2. Füge deine Supabase Credentials ein:

```env
NEXT_PUBLIC_SUPABASE_URL=deine-projekt-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

### Schritt 3: Datenbank Schema

1. Öffne den Supabase SQL Editor
2. Führe das Script aus `supabase/schema.sql` aus
3. Das erstellt alle notwendigen Tabellen und Policies

### Schritt 4: Authentication einrichten

1. Gehe zu Authentication > Providers in Supabase
2. Aktiviere Email/Password oder andere Provider
3. Optional: Aktiviere Magic Links für passwortlose Anmeldung

## 📦 Projekt-Struktur

```
fishing-tracker/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root Layout
│   ├── page.tsx             # Home Page
│   └── globals.css          # Global Styles
├── components/              # React Components
│   ├── FishAquarium.tsx    # 3D Aquarium mit Three.js
│   ├── Fish.tsx            # Individual 3D Fish
│   ├── CatchForm.tsx       # Formular für neue Fänge
│   └── CatchList.tsx       # Liste aller Fänge
├── lib/                     # Utilities
│   ├── store.ts            # Zustand State Management
│   ├── supabase.ts         # Supabase Client
│   └── types.ts            # TypeScript Types
└── supabase/
    └── schema.sql          # Datenbank Schema
```

## 🎨 Deine 3D-Modelle einbinden

### Mesh-Dateien vorbereiten

1. Lege deine `.glb` oder `.gltf` Modelle in `/public/models/` ab
2. Benenne sie nach Fischart, z.B. `hecht.glb`, `zander.glb`

### Fish Component anpassen

Öffne `components/Fish.tsx` und ersetze die Placeholder-Geometrie:

```tsx
import { useGLTF } from '@react-three/drei'

export default function Fish({ position, species, length }: FishProps) {
  // Lade dein 3D-Modell
  const { scene } = useGLTF(`/models/${species.toLowerCase()}.glb`)
  
  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={length / 50}
    />
  )
}

// Preload models
const fishSpecies = ['Hecht', 'Zander', 'Barsch']
fishSpecies.forEach(species => {
  useGLTF.preload(`/models/${species.toLowerCase()}.glb`)
})
```

## 🎯 Roadmap

### Phase 1 - MVP (Jetzt)
- [x] Basic Fang-Tracking
- [x] 3D-Aquarium mit Placeholder-Fischen
- [x] Lokaler State (Zustand)
- [ ] Foto-Upload
- [ ] GPS-Integration

### Phase 2 - Cloud & Social
- [ ] Supabase Authentication
- [ ] Cloud-Synchronisation
- [ ] Freundesliste
- [ ] Rankings & Bestenlisten

### Phase 3 - Advanced Features
- [ ] Foto zu 3D-Model (AI)
- [ ] Heatmaps
- [ ] Wettervorhersage
- [ ] Schonzeiten-Erinnerungen
- [ ] PWA / Mobile Apps (Capacitor)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js + React Three Fiber + Drei
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **TypeScript**: Full type safety

## 📱 Als App deployen

### Web (Vercel)

```bash
npm run build
# Deploy to Vercel
vercel
```

### Mobile (mit Capacitor)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build
npx cap sync

# Open in Xcode/Android Studio
npx cap open ios
npx cap open android
```

## 🎣 Tipps & Tricks

### Performance optimieren

- Verwende `next/image` für Fotos
- Lazy-load 3D-Modelle mit `Suspense`
- Reduziere Polygon-Count bei 3D-Modellen

### Realistische Fische

- Nutze Blender für Custom-Modelle
- Kaufe Modelle auf Sketchfab/TurboSquid
- Beauftrage einen 3D-Artist auf Fiverr

### Community Features

- Firebase für Realtime-Chat
- Mapbox für interaktive Karten
- Cloudinary für optimierte Bilder

## 🤝 Contributing

Du willst helfen? Super! 

1. Fork das Projekt
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 Lizenz

MIT - siehe LICENSE file

## 🙏 Credits

- Three.js Community
- React Three Fiber Team
- Supabase Team

---

**Viel Erfolg beim Angeln! 🎣**
