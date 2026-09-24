# Remote Desktop — one Windows PC → Chromebook (browser client)

A single Windows PC runs the Node.js server and is controlled **through the
browser** from any device — including a Chromebook — over your local network or
the internet. No second PC, no clouds, no browser add-ons on the Chromebook.

```
Windows PC (host)                      Chromebook / phone / laptop
  |  Node server :6080  |                 |  open client URL
  |  (serves file)      |--- HTTP --->    |
  |  VNC :5900 <---      |                 |  (VNC password)
  |  TightVNC + Chrome   |--- VNC frames ->|
```

- **Server side:** Node.js (`server/server.js`) → serves the noVNC client and
  bridges WebSocket → VNC on the same Windows PC.
- **VNC side:** TightVNC Server on Windows → connects to the Chromebook's
  built-in **Serial/LVDS** or via a Chrome app (see setup below).
- **Control side:** any device with a browser can open the client.

---

## 0. What you need (one Windows PC)

| Item | What for |
|---|---|
| Windows 10/11 PC | Runs Node.js + TightVNC |
| Chromebook | The display/mouse/keyboard you're controlling (via VNC) |
| Node.js 18+ (LTS) | The server that bridges the browser ↔ VNC |
| TightVNC (or UltraVNC) | The VNC server that reaches the Chromebook |
| Any browser on the Chromebook | The noVNC client — no extension needed |

> Use the **same Windows PC** as the server. The Chromebook connects *to* it,
> not the other way around.

---

## 1. Install the VNC server on Windows (reaches the Chromebook)

1. Install [TightVNC Server](https://www.tightvnc.com/) (or UltraVNC).
2. Open **TightVNC Server** → **TightVNC Server Options** → **Users**.
3. Add a **VNC password**. Use a long one — it's the only thing protecting the
   Chromebook you're controlling.
4. Important: TightVNC listens on port **5900**. The Node server expects this.

> ✅ If you're already running a VNC server, skip to step 2. Set VNC_HOST/
> VNC_PORT in step 2.1 if it differs.

---

## 2. Install the Node.js server on the same Windows PC

1. Download and install **Node.js 18+ LTS** from
   <https://nodejs.org> (check "Add to PATH").
2. Open **Command Prompt** (or PowerShell) and run:

   ```bat
   cd remote-desktop
   npm install
   start /b node server\server.js
   ```

3. Windows Firewall might ask to allow `node.exe` through. **Allow it** (private
   networks). This opens port 6080.

You should see:

```
Remote desktop server listening on 0.0.0.0:6080
VNC bridge -> 127.0.0.1:5900
```

### Optional: change ports (only if 5900/6080 clash)

```bat
set PORT=6080
set VNC_PORT=5900
start /b node server\server.js
```

---

## 3. Connect the Chromebook to this Windows PC (step by step)

The Windows PC must be able to reach the Chromebook. Two ways:

### A. Same Wi‑Fi (easiest, no cloud)

1. Put both the Windows PC and the Chromebook on the **same Wi‑Fi network**.
2. Find the Windows PC's IP:

   ```bat
   ipconfig
   ```

   Look for **IPv4 address** (e.g. `192.168.1.42`).

3. From the Chromebook browser, open:

   ```
   http://<PC-IP>:6080/remote-desktop.html
   ```

### B. Remote (different network / travel) — Cloudflare Tunnel (recommended)

1. Install the Cloudflare Tunnel CLI on Windows:

   ```bat
   winget install cloudflare.cloudflared
   cloudflared tunnel login
   ```

2. Run the tunnel, forwarding `localhost:6080` (the Node server) to the
   internet:

   ```bat
   cloudflared tunnel run --url http://localhost:6080
   ```

3. You get a free public URL like:

   ```
   https://random-name.trycloudflare.com
   ```

4. Open that URL in the Chromebook browser (or any device).

> 💡 Free Cloudflare Quick Tunnels rotate approximately every 24 hours. If you
> need a permanent URL, see the note at the end of this guide.

---

## 4. Control the Chromebook from the client

1. Open the client URL from step 3 (Windows PC or any device).
2. The address field is pre-filled with `wss://localhost:6080/websockify`.
3. **Click Connect**.
4. Enter the VNC password from step 1.3 and click **OK**.
5. The Chromebook's desktop appears in the browser. Mouse and keyboard are
   passed through.

The client also has:

- **Ctrl+Alt+Del** — sends Ctrl+Alt+Del to the Chromebook
- **Fullscreen** — toggle full-screen mode
- **Scale to fit** — resize the screen to fit your window (on by default)

> ⚠️ Chromebooks don't let you connect over a normal Ethernet LAN. If the
> Chromebook is on a different network, the Cloudflare tunnel (step 3B) is
> required. Inside the same Wi‑Fi, use the LAN URL from step 3A.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `Connection refused` | TightVNC is not running, or VNC password is wrong |
| `ERR_CONNECTION_REFUSED` from the Chromebook | Node server not running on the PC, or Windows Firewall blocked `node.exe` |
| `ERR_CONNECTION_TIMED_OUT` | PC and Chromebook not on the same Wi‑Fi (use the tunnel) |
| Chromebook page stays at `chrome://` or an error | Chromebook's Remote Desktop / VNC support not enabled — see below |
| Screen is black after connecting | VNC password wrong; or Chromebook's display is sleeping |
| Mouse/keyboard stop working after a few seconds | Chromebook went to sleep; wake it or disable auto-sleep |

### Chromebook side

- Make sure the Chromebook is **on** and signed in.
- If you want a simpler VNC target, you can run a VNC server **inside** the
  Chromebook (e.g. a browser extension or Android VNC app on a Chromebook) and
  point the client at it instead of the Windows PC. The rest of this guide
  stays the same.

---

## 6. Security checklist

- [ ] VNC password is long and unique
- [ ] Windows Firewall allows `node.exe` (port 6080) only on private networks
- [ ] Only share the client URL with people you trust
- [ ] Use the Cloudflare tunnel if the Chromebook is on a different network

> ⚠️ No client-side login gate was added because it's trivial to bypass in the
> browser. Security rests on the VNC password + private URL.

---

## 7. Quick reference

```bat
# 1. Windows: install Node.js 18+ and TightVNC Server
# 2. Windows: start the server
cd remote-desktop
npm install
start /b node server\server.js

# 3. Windows: start the tunnel (only if Chromebook is on another network)
cloudflared tunnel run --url http://localhost:6080

# 4. From the Chromebook (same Wi‑Fi or tunnel):
http://<PC-IP>:6080/remote-desktop.html
#    or https://random-name.trycloudflare.com
```

---

## 8. Project files

```
remote-desktop/
├── package.json          # Node project manifest, "npm install"
├── server/
│   └── server.js         # Serves the client; bridges WebSocket → VNC
└── remote-desktop.html   # The noVNC client (only file a browser needs)
README.md                 # This file
```

> This project intentionally keeps everything on one machine. The Node server
> serves the client and the VNC server runs on the same Windows PC — the
> Chromebook just opens a browser URL.
