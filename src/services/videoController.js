import { Logger } from "../utils/logger.js";

export class VideoController {
  constructor(logger) {
    this.logger = logger || console;
    this.stream = null;
  }

  async startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: "user",
      },
    });

    const videoEl = document.getElementById("inputVideo");
    videoEl.srcObject = stream;

    // Ensure video plays
    try {
      await videoEl.play();
      this.logger.info("Video autoplay started");
    } catch (error) {
      this.logger.error(`Video autoplay failed: ${error.message}`);
    }

    this.stream = stream;

    return stream;
  }

  stopVideo() {
    const videoEl = document.getElementById("inputVideo");

    if (videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoEl.srcObject = null;
    }

    this.stream = null;
  }

  getVideoElement() {
    return document.getElementById("inputVideo");
  }
}
