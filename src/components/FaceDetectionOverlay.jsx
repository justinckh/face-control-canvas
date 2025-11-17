import { useEffect, useRef, useState } from "react";

export default function FaceDetectionOverlay({ onEyePositionChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const lastLandmarksRef = useRef(null);
  const lastEyePositionRef = useRef({ x: 0, y: 0 });
  const canvasSizeInitializedRef = useRef(false);
  const detectionOptionsRef = useRef(null);

  useEffect(() => {
    // Load face-api models
    const loadModels = async () => {
      try {
        if (typeof faceapi === "undefined") {
          console.error("face-api.js not loaded");
          return;
        }

        await faceapi.loadTinyFaceDetectorModel("/");
        await faceapi.loadFaceLandmarkTinyModel("/");
        setModelsLoaded(true);
        console.log("Face detection models loaded");
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();

    // Start video stream
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
        });

        const videoElement = videoRef.current;

        if (videoElement) {
          videoElement.srcObject = stream;

          if (videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
            try {
              await videoElement.play();
            } catch (playError) {
              if (playError?.name !== "AbortError") {
                throw playError;
              }
            }
          } else {
            await new Promise((resolve) => {
              const handleLoadedMetadata = async () => {
                videoElement.removeEventListener(
                  "loadedmetadata",
                  handleLoadedMetadata
                );
                try {
                  await videoElement.play();
                } catch (playError) {
                  if (playError?.name !== "AbortError") {
                    console.error("Error starting video playback:", playError);
                  }
                } finally {
                  resolve();
                }
              };

              videoElement.addEventListener(
                "loadedmetadata",
                handleLoadedMetadata
              );
            });
          }
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    startVideo();

    // Cleanup
    return () => {
      if (detectionIntervalRef.current?.cancel) {
        detectionIntervalRef.current.cancel();
      }
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

    const startDetection = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      let isDetectingFrame = false;
      let animationFrameId = null;
      let lastVideoWidth = 0;
      let lastVideoHeight = 0;
      let dims = null;

      // Initialize detection options once
      if (!detectionOptionsRef.current) {
        detectionOptionsRef.current = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        });
      }

      const updateCanvasSize = () => {
        if (video && canvas) {
          // Only update if video dimensions have changed
          const currentVideoWidth = video.videoWidth || 0;
          const currentVideoHeight = video.videoHeight || 0;

          if (
            !canvasSizeInitializedRef.current ||
            currentVideoWidth !== lastVideoWidth ||
            currentVideoHeight !== lastVideoHeight
          ) {
            // Match canvas display size to video display size
            const rect = video.getBoundingClientRect();
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            // Set canvas internal resolution to match video
            canvas.width = currentVideoWidth || rect.width;
            canvas.height = currentVideoHeight || rect.height;

            // Recalculate dimensions when size changes
            dims = faceapi.matchDimensions(canvas, video, true);
            lastVideoWidth = currentVideoWidth;
            lastVideoHeight = currentVideoHeight;
            canvasSizeInitializedRef.current = true;
          }
        }
      };

      // Initialize canvas size once at start
      updateCanvasSize();

      const detect = async () => {
        if (
          !video ||
          video.readyState !== 4 ||
          isDetectingFrame ||
          !isDetectingRef.current
        )
          return;

        isDetectingFrame = true;

        try {
          // Only update canvas size if video dimensions changed
          const currentVideoWidth = video.videoWidth || 0;
          const currentVideoHeight = video.videoHeight || 0;
          if (
            currentVideoWidth !== lastVideoWidth ||
            currentVideoHeight !== lastVideoHeight
          ) {
            updateCanvasSize();
          }

          const result = await faceapi
            .detectSingleFace(video, detectionOptionsRef.current)
            .withFaceLandmarks(true);

          // Clear canvas before drawing
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result && result.landmarks) {
            // Only recalculate dimensions if they weren't set or video size changed
            if (!dims) {
              dims = faceapi.matchDimensions(canvas, video, true);
            }
            const resizedResult = faceapi.resizeResults(result, dims);

            // Store landmarks for persistence
            lastLandmarksRef.current = resizedResult.landmarks;

            // Draw eye landmarks
            const midPoint = drawEyeLandmarks(ctx, resizedResult.landmarks);
            if (midPoint) {
              updateEyePosition(midPoint);
            }
          } else if (lastLandmarksRef.current) {
            // If no face detected but we have previous landmarks, redraw them
            // This prevents flashing when detection temporarily fails
            const midPoint = drawEyeLandmarks(ctx, lastLandmarksRef.current);
            if (midPoint) {
              updateEyePosition(midPoint);
            }
          }
        } catch (error) {
          console.error("Detection error:", error);
        } finally {
          isDetectingFrame = false;
        }

        // Continue detection loop using requestAnimationFrame for smoother updates
        if (isDetectingRef.current) {
          animationFrameId = requestAnimationFrame(() => {
            // Add a small delay to prevent overwhelming the system
            setTimeout(detect, 50);
          });
        }
      };

      // Start detection loop
      detect();
      detectionIntervalRef.current = {
        cancel: () => cancelAnimationFrame(animationFrameId),
      };
    };

    if (isDetecting) {
      startDetection();
    } else {
      // Clear canvas when detection stops
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      lastLandmarksRef.current = null;
      canvasSizeInitializedRef.current = false;
      lastEyePositionRef.current = { x: 0, y: 0 };
      if (onEyePositionChange) {
        onEyePositionChange({ x: 0, y: 0 });
      }
    }

    return () => {
      if (detectionIntervalRef.current?.cancel) {
        detectionIntervalRef.current.cancel();
      }
    };
  }, [modelsLoaded, isDetecting, onEyePositionChange]);

  const updateEyePosition = (midPoint) => {
    if (!canvasRef.current) return;

    const { width, height } = canvasRef.current;
    if (!width || !height) return;

    const normalized = {
      x: Math.max(-1, Math.min(1, (midPoint.x / width - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, (0.5 - midPoint.y / height) * 2)),
    };

    const previous = lastEyePositionRef.current;
    const hasMeaningfulChange =
      Math.abs(normalized.x - previous.x) > 0.01 ||
      Math.abs(normalized.y - previous.y) > 0.01;

    lastEyePositionRef.current = normalized;

    if (hasMeaningfulChange && onEyePositionChange) {
      onEyePositionChange(normalized);
    }
  };

  const drawEyeLandmarks = (ctx, landmarks) => {
    if (!landmarks) return null;

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    if (
      !leftEye ||
      !rightEye ||
      leftEye.length === 0 ||
      rightEye.length === 0
    ) {
      return null;
    }

    const leftEyeCenter = faceapi.utils.getCenterPoint(leftEye);
    const rightEyeCenter = faceapi.utils.getCenterPoint(rightEye);

    const midPoint = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    // Mirror the point horizontally so movement matches the mirrored video feed
    const mirroredPoint = {
      x: ctx.canvas.width ? ctx.canvas.width - midPoint.x : midPoint.x,
      y: midPoint.y,
    };

    // Draw a single marker for the midpoint between both eyes
    ctx.beginPath();
    ctx.arc(mirroredPoint.x, mirroredPoint.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 255, 255, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mirroredPoint.x, mirroredPoint.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ffff";
    ctx.fill();

    // Crosshair lines for clarity
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mirroredPoint.x - 15, mirroredPoint.y);
    ctx.lineTo(mirroredPoint.x + 15, mirroredPoint.y);
    ctx.moveTo(mirroredPoint.x, mirroredPoint.y - 15);
    ctx.lineTo(mirroredPoint.x, mirroredPoint.y + 15);
    ctx.stroke();

    return mirroredPoint;
  };

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0, // Hidden but still capturing
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
          objectFit: "cover",
        }}
      />
      <button
        onClick={() => setIsDetecting(!isDetecting)}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 100,
          padding: "10px 20px",
          backgroundColor: isDetecting ? "#ff4444" : "#44ff44",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {isDetecting ? "Stop Detection" : "Start Detection"}
      </button>
    </>
  );
}
