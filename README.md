# Remote Desktop — loadable into about:blank

Self-hosted remote desktop: a single HTML file (`remote-desktop.html`) acts as the
noVNC client, and a small Node.js server on your Windows PC bridges it to a local
VNC server. Because the client is one file, you can open it from anywhere —
including `about:blank` — as long as the server is reachable over the internet.

Anyone can use this guide. It covers:

1. [What you need](#1-what-you-need)
2. [Step A — On your Windows PC: start the server](#2-step-a--on-your-windows-pc-start-the-server)
3. [Step B — Start the VNC server](#3-step-b--start-the-vnc-server)
4. [Step C — Make it reachable from anywhere](#4-step-c--make-it-reachable-from-anywhere)
5. [Step D — Connect from your phone/laptop](#5-step-d--connect-from-your-phone-laptop)
6. [About:blank mode (no URL needed)](#6-aboutblank-mode-no-url-needed)
7. [Troubleshooting](#7-troubleshooting)
8. [Security checklist](#8-security-checklist)
9. [Project files](#9-project-files)

---

## 1. What you need

| What | Where | What you need |
|---|---|---|
| **Windows PC** | Your home computer | Node.js (18+), admin rights for the tunnel |
| **Browser** | Laptop/phone/tablet | Chrome, Edge, or any modern browser |
| **Cloudflare account** | Free | Only if you want to reach it from the internet |

No other installations required. Everything else is already in this repo.

---

## 2. Step A — On your Windows PC: start the server

> The server bridges WebSocket → VNC. It serves `remote-desktop.html` and forwards
> your keyboard/mouse over a secure WebSocket to the VNC server.

Open **Command Prompt** (or PowerShell) on your Windows PC and run:

```bat
cd remote-desktop
npm install
start /b node server\server.js
```

You should see:

```
Remote desktop server listening on 0.0.0.0:6080
VNC bridge -> 127.0.0.1:5900
```

### Configuring the server (optional)

| Env var | Default | What it does | Example |
|---|---|---|---|
| `PORT` | `6080` | Port the server listens on | `PORT=8080 node server\server.js` |
| `VNC_HOST` | `127.0.0.1` | Where the VNC server lives (keep `127.0.0.1`) | `VNC_HOST=192.168.1.50` |
| `VNC_PORT` | `5900` | VNC server port | `VNC_PORT=5901` |

### Stop the server later

```bat
taskkill /f /im node.exe
```

---

## 3. Step B — Start the VNC server

The VNC server is what actually shows your desktop. Install
[TightVNC Server](https://www.tightvnc.com/) (or UltraVNC) and set a
**strong password**. It listens on port `5900`.

> Leave `VNC_HOST=127.0.0.1` and `VNC_PORT=5900` unchanged. The Node server only
> needs to reach this local port.

Test it: on the Windows PC open a browser and go to
`http://localhost:6080/remote-desktop.html` — the client should load. Note: the
client won't connect until you press **Connect** (VNC password not set → it may
show a credentials-required screen).

---

## 4. Step C — Make it reachable from anywhere

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

4. Test from a different machine:

   ```
   https://pc.your-domain.com/remote-desktop.html
   ```

### Option B — Skip the domain (same Wi‑Fi only)

If you're testing from another device on the same router, open

```
http://<PC-IP>:6080/remote-desktop.html
```

(e.g. `http://192.168.1.42:6080/remote-desktop.html`). No tunnel needed, but it
stops working the moment you leave the Wi‑Fi.

---

## 5. Step D — Connect from your phone/laptop

### With your domain

1. Open `https://pc.your-domain.com/remote-desktop.html` from any device.
2. **Click Connect** (the server already fills the address with
   `wss://pc.your-domain.com/websockify`).
3. Enter your **VNC password** when prompted and click **OK**.
4. You now control your PC's desktop from the browser.

### From the same Wi‑Fi

```
http://<PC-IP>:6080/remote-desktop.html
```

### Via URL (auto-connect)

Any URL ending in `#wss://...` auto-fills and auto-connects:

```
https://pc.your-domain.com/remote-desktop.html#wss://pc.your-domain.com/websockify
```

### Quick buttons inside the client

| Button | What it does |
|---|---|
| **Connect** | Connects to the address in the field |
| **Use example** | Fills `wss://pc.your-domain.com/websockify` and connects immediately |
| **Disconnect** | Closes the session |
| **Ctrl+Alt+Del** | Sends Ctrl+Alt+Del to the PC |
| **Fullscreen** | Toggles full-screen mode |
| **Scale to fit** | Resize the screen to fit your window (on by default) |

> Tip: the browser blocks the window from receiving keyboard/mouse input while
> the tab is in the background. Keep the tab focused.

---

## 6. About:blank mode (no URL needed)

`about:blank` is a blank page — it has no address bar and no page you can paste
into. To view the client inside it, paste this into the **DevTools console**
(`F12` → **Console**) of the blank tab:

```js
document.write('<iframe src="https://YOUR-HOST/remote-desktop.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>');
```

Then replace `YOUR-HOST` with your URL, e.g.
`https://pc.your-domain.com`. The iframe fills the whole tab and the client
connects automatically via the `#wss://` fragment.

### Alternative: bookmark the file

Bookmark `https://pc.your-domain.com/remote-desktop.html` and open it anywhere —
the client works exactly the same. The `about:blank` trick is only needed if you
want it to run without a normal page around it.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to the remote computer` | Server not running or wrong `PORT`/`VNC_HOST` |
| `Connection refused` | VNC server not installed/started, or wrong `VNC_PORT` |
| `502 Bad Gateway` through the tunnel | Tunnel config `service` points at the wrong port — check `config.yml` |
| `No VNC password` prompt never appears | VNC password missing — set one in TightVNC after install |
| Works on Wi‑Fi, not outside | Use Cloudflare Tunnel (Option A), not port-forwarding |
| Client loads but screen is black | Check the address field has a `wss://` URL and the password is correct |
| "Site can't be reached" | Firewall on Windows is blocking the tunnel — allow `cloudflared` in your firewall |

### Logs

* Node server: open the Command Prompt window where you ran `node server\server.js`
* VNC server: TightVNC tray icon → **TightVNC Server** → **Log**
* Tunnel: `cloudflared tunnel run remote-desktop` prints its own logs

---

## 8. Security checklist

- [ ] VNC password is strong
- [ ] Node server bound to `127.0.0.1` only (default)
- [ ] Port 6080 and 5900 are never exposed directly to the internet
- [ ] Cloudflare Tunnel used instead of port-forwarding
- [ ] Optional: Cloudflare Access (Zero Trust) in front of `pc.your-domain.com`
- [ ] Only share your URL with people you trust

> ⚠️ No client-side login (like a password gate) was added because it can be
> bypassed. The security here comes from a private URL behind a tunnel + strong
> VNC password.

---

## 9. Project files

```
remote-desktop/
├── package.json              # Node project manifest, "npm install"
├── server/
│   └── server.js             # Serves the client; bridges WebSocket → VNC
└── remote-desktop.html       # The noVNC client (the only file the browser needs)
README.md                     # This file
```

### Quick reference

```bat
# 1. Windows: start the server
cd remote-desktop
npm install
start /b node server\server.js

# 2. Windows: start TightVNC Server, set a password, port 5900

# 3. Windows: start the tunnel (Option A only)
cloudflared tunnel run remote-desktop

# 4. Anywhere: open
https://pc.your-domain.com/remote-desktop.html   # or add #wss://... for auto-connect
```
