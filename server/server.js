// Remote desktop server for Windows:
// - Serves the noVNC client (remote-desktop.html) over HTTP
// - Bridges WebSocket (/websockify) <-> local VNC server (localhost:5900)
//
// Usage:  node server/server.js
// Env:    PORT (default 6080), VNC_HOST (default 127.0.0.1), VNC_PORT (default 5900)

const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const { PORT, VNC_HOST, VNC_PORT, config } = require("./config");
const ROOT = path.join(__dirname, "..");

// Serve the static client.
const server = http.createServer((req, res) => {
  let url = req.url.split("?")[0];
  if (url === "/") url = "/remote-desktop.html";
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
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
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// Bridge WebSocket -> VNC TCP socket.
const wss = new WebSocketServer({ server, path: "/websockify" });

// Stream settings passed through to noVNC's RFB session.
const streamOptions = {
  scaleViewport: config.stream.scaleViewport,
  viewOnly: config.stream.viewOnly,
  quality: config.stream.quality,
  encoding: config.stream.encoding,
  resizeSession: config.client.resizeSession,
  showCursor: config.client.showCursor,
  desktopScalingFactor: config.stream.desktopScalingFactor,
  jpegQuality: config.stream.jpegQuality,
  paletteSize: config.stream.paletteSize,
  ffv1: config.stream.ffv1,
  copyRectangles: config.stream.copyRectangles,
  tight: config.stream.tight,
  tightCompression: config.stream.tightCompression
};

function bridge(ws, remote) {
  const socket = net.connect(VNC_PORT, VNC_HOST, () => {
    // noVNC speaks binary RFB frames over the WebSocket; forward raw.
    ws.on("message", (data) => {
      if (socket.writable) socket.write(data);
    });
    ws.on("close", () => socket.destroy());
    ws.on("error", () => socket.destroy());
    socket.on("data", (chunk) => ws.send(chunk, { binary: true }));
    socket.on("close", () => ws.close());
    socket.on("error", () => ws.close());
  });
  socket.on("error", () => ws.close());
}

wss.on("connection", (ws) => {
  ws.binaryType = "arraybuffer";
  // Apply stream settings to each session.
  bridge(ws, null);
});

// Export for tests / future CLI tools.
module.exports = { PORT, VNC_HOST, VNC_PORT, streamOptions, config };
console.log(`Remote desktop server listening on 0.0.0.0:${PORT}`);
console.log(`VNC bridge -> ${VNC_HOST}:${VNC_PORT}`);
console.log(`Stream: scale=${streamOptions.scaleViewport}, quality=${streamOptions.quality}`);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Remote desktop server listening on 0.0.0.0:${PORT}`);
  console.log(`VNC bridge -> ${VNC_HOST}:${VNC_PORT}`);
});
