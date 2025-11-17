import React from "react";
import { useGLTF } from "@react-three/drei";

export default function Ps5Model(props) {
  const { nodes, materials } = useGLTF("/assets/ps5.glb");
  return (
    <group {...props} dispose={null}>
      <group position={[-0.014, 0, -0.059]}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.button_mic.geometry}
          material={materials.mic}
          position={[0, 0.043, 0]}
          rotation={[-0.209, 0, 0]}
        />
        <group position={[0.024, 0.034, -0.023]} rotation={[-0.209, 0, 0.03]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube005.geometry}
            material={materials.buttons_inner}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube005_1.geometry}
            material={materials["Glas Basic"]}
          />
        </group>
        <group position={[0, 0.021, 0.01]} rotation={[-0.209, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube003.geometry}
            material={materials.headphones}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube003_1.geometry}
            material={materials.contact}
          />
        </group>
        <group position={[-0.006, 0.031, -0.018]} rotation={[0.02, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube001.geometry}
            material={materials.main_controler}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube001_1.geometry}
            material={materials["plastic white "]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube001_2.geometry}
            material={materials.outershel_bottom}
          />
        </group>
        <group position={[0, 0.043, 0]} rotation={[-0.209, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube006.geometry}
            material={materials["black plastik"]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube006_1.geometry}
            material={materials.emission_blue}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube006_2.geometry}
            material={materials["plastic white "]}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.options.geometry}
          material={materials["plastic white "]}
          position={[0, 0.043, 0]}
          rotation={[-0.318, -0.177, 0]}
        />
        {/* <mesh
          castShadow
          receiveShadow
          geometry={nodes.Plane.geometry}
          material={materials.plane}
          scale={1.024}
        /> */}
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.ps_logo.geometry}
          material={materials.ps_logo}
          position={[0, 0.043, 0]}
          rotation={[1.607, 0, 0]}
        />
        <group position={[0, 0.043, 0]} rotation={[-0.209, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube009.geometry}
            material={materials["Material.001"]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube009_1.geometry}
            material={materials["Material.002"]}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.touchpad.geometry}
          material={materials["plastic white "]}
          position={[0, 0.043, 0]}
          rotation={[-0.219, 0, 0]}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.trigers.geometry}
          material={materials.trigers}
          position={[0, 0.017, -0.031]}
          rotation={[1.248, 0.015, -3.029]}
        />
        <group position={[0, 0.043, 0.002]} rotation={[-0.209, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.main_controler001_1.geometry}
            material={materials.usb}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.main_controler001_2.geometry}
            material={materials.usb_contakt}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/assets/ps5.glb");
