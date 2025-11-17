import { Logger } from "../utils/logger.js";

export class CanvasRenderer {
  constructor(logger) {
    this.logger = logger || console;
    this.canvas = null;
    this.ctx = null;
  }

  initialize(videoElement) {
    this.canvas = document.getElementById("overlay");
    this.ctx = this.canvas.getContext("2d");
  }

  render(result, videoElement) {
    if (!this.canvas || !this.ctx) {
      this.initialize(videoElement);
    }

    // Validate video dimensions
    if (videoElement.offsetWidth === 0 || videoElement.offsetHeight === 0) {
      this.logger.error(
        "Cannot render: Video dimensions are 0. Video may not be loaded yet."
      );
      return;
    }

    // Set canvas to match video display dimensions
    this.canvas.width = videoElement.offsetWidth;
    this.canvas.height = videoElement.offsetHeight;

    // Validate canvas dimensions
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      this.logger.error(
        `Cannot render: Canvas dimensions are 0 (${this.canvas.width}x${this.canvas.height})`
      );
      return;
    }

    // Match dimensions
    const dims = faceapi.matchDimensions(this.canvas, videoElement, true);

    // Resize results to match canvas
    const resizedResult = faceapi.resizeResults(result, dims);

    // Validate landmarks
    if (!resizedResult.landmarks) {
      this.logger.error("Cannot render: No landmarks in result");
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw face detection box for debugging (to verify detection is working)
    try {
      // In face-api.js, the detection box is at the top level of the result
      this.drawDetectionBox(resizedResult);
    } catch (error) {
      this.logger.error(`Error drawing detection box: ${error.message}`);
    }

    // Draw eye positions
    try {
      this.drawEyePositions(resizedResult.landmarks);
    } catch (error) {
      this.logger.error(`Error drawing eye positions: ${error.message}`);
      console.error("Drawing error:", error);
    }
  }

  clear() {
    if (this.ctx && this.canvas.width && this.canvas.height) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawDetectionBox(result) {
    // In face-api.js, the detection box can be accessed via result.detection or result.box
    const box = result.detection?.box || result.box;
    if (!box) {
      return;
    }

    // Draw detection box in cyan for debugging
    this.ctx.strokeStyle = "#00ffff";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw score if available
    const score = result.detection?.score || result.score;
    if (score !== undefined) {
      this.ctx.fillStyle = "#00ffff";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(
        `Score: ${score.toFixed(2)}`,
        box.x,
        Math.max(20, box.y - 5)
      );
    }
  }

  drawEyePositions(landmarks) {
    if (!landmarks) {
      this.logger.error("Cannot draw: No landmarks provided");
      return;
    }

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Validate eye data
    if (
      !leftEye ||
      !rightEye ||
      leftEye.length === 0 ||
      rightEye.length === 0
    ) {
      this.logger.error(
        `Cannot draw: Invalid eye data. Left: ${leftEye?.length || 0}, Right: ${
          rightEye?.length || 0
        }`
      );
      return;
    }

    // Debug: Log the first point of each eye (only first time)
    if (leftEye.length > 0 && rightEye.length > 0) {
      this.logger.info(
        `Drawing eyes - Canvas: ${this.canvas.width}x${
          this.canvas.height
        }, Left: (${leftEye[0].x.toFixed(1)}, ${leftEye[0].y.toFixed(
          1
        )}), Right: (${rightEye[0].x.toFixed(1)}, ${rightEye[0].y.toFixed(1)})`
      );
    }

    // Draw left eye points (green)
    this.ctx.fillStyle = "#00ff00";
    leftEye.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      this.ctx.fill();
    });

    // Draw right eye points (red)
    this.ctx.fillStyle = "#ff0000";
    rightEye.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      this.ctx.fill();
    });

    // Draw eye centers (blue)
    const leftEyeCenter = faceapi.utils.getCenterPoint(leftEye);
    const rightEyeCenter = faceapi.utils.getCenterPoint(rightEye);

    this.ctx.fillStyle = "#0000ff";
    this.ctx.beginPath();
    this.ctx.arc(leftEyeCenter.x, leftEyeCenter.y, 12, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(rightEyeCenter.x, rightEyeCenter.y, 12, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw coordinate labels above eye centers
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 20px Arial";
    this.ctx.textAlign = "center";

    // Left eye label
    this.ctx.fillText(
      `(${Math.round(leftEyeCenter.x)}, ${Math.round(leftEyeCenter.y)})`,
      leftEyeCenter.x,
      leftEyeCenter.y - 20
    );

    // Right eye label
    this.ctx.fillText(
      `(${Math.round(rightEyeCenter.x)}, ${Math.round(rightEyeCenter.y)})`,
      rightEyeCenter.x,
      rightEyeCenter.y - 20
    );

    // Draw eye distance line (yellow)
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(leftEyeCenter.x, leftEyeCenter.y);
    this.ctx.lineTo(rightEyeCenter.x, rightEyeCenter.y);
    this.ctx.stroke();

    // Draw eye distance label in the middle of the line
    const midX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const midY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const eyeDistance = faceapi.utils.euclideanDistance(
      leftEyeCenter,
      rightEyeCenter
    );

    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "bold 18px Arial";
    this.ctx.fillText(`${Math.round(eyeDistance)}px`, midX, midY - 10);
  }
}
