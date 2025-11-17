import { Logger } from "./utils/logger.js";
import { FaceDetectionService } from "./services/faceDetection.js";
import { VideoController } from "./services/videoController.js";
import { CanvasRenderer } from "./services/canvasRenderer.js";
import { UIManager } from "./services/ui.js";

// Initialize services
const logger = new Logger();
const faceDetection = new FaceDetectionService(logger);
const videoController = new VideoController(logger);
const canvasRenderer = new CanvasRenderer(logger);
const uiManager = new UIManager();

// Application state
let isDetecting = false;
let forwardTimes = [];

// Initialize application
async function init() {
  logger.info("Application initializing...");

  // Setup UI event listeners
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.addEventListener("click", startDetection);
  stopBtn.addEventListener("click", stopDetection);

  logger.info("Application ready");
}

// Start detection
async function startDetection() {
  try {
    uiManager.updateStatus("Loading models...");
    logger.info("Loading face detection models...");

    // Load models
    await faceDetection.loadModels();
    logger.success("Models loaded successfully");

    // Get video stream
    uiManager.updateStatus("Requesting camera access...");
    const stream = await videoController.startVideo();
    logger.success("Camera started");

    // Initialize canvas
    const videoEl = document.getElementById("inputVideo");
    canvasRenderer.initialize(videoEl);

    // Wait for video metadata to load before starting detection
    await new Promise((resolve) => {
      if (videoEl.readyState >= 2) {
        // Metadata already loaded
        resolve();
      } else {
        videoEl.addEventListener("loadedmetadata", resolve, { once: true });
      }
    });

    // Verify video dimensions
    if (videoEl.offsetWidth === 0 || videoEl.offsetHeight === 0) {
      logger.error("Video dimensions are 0! Video may not be properly loaded.");
      uiManager.updateStatus("Error: Video not ready");
      return;
    }

    logger.info(
      `Video dimensions: ${videoEl.offsetWidth}x${videoEl.offsetHeight}`
    );

    // Ensure video is playing
    if (videoEl.paused) {
      logger.info("Video is paused, attempting to play...");
      try {
        await videoEl.play();
        logger.success("Video started playing");
      } catch (playError) {
        logger.error(`Failed to play video: ${playError.message}`);
        uiManager.updateStatus("Error: Could not play video");
        return;
      }
    }

    // Verify video is actually playing
    logger.info(
      `Video state - paused: ${videoEl.paused}, ended: ${videoEl.ended}, readyState: ${videoEl.readyState}`
    );

    // Start detection loop
    isDetecting = true;
    uiManager.updateStatus("Detection active");
    uiManager.setButtonsState({ startDisabled: true, stopDisabled: false });

    logger.info("Starting detection loop...");
    detectionLoop();
  } catch (error) {
    uiManager.updateStatus("Error starting detection");
    logger.error(`Error: ${error.message}`);
    console.error("Error starting detection:", error);
  }
}

// Detection loop
async function detectionLoop() {
  const videoEl = document.getElementById("inputVideo");

  logger.info("Detection loop started");
  let iterationCount = 0;

  while (isDetecting && !videoEl.paused && !videoEl.ended) {
    iterationCount++;

    // Log first iteration to confirm loop is running
    if (iterationCount === 1) {
      logger.info("Detection loop: First iteration");
    }
    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5, // Lowered from 0.5 to make detection more sensitive
      });

      const startTime = Date.now();

      // Detect face
      const result = await faceapi
        .detectSingleFace(videoEl, options)
        .withFaceLandmarks(true);

      // Update performance stats
      const timeTaken = Date.now() - startTime;
      updateTimeStats(timeTaken);

      // Handle detection result
      if (result) {
        logger.info("Face detected!");
        if (result.landmarks) {
          logger.info("Landmarks available, rendering...");
        } else {
          logger.error("Face detected but no landmarks!");
        }
        canvasRenderer.render(result, videoEl);
        faceDetection.extractEyePositions(result.landmarks);
        logger.success("Face detected - eyes tracked");
      } else {
        canvasRenderer.clear();
        logger.info("No face detected");
      }
    } catch (error) {
      logger.error(`Detection error: ${error.message}`);
      console.error("Full error details:", error);
    }

    // Small delay to prevent blocking
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  logger.info(
    `Detection loop exited after ${iterationCount} iterations. isDetecting: ${isDetecting}, paused: ${videoEl.paused}, ended: ${videoEl.ended}`
  );
}

// Stop detection
function stopDetection() {
  isDetecting = false;
  videoController.stopVideo();
  canvasRenderer.clear();

  uiManager.updateStatus("Detection stopped");
  uiManager.setButtonsState({ startDisabled: false, stopDisabled: true });
  logger.info("Detection stopped");
}

// Update performance statistics
function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30);
  const avgTimeInMs =
    forwardTimes.reduce((total, t) => total + t) / forwardTimes.length;
  const fps = Math.round(1000 / avgTimeInMs);
  logger.info(`Processing time: ${Math.round(avgTimeInMs)}ms, FPS: ${fps}`);
}

// Initialize on page load
window.addEventListener("load", init);
