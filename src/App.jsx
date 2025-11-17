import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PresentationControls,
  OrbitControls,
  Environment,
} from "@react-three/drei";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import RingStandModel from "./components/RingStandModel";
import Ps5Model from "./components/Ps5.jsx";
import FaceDetectionOverlay from "./components/FaceDetectionOverlay";

function CameraFollower({
  target,
  mode = "presentation",
  orbitControlsRef,
  camScaleX = 0.0,
  camScaleY = 0.0,
  offsetXRange = [-3.5, 3.5],
  offsetYRange = [-3.5, 3.5],
  damping = 0.02,
  zoom = 5,
}) {
  const { camera } = useThree();
  const lerpTarget = useRef(new Vector3());

  useFrame(() => {
    const scaledX = (target?.x ?? 0) * camScaleX;
    const scaledY = (target?.y ?? 0) * camScaleY;

    const targetX = MathUtils.clamp(scaledX, offsetXRange[0], offsetXRange[1]);
    const targetY = MathUtils.clamp(scaledY, offsetYRange[0], offsetYRange[1]);

    camera.position.x += (targetX - camera.position.x) * damping;
    camera.position.y += (targetY - camera.position.y) * damping;
    camera.position.z += (zoom - camera.position.z) * damping;
    camera.lookAt(0, 0, 0);

    if (mode === "orbit" && orbitControlsRef?.current) {
      const controls = orbitControlsRef.current;
      controls.target.lerp(lerpTarget.current.set(0, 0, 0), damping);
      controls.update();
    }
  });

  return null;
}

function App() {
  const [eyeTarget, setEyeTarget] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(5);
  const minZoom = useMemo(() => 3, []);
  const maxZoom = useMemo(() => 12, []);
  const mode = useMemo(() => "presentation", []); // change to "orbit" to enable OrbitControls
  const usePresentationMode = mode === "presentation";
  const orbitControlsRef = useRef(null);
  const containerRef = useRef(null);

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.deltaY * 0.01;
      setZoom((current) => MathUtils.clamp(current + delta, minZoom, maxZoom));
    },
    [maxZoom, minZoom]
  );

  const zoomRatio = useMemo(() => {
    if (maxZoom === minZoom) return 0;
    return MathUtils.clamp((zoom - minZoom) / (maxZoom - minZoom), 0, 1);
  }, [maxZoom, minZoom, zoom]);

  const camScaleX = useMemo(
    () => MathUtils.lerp(2.5, 6.0, zoomRatio),
    [zoomRatio]
  );
  const camScaleY = useMemo(
    () => MathUtils.lerp(8, 25.0, zoomRatio),
    [zoomRatio]
  );
  const offsetXRange = useMemo(() => {
    const nearRange = [-1.8, 1.8];
    const farRange = [-4.5, 4.5];
    return [
      MathUtils.lerp(nearRange[0], farRange[0], zoomRatio),
      MathUtils.lerp(nearRange[1], farRange[1], zoomRatio),
    ];
  }, [zoomRatio]);
  const offsetYRange = useMemo(() => {
    const nearRange = [-1.0, 7.0];
    const farRange = [-3.2, 3.4];
    return [
      MathUtils.lerp(nearRange[0], farRange[0], zoomRatio),
      MathUtils.lerp(nearRange[1], farRange[1], zoomRatio),
    ];
  }, [zoomRatio]);
  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "#1a1a1a" }}
      >
        <Suspense fallback={null}>
          <CameraFollower
            target={eyeTarget}
            mode={mode}
            orbitControlsRef={orbitControlsRef}
            camScaleX={camScaleX}
            camScaleY={camScaleY}
            offsetXRange={offsetXRange}
            offsetYRange={offsetYRange}
            zoom={zoom}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          {usePresentationMode ? (
            <PresentationControls
              global
              config={{ mass: 1, tension: 280 }}
              polar={[-Math.PI / 12, Math.PI / 2]}
              azimuth={[-Infinity, Infinity]}
              cursor={false}
              damping={0.05}
              speed={2.0}
            >
              <RingStandModel
                scale={[0.25, 0.18, 0.18]}
                position={[0, -3.5, 0]}
                rotation={[0, 0, 0]}
              />
              <Ps5Model
                scale={20}
                position={[0.2, -1, -0.3]}
                rotation={[Math.PI / 2, 0, 0]}
              />
            </PresentationControls>
          ) : (
            <>
              <RingStandModel
                scale={0.03}
                position={[0, -1, 0]}
                rotation={[0, 0.5, 0]}
              />
              <OrbitControls
                ref={orbitControlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={20}
              />
            </>
          )}
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
      <FaceDetectionOverlay onEyePositionChange={setEyeTarget} />
    </div>
  );
}

export default App;
