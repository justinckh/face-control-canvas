export class Logger {
  constructor() {
    this.loggedRange = false;
  }

  info(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  success(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}]  ${message}`);
  }

  error(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`[${timestamp}]  ${message}`);
  }

  setCoordinateRangeLogged(value) {
    this.loggedRange = value;
  }

  getCoordinateRangeLogged() {
    return this.loggedRange;
  }
}
