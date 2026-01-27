'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import { useCatchStore } from '@/lib/store'
import Fish from './Fish'

function AquariumScene() {
  const catches = useCatchStore((state) => state.catches)

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#4a90e2" />
      
      {/* Environment for reflections */}
      <Environment preset="sunset" />
      
      {/* Ocean Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a3a52" roughness={0.8} />
      </mesh>

      {/* Render fish based on catches */}
      {catches.map((catchData, index) => (
        <Fish
          key={catchData.id}
          position={[
            (index % 3 - 1) * 3,
            Math.sin(index) * 2,
            (Math.floor(index / 3) - 1) * 3,
          ]}
          species={catchData.species}
          length={catchData.length}
        />
      ))}

      {/* Show placeholder if no catches */}
      {catches.length === 0 && (
        <group>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="#4a90e2" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, -1, 0]}>
            <boxGeometry args={[2, 0.1, 2]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
      />
    </>
  )
}

export default function FishAquarium() {
  return (
    <div className="w-full h-[500px] bg-gradient-to-b from-ocean-light/20 to-ocean-dark rounded-xl">
      <Canvas shadows>
        <Suspense fallback={null}>
          <AquariumScene />
        </Suspense>
      </Canvas>
    </div>
  )
}
