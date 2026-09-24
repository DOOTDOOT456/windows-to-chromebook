// Remote desktop server for Windows:
// - Serves the noVNC client (remote-desktop.html) over HTTP
// - Bridges WebSocket (/websockify) <-> local VNC server (localhost:5900)
//
// Usage:  node server/server.js
// Env:    PORT (default 6080), VNC_HOST (default 127.0.0.1), VNC_PORT (default 5900)

// @ts-ignore - require returns untyped node modules
const http = require("http");
// @ts-ignore
const net = require("net");
// @ts-ignore
const fs = require("fs");
// @ts-ignore
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const { PORT, VNC_HOST, VNC_PORT, config } = require("./config");

const ROOT = path.resolve(__dirname, "..");

// Resolve a requested client path and ensure it stays inside ROOT.
// path.resolve(ROOT, url) normalizes ".." segments, so this is strict
// against the previous `path.join(ROOT, url)` + startsWith check.
/**
 * @param {string} url
 */
function resolveClientFile(url) {
  const decoded = decodeURIComponent(url);
  const file = path.resolve(ROOT, decoded);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    return null;
  }
  return file;
}

// Serve the static client.
// @ts-ignore - Node built-in http types are inherently partial
const server = http.createServer((req, res) => {
  let url = req.url ? req.url.split("?")[0] : "/";
  if (url === "/") url = "/remote-desktop.html";
  const file = resolveClientFile(url);
  if (!file) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  /**
   * @param {any} err
   * @param {Buffer} data
   */
  const readFileCb = (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, { "Content-Type": (/** @type {Record<string,string>} */ (types))[ext] || "application/octet-stream" });
    res.end(data);
  };
  fs.readFile(file, readFileCb);
});

// Bridge WebSocket -> VNC TCP socket.
/**
 * @param {import("ws").WebSocket} ws
 */
function bridge(ws) {
  const socket = net.connect(VNC_PORT, VNC_HOST, () => {
    // noVNC speaks binary RFB frames over the WebSocket; forward raw.
    ws.on("message", (data) => {
      if (socket.writable) socket.write(data);
    });
    ws.on("close", () => destroyAndClose());
    ws.on("error", () => destroyAndClose());
    /** @param {any} chunk */
    const onData = (chunk) => ws.send(chunk, { binary: true });
    socket.on("data", /** @type {any} */ (onData));
    socket.on("close", () => destroyAndClose());
    socket.on("error", () => destroyAndClose());
  });

  function destroyAndClose() {
    // socket may not yet exist if net.connect threw before the callback.
    if (!socket || socket.destroyed) return;
    socket.destroy();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  }

  socket.on("error", () => destroyAndClose());
}

// Compute stream options once from the loaded config.
/**
 * @param {{ stream: Record<string, any>, client: Record<string, any> }} cfg
 */
function buildStreamOptions(cfg) {
  return {
    scaleViewport: cfg.stream.scaleViewport,
    viewOnly: cfg.stream.viewOnly,
    quality: cfg.stream.quality,
    encoding: cfg.stream.encoding,
    resizeSession: cfg.client.resizeSession,
    showCursor: cfg.client.showCursor,
    desktopScalingFactor: cfg.stream.desktopScalingFactor,
    jpegQuality: cfg.stream.jpegQuality,
    paletteSize: cfg.stream.paletteSize,
    ffv1: cfg.stream.ffv1,
    copyRectangles: cfg.stream.copyRectangles,
    tight: cfg.stream.tight,
    tightCompression: cfg.stream.tightCompression
  };
}

const streamOptions = buildStreamOptions(config);
const wss = new WebSocketServer({ server, path: "/websockify" });

wss.on("connection", (ws) => {
  ws.binaryType = "arraybuffer";
  bridge(ws);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Remote desktop server listening on 0.0.0.0:${PORT}`);
  console.log(`VNC bridge -> ${VNC_HOST}:${VNC_PORT}`);
  console.log(`Stream: scale=${streamOptions.scaleViewport}, quality=${streamOptions.quality}`);
});

// Export for tests / future CLI tools.
module.exports = { PORT, VNC_HOST, VNC_PORT, streamOptions, config };
