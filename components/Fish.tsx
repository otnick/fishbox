'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

interface FishProps {
  position: [number, number, number]
  species: string
  length: number
}

export default function Fish({ position, species, length }: FishProps) {
  const meshRef = useRef<Mesh>(null)
  const time = useRef(Math.random() * 1000)

  // Animate fish swimming
  useFrame((state, delta) => {
    if (meshRef.current) {
      time.current += delta
      // Gentle swimming motion
      meshRef.current.position.y = position[1] + Math.sin(time.current * 0.5) * 0.3
      meshRef.current.rotation.y = Math.sin(time.current * 0.3) * 0.2
      // Slow circular movement
      meshRef.current.position.x = position[0] + Math.sin(time.current * 0.2) * 0.5
      meshRef.current.position.z = position[2] + Math.cos(time.current * 0.2) * 0.5
    }
  })

  // Scale based on fish length (normalize to reasonable 3D size)
  const scale = (length / 50) * 0.8

  // Different colors for different species (placeholder until you add your meshes)
  const colorMap: { [key: string]: string } = {
    'Hecht': '#4a7c59',
    'Zander': '#d4af37',
    'Barsch': '#c41e3a',
    'Karpfen': '#8b7355',
    'Forelle': '#87ceeb',
    'Aal': '#2c2c2c',
    'Wels': '#4a4a4a',
    'Döbel': '#a9a9a9',
  }

  const fishColor = colorMap[species] || '#4a90e2'

  return (
    <mesh ref={meshRef} position={position} scale={scale} castShadow>
      {/* Placeholder fish body - Replace this with your imported 3D models */}
      <group>
        {/* Body */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.3, 1.5, 8, 16]} />
          <meshStandardMaterial color={fishColor} roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Tail */}
        <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.4, 0.6, 3]} />
          <meshStandardMaterial color={fishColor} roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Dorsal fin */}
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.3, 0.4, 3]} />
          <meshStandardMaterial color={fishColor} roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[0.6, 0.2, 0.2]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.6, 0.2, -0.2]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
    </mesh>
  )
}
