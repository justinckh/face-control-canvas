import { Logger } from "../utils/logger.js";

export class FaceDetectionService {
  constructor(logger) {
    this.logger = logger || console;
  }

  async loadModels() {
    // Load Tiny Face Detector for faster performance
    // In Vite, public folder files are served from root "/"
    await faceapi.loadTinyFaceDetectorModel("/");
    this.logger.success("Tiny Face Detection model loaded");

    // Load tiny face landmark model
    await faceapi.loadFaceLandmarkTinyModel("/");
    this.logger.success("Tiny Face Landmark model loaded");
  }

  extractEyePositions(landmarks) {
    if (!landmarks) return null;

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate eye centers
    const leftEyeCenter = faceapi.utils.getCenterPoint(leftEye);
    const rightEyeCenter = faceapi.utils.getCenterPoint(rightEye);

    // Log coordinate range info (only first time)
    if (!this.logger.getCoordinateRangeLogged()) {
      console.log("=== COORDINATE SYSTEM INFO ===");
      const videoEl = document.getElementById("inputVideo");
      const canvas = document.getElementById("overlay");
      console.log(
        `Video element size: ${videoEl.offsetWidth} x ${videoEl.offsetHeight}`
      );
      console.log(`Canvas size: ${canvas.width} x ${canvas.height}`);
      console.log(`X coordinate range: 0 to ${canvas.width}`);
      console.log(`Y coordinate range: 0 to ${canvas.height}`);
      console.log("=== COORDINATE SYSTEM INFO ===");
      this.logger.setCoordinateRangeLogged(true);
    }

    this.logger.success(
      `Left Eye Center: (${Math.round(leftEyeCenter.x)}, ${Math.round(
        leftEyeCenter.y
      )})`
    );
    this.logger.success(
      `Right Eye Center: (${Math.round(rightEyeCenter.x)}, ${Math.round(
        rightEyeCenter.y
      )})`
    );

    // Log individual eye points
    leftEye.forEach((point, index) => {
      this.logger.info(
        `Left Eye Point ${index}: (${Math.round(point.x)}, ${Math.round(
          point.y
        )})`
      );
    });

    rightEye.forEach((point, index) => {
      this.logger.info(
        `Right Eye Point ${index}: (${Math.round(point.x)}, ${Math.round(
          point.y
        )})`
      );
    });

    return {
      leftEye,
      rightEye,
      leftEyeCenter,
      rightEyeCenter,
    };
  }
}
