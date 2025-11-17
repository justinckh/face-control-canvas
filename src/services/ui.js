export class UIManager {
  constructor() {
    this.statusElement = document.getElementById("status");
    this.startBtn = document.getElementById("startBtn");
    this.stopBtn = document.getElementById("stopBtn");
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = `Status: ${message}`;
    }
  }

  setButtonsState({ startDisabled = false, stopDisabled = false }) {
    if (this.startBtn) {
      this.startBtn.disabled = startDisabled;
    }
    if (this.stopBtn) {
      this.stopBtn.disabled = stopDisabled;
    }
  }
}
