# 3D Modelle Guide

## Deine Meshes hier platzieren

Lege deine `.glb` oder `.gltf` Dateien in diesen Ordner.

### Empfohlene Dateinamen

```
public/models/
├── hecht.glb
├── zander.glb
├── barsch.glb
├── karpfen.glb
├── forelle.glb
├── aal.glb
├── wels.glb
└── doebel.glb
```

## 📏 Mesh-Anforderungen

### Format
- **Bevorzugt**: `.glb` (komprimiertes GLTF)
- **Alternativ**: `.gltf` mit separaten Texturen

### Größe
- **Polygon Count**: 2.000 - 10.000 Tris pro Fisch (für Web-Performance)
- **Textur-Auflösung**: 1024x1024 oder 2048x2048 px
- **Datei-Größe**: < 2 MB pro Modell

### Orientierung
- **Forward**: +Z Achse (Fisch schaut nach vorne)
- **Up**: +Y Achse (Fisch steht aufrecht)
- **Scale**: 1 Unit = ~1 Meter (wird im Code skaliert)

### Pivot Point
- Am Kopf/Maul des Fisches (für natürliche Rotation)

## 🎨 Textur-Tipps

- PBR Materials verwenden (Metallic-Roughness Workflow)
- Embedded Textures im GLB (einfacher zu handhaben)
- Normal Maps für Details ohne zusätzliche Polygone

## 🔧 Blender Export-Settings

Wenn du Blender verwendest:

1. File > Export > glTF 2.0 (.glb/.gltf)
2. Format: **glTF Binary (.glb)**
3. Include: Selected Objects
4. Transform: **+Y Up**
5. Geometry:
   - ✅ Apply Modifiers
   - ✅ UVs
   - ✅ Normals
   - ✅ Tangents
6. Materials:
   - ✅ Export Materials
7. Compression:
   - ✅ Compress (Draco) für kleinere Dateien

## 🐟 Modell-Quellen

### Kostenlos
- **Sketchfab** (Free models mit CC-Lizenz)
- **Poly Pizza** (Google Poly Archive)
- **TurboSquid Free** (einige kostenlose Modelle)

### Bezahlt
- **Sketchfab Store** (~10-30€ pro Modell)
- **TurboSquid** (~20-100€ pro Modell)
- **CGTrader** (~15-50€ pro Modell)

### Custom
- **Fiverr** (~50-150€ für 5-10 Modelle)
- **Upwork** (Stunden- oder Projektbasis)
- **r/3Dmodeling** (Community Anfragen)

## 🚀 Nach dem Hinzufügen

1. Teste das Modell im Browser
2. Prüfe Performance (FPS)
3. Optimiere bei Bedarf (Polygon Reduction in Blender)

## 💡 Quick Test

Du kannst deine Modelle hier testen:
- **Gltf Viewer**: https://gltf-viewer.donmccurdy.com/
- **Three.js Editor**: https://threejs.org/editor/

Drag & Drop deine `.glb` Datei und prüfe:
- ✅ Modell ist sichtbar
- ✅ Keine fehlenden Texturen
- ✅ Richtige Orientierung
- ✅ Angemessene Größe
