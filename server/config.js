// Loads server settings from config.json (or config.example.json), with
// sensible defaults. Env vars (PORT, VNC_HOST, VNC_PORT) always win.
const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  server: { port: 6080, host: "127.0.0.1" },
  vnc: { host: "127.0.0.1", port: 5900 },
  stream: {
    scaleViewport: true,
    viewOnly: false,
    quality: 6,
    encoding: "auto",
    desktopScalingFactor: 1,
    jpegQuality: 6,
    paletteSize: 0,
    ffv1: false,
    copyRectangles: false,
    tight: false,
    tightCompression: false
  },
  control: {
    sendCtrlAltDel: true,
    sendAltTab: true,
    sendAltF4: true,
    sendWinD: true,
    sendEsc: true,
    sendEnter: true,
    sendSpace: true,
    sendArrowKeys: true,
    sendNumericPad: true,
    showSendKeys: true,
    showFullscreen: true
  },
  client: {
    showCursor: true,
    waitForWindowResponse: false,
    hostname: "localhost",
    password: "",
    port: 5900,
    showDotCursor: false,
    shared: false,
    cursor: false,
    resizeSession: false
  }
};

function loadConfig() {
  const candidates = ["config.json", "config.example.json", path.join(__dirname, "config.json")];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...(parsed || {}) };
    } catch {
      // try next
    }
  }
  return { ...DEFAULTS };
}

const config = loadConfig();

const PORT = Number(process.env.PORT) || config.server.port;
const VNC_HOST = process.env.VNC_HOST || config.vnc.host;
const VNC_PORT = Number(process.env.VNC_PORT) || config.vnc.port;

module.exports = { PORT, VNC_HOST, VNC_PORT, config };
