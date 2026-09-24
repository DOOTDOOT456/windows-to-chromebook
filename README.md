# Remote Desktop — loadable into about:blank

Self-hosted remote desktop: a single HTML file (`remote-desktop.html`) acts as the
noVNC client, and a small Node.js server on your Windows PC bridges it to a local
VNC server. Because the client is one file, you can open it from anywhere —
including `about:blank` — as long as the server is reachable over the internet.

---

## The 3-step flow

```
Your browser (laptop)        Freebuff/Cloudflare Tunnel           Windows PC
      |                             |                                   |
      |--- https://pc.your-domain.com/remote-desktop.html --->|           |
      |<--- (browser receives the file)----------------------|  node server.js |
      |                                                    |  (port 6080)  |
      |--- wss://pc.your-domain.com/websockify --->|          |             |
      |<--- VNC frames over WebSocket ------------------|  TightVNC Server  |
      |<--- (view your desktop)----------------------|  (port 5900)      |
```

---

## 1. On your Windows PC

### a) Start the Node server

```bat
cd remote-desktop
npm install
start /b node server\server.js
```

That serves `remote-desktop.html` on `http://localhost:6080` and bridges
WebSocket `/websockify` → `localhost:5900` (VNC). You can also set:

| Env var | Default | What it does |
|---|---|---|
| `PORT` | `6080` | Port the server listens on |
| `VNC_HOST` | `127.0.0.1` | Where the VNC server listens (keep `127.0.0.1` for safety) |
| `VNC_PORT` | `5900` | VNC server port |

### b) Start a VNC server

Install [TightVNC Server](https://www.tightvnc.com/) (or UltraVNC) and set a
**strong VNC password**. It listens on port `5900`.

> 💡 Don't change where VNC listens. The Node server only needs to reach this
> port.

### c) Open optional desktop shortcuts

Create two shortcuts on your desktop/bایلر:

- **Start Remote Desktop**: `cmd /c cd /d "%USERPROFILE%\Documents\remote-desktop" && npm install && start /b node server\server.js`
- **Stop Remote Desktop**: `taskkill /f /im node.exe`

---

## 2. From anywhere (laptop/phone/tablet)

### Option A — Use your own domain (recommended)

1. Install the Cloudflare Tunnel on Windows:

   ```bat
   winget install cloudflare.cloudflared
   cloudflared tunnel login
   cloudflared tunnel create remote-desktop
   cloudflared tunnel route dns remote-desktop pc.your-domain.com
   ```

2. Create `remote-desktop\config.yml`:

   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL_ID>.json
   ingress:
     - hostname: pc.your-domain.com
       service: http://localhost:6080
     - service: http_status:404
   ```

3. Run the tunnel:

   ```bat
   cloudflared tunnel run remote-desktop
   ```

4. Open `https://pc.your-domain.com/remote-desktop.html` from any device.

### Option B — Skip the domain

If you just want to test from the same Wi-Fi, open
`http://<PC-ip>:6080/remote-desktop.html` on your device. No tunnel needed, but
it only works on your local network.

---

## 3. Load the client from `about:blank` (no server needed for viewing)

The client file itself is a standalone web page. To view it inside a `about:blank`
tab, paste this into the DevTools console (`F12`) of the blank tab:

```js
document.write('<iframe src="https://YOUR-HOST/remote-desktop.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>');
```

Replace `YOUR-HOST` with your URL (e.g. `https://pc.your-domain.com`).
Alternatively, bookmark the file and open it directly — same result.

> ⚠️ `about:blank` is a blank page, so a real browser (or the console trick above)
> is needed to render the client. The file is meant to be served over HTTPS.

---

## 4. Goodbye, `about:blank`

The client auto-connects when the URL ends with `#wss://...`:

```
https://pc.your-domain.com/remote-desktop.html#wss://pc.your-domain.com/websockify
```

Click **Connect** and enter the VNC password to start typing on your PC.

---

## Security checklist

- [ ] Node server bound to `127.0.0.1` only (default). Never expose port 6080 or
      5900 to the internet.
- [ ] VNC password is strong.
- [ ] Cloudflare Tunnel used instead of port-forwarding.
- [ ] Optional: Cloudflare Access (Zero Trust) in front of `pc.your-domain.com`.

---

## Project files

```
remote-desktop/
├── package.json          # Node project manifest, "npm install"
├── server/
│   └── server.js         # Serves the client; bridges WebSocket → VNC
└── remote-desktop.html   # The noVNC client (the only file the browser needs)
README.md                 # This file
```
