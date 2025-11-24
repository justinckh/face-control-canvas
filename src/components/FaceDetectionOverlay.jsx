import { useEffect, useRef, useState } from "react";

// Low pass filter for smoothing values
class SmoothZoom {
  constructor(alpha = 0.1) {
    this.smoothedDistance = null;
    this.alpha = alpha; // 0.05 very smooth, 0.2 more responsive
  }

  update(rawDistance) {
    if (this.smoothedDistance === null) {
      this.smoothedDistance = rawDistance;
    } else {
      this.smoothedDistance =
        this.smoothedDistance * (1 - this.alpha) + rawDistance * this.alpha;
    }
    return this.smoothedDistance;
  }

  reset() {
    this.smoothedDistance = null;
  }
}

// Low pass filter for smoothing position (x, y)
class SmoothPosition {
  constructor(alpha = 0.1) {
    this.smoothedPosition = null;
    this.alpha = alpha;
  }

  update(rawPosition) {
    if (this.smoothedPosition === null) {
      this.smoothedPosition = { x: rawPosition.x, y: rawPosition.y };
    } else {
      this.smoothedPosition = {
        x:
          this.smoothedPosition.x * (1 - this.alpha) +
          rawPosition.x * this.alpha,
        y:
          this.smoothedPosition.y * (1 - this.alpha) +
          rawPosition.y * this.alpha,
      };
    }
    return this.smoothedPosition;
  }

  reset() {
    this.smoothedPosition = null;
  }
}

// Deadzone filter - only returns value if change exceeds threshold
function applyDeadzone(current, previous, threshold) {
  if (previous === null || previous === undefined) {
    return current;
  }
  const change = Math.abs(current - previous);
  if (change < threshold) {
    return previous; // Return previous value if change is too small
  }
  return current;
}

// Deadzone filter for position objects
function applyPositionDeadzone(current, previous, threshold) {
  if (!previous || previous.x === undefined || previous.y === undefined) {
    return current;
  }
  const deltaX = Math.abs(current.x - previous.x);
  const deltaY = Math.abs(current.y - previous.y);
  if (deltaX < threshold && deltaY < threshold) {
    return previous; // Return previous value if change is too small
  }
  return current;
}

