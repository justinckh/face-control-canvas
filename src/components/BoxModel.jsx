import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function BoxModel({ ...props }) {
  const { scene } = useGLTF("/Box.glb");
  const modelRef = useRef();

  // Optional: Add rotation animation
  useFrame((state, delta) => {
    if (modelRef.current) {
      // Uncomment to add rotation
      // modelRef.current.rotation.y += delta * 0.2;
    }
  });

  return <primitive ref={modelRef} object={scene} {...props} />;
}

// Preload the model for better performance
useGLTF.preload("/Box.glb");