export default function FaceDetectionOverlay({
  onEyePositionChange,
  onEyeDistanceChange,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const lastLandmarksRef = useRef(null);
  const lastEyePositionRef = useRef({ x: 0, y: 0 });
  const lastEyeDistanceRef = useRef(null);
  const canvasSizeInitializedRef = useRef(false);
  const detectionOptionsRef = useRef(null);

  // Smoothing filters
  const smoothZoomRef = useRef(new SmoothZoom(0.1));
  const smoothPositionRef = useRef(new SmoothPosition(0.1));

  // Deadzone thresholds
  const distanceDeadzoneThreshold = 0.001; // Threshold for normalized distance (0-1 range)
  const positionDeadzoneThreshold = 0.005; // Threshold for normalized position (-1 to 1 range)

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
            // width: { ideal: 640 }, // Reduced from 1280 for faster processing
            // height: { ideal: 480 }, // Reduced from 720 for faster processing
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

      // Initialize detection options once - optimized for speed
      if (!detectionOptionsRef.current) {
        detectionOptionsRef.current = new faceapi.TinyFaceDetectorOptions({
          inputSize: 224, // Reduced from 320 for faster detection (224 is still accurate)
          scoreThreshold: 0.6, // Slightly lower threshold for faster processing
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

      // Frame skipping for performance - detect every N frames
      let frameSkipCounter = 0;
      const FRAME_SKIP = 1; // Set to 1 for no skipping, 2 for every other frame, etc.

      const detect = async () => {
        if (
          !video ||
          video.readyState !== 4 ||
          isDetectingFrame ||
          !isDetectingRef.current
        )
          return;

        // Frame skipping: only detect every FRAME_SKIP frames
        frameSkipCounter++;
        if (frameSkipCounter < FRAME_SKIP) {
          // Still draw previous landmarks if available for smooth rendering
          if (lastLandmarksRef.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const drawResult = drawEyeLandmarks(ctx, lastLandmarksRef.current);
            if (drawResult && drawResult.midPoint) {
              updateEyePosition(drawResult.midPoint);
              if (drawResult.distance !== undefined) {
                updateEyeDistance(drawResult.distance);
              }
            }
          }
          // Continue loop immediately without detection
          if (isDetectingRef.current) {
            animationFrameId = requestAnimationFrame(detect);
          }
          return;
        }
        frameSkipCounter = 0;

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
            const drawResult = drawEyeLandmarks(ctx, resizedResult.landmarks);
            if (drawResult && drawResult.midPoint) {
              updateEyePosition(drawResult.midPoint);
              if (drawResult.distance !== undefined) {
                updateEyeDistance(drawResult.distance);
              }
            }
          } else if (lastLandmarksRef.current) {
            // If no face detected but we have previous landmarks, redraw them
            // This prevents flashing when detection temporarily fails
            const drawResult = drawEyeLandmarks(ctx, lastLandmarksRef.current);
            if (drawResult && drawResult.midPoint) {
              updateEyePosition(drawResult.midPoint);
              if (drawResult.distance !== undefined) {
                updateEyeDistance(drawResult.distance);
              }
            }
          } else {
            // No face detected and no previous landmarks - reset distance
            updateEyeDistance(null);
          }
        } catch (error) {
          console.error("Detection error:", error);
        } finally {
          isDetectingFrame = false;
        }

        // Continue detection loop using requestAnimationFrame for smoother updates
        // Removed setTimeout delay for maximum FPS
        if (isDetectingRef.current) {
          animationFrameId = requestAnimationFrame(detect);
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
      lastEyeDistanceRef.current = null;
      // Reset smoothing filters
      smoothZoomRef.current.reset();
      smoothPositionRef.current.reset();
      if (onEyePositionChange) {
        onEyePositionChange({ x: 0, y: 0 });
      }
      updateEyeDistance(null);
    }

    return () => {
      if (detectionIntervalRef.current?.cancel) {
        detectionIntervalRef.current.cancel();
      }
    };
  }, [modelsLoaded, isDetecting, onEyePositionChange, onEyeDistanceChange]);

  const updateEyePosition = (midPoint) => {
    if (!canvasRef.current) return;

    const { width, height } = canvasRef.current;
    if (!width || !height) return;

    const rawNormalized = {
      x: Math.max(-1, Math.min(1, (midPoint.x / width - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, (0.5 - midPoint.y / height) * 2)),
    };

    // Apply low pass filter
    const smoothed = smoothPositionRef.current.update(rawNormalized);

    // Apply deadzone filter
    const previous = lastEyePositionRef.current;
    const afterDeadzone = applyPositionDeadzone(
      smoothed,
      previous,
      positionDeadzoneThreshold
    );

    lastEyePositionRef.current = afterDeadzone;

    // Only update if there's a meaningful change after all filtering
    if (onEyePositionChange) {
      onEyePositionChange(afterDeadzone);
    }
  };

  const updateEyeDistance = (rawDistance) => {
    if (rawDistance === null || rawDistance === undefined) {
      // Reset filters when no face detected
      smoothZoomRef.current.reset();
      lastEyeDistanceRef.current = null;
      if (onEyeDistanceChange) {
        onEyeDistanceChange(null);
      }
      return;
    }

    // Apply low pass filter
    const smoothed = smoothZoomRef.current.update(rawDistance);

    // Apply deadzone filter
    const previous = lastEyeDistanceRef.current;
    const afterDeadzone = applyDeadzone(
      smoothed,
      previous,
      distanceDeadzoneThreshold
    );

    lastEyeDistanceRef.current = afterDeadzone;

    // Update callback with filtered value
    if (onEyeDistanceChange) {
      onEyeDistanceChange(afterDeadzone);
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

    // Mirror the points horizontally so movement matches the mirrored video feed
    const canvasWidth = ctx.canvas.width || 0;
    const mirroredLeftEye = {
      x: canvasWidth - leftEyeCenter.x,
      y: leftEyeCenter.y,
    };
    const mirroredRightEye = {
      x: canvasWidth - rightEyeCenter.x,
      y: rightEyeCenter.y,
    };
    const mirroredPoint = {
      x: canvasWidth - midPoint.x,
      y: midPoint.y,
    };

    // Calculate distance between eyes in pixels
    const eyeDistancePx = Math.sqrt(
      Math.pow(mirroredRightEye.x - mirroredLeftEye.x, 2) +
        Math.pow(mirroredRightEye.y - mirroredLeftEye.y, 2)
    );

    // Normalize distance by canvas diagonal for consistency across resolutions
    // This makes the measurement device-independent
    const canvasHeight = ctx.canvas.height || 1;
    const canvasDiagonal = Math.sqrt(
      Math.pow(canvasWidth, 2) + Math.pow(canvasHeight, 2)
    );
    const normalizedDistance = eyeDistancePx / canvasDiagonal;

    // Draw line between the two eyes
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mirroredLeftEye.x, mirroredLeftEye.y);
    ctx.lineTo(mirroredRightEye.x, mirroredRightEye.y);
    ctx.stroke();

    // Draw distance label near the midpoint
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Display normalized distance (0-1 range, typically 0.05-0.15 for eyes)
    const distanceText = normalizedDistance.toFixed(3);
    const textMetrics = ctx.measureText(distanceText);
    const textWidth = textMetrics.width;
    const textHeight = 20;
    const padding = 6;
    const bgX = mirroredPoint.x - textWidth / 2 - padding;
    const bgY = mirroredPoint.y - 25;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;

    // Draw background rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw distance text
    ctx.fillStyle = "#00ffff";
    ctx.fillText(distanceText, mirroredPoint.x, mirroredPoint.y - 15);

    // Draw left eye marker
    ctx.beginPath();
    ctx.arc(mirroredLeftEye.x, mirroredLeftEye.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 255, 0, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mirroredLeftEye.x, mirroredLeftEye.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ff00";
    ctx.fill();

    // Draw right eye marker
    ctx.beginPath();
    ctx.arc(mirroredRightEye.x, mirroredRightEye.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mirroredRightEye.x, mirroredRightEye.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    // Draw midpoint marker (existing functionality)
    ctx.beginPath();
    ctx.arc(mirroredPoint.x, mirroredPoint.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 255, 255, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mirroredPoint.x, mirroredPoint.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#00ffff";
    ctx.fill();

    // Crosshair lines for midpoint clarity
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mirroredPoint.x - 15, mirroredPoint.y);
    ctx.lineTo(mirroredPoint.x + 15, mirroredPoint.y);
    ctx.moveTo(mirroredPoint.x, mirroredPoint.y - 15);
    ctx.lineTo(mirroredPoint.x, mirroredPoint.y + 15);
    ctx.stroke();

    return { midPoint: mirroredPoint, distance: normalizedDistance };
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
