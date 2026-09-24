# Remote Desktop — one Windows PC → Chromebook (browser client)

A single Windows PC runs the **Node.js server** and the **VNC server**. Any
device — including a Chromebook — controls it through a browser, over the
internet via a **Cloudflare tunnel**. No installs on the Chromebook, no cloud
apps, no browser extensions.

```
Windows PC (host)                       Chromebook / phone / laptop
  |  Node server :6080  |                 |  open tunnel URL
  |  (serves file)      |--- HTTPS --->   |
  |  VNC :5900 <---      |                 |  (VNC password)
  |  TightVNC + Node     |--- VNC frames ->|
```

- **Server side:** Node.js (`server/server.js`) serves the noVNC client and
  bridges WebSocket → VNC on the same Windows PC.
- **VNC side:** TightVNC Server on Windows (port 5900).
- **Control side:** any browser, no extensions needed.

---

## 0. What you need (one Windows PC)

| Item | What for |
|---|---|
| Windows 10/11 PC | Runs Node.js + TightVNC |
| Chromebook | The device you're controlling (via browser only) |
| Node.js 18+ (LTS) | The server that bridges the browser ↔ VNC |
| TightVNC (or UltraVNC) | The VNC server on Windows |
| **Cloudflare tunnel** | Puts your Windows PC on the internet (free) |

> Everything runs on the Windows PC. The Chromebook only opens a URL.

---

## 1. Install the VNC server on Windows

1. Install [TightVNC Server](https://www.tightvnc.com/) (or UltraVNC).
2. Open **TightVNC Server** → **TightVNC Server Options** → **Users**.
3. Add a **VNC password** (long and unique — this is the only thing protecting
   the Chromebook you're controlling).
4. Confirm it listens on port **5900** (TightVNC's default).

---

## 2. Install the Node.js server on the same Windows PC

1. Install **Node.js 18+ LTS** from <https://nodejs.org> (check **Add to PATH**).
2. In **Command Prompt** (or PowerShell):

   ```bat
   cd remote-desktop
   npm install
   start /b node server\server.js
   ```

3. Windows Firewall may ask to allow `node.exe` — **Allow it** (private
   networks). This opens port 6080.

You should see:

```
Remote desktop server listening on 0.0.0.0:6080
VNC bridge -> 127.0.0.1:5900
```

> Test on the PC itself: open a browser and go to
> `http://localhost:6080/remote-desktop.html` — the client should load.
> (Connecting needs the tunnel or the password set.)

---

## 3. Make it reachable from anywhere — Cloudflare Tunnel

The tunnel sits on the Windows PC. The Chromebook never touches the PC's IP
directly; it only connects to the public tunnel URL over TLS.

### Quick tunnel (recommended for first setup)

Zero DNS, zero account — Cloudflare gives you a public URL:

```bat
winget install cloudflare.cloudflared
cloudflared tunnel run --url http://localhost:6080
```

You get a URL like:

```
https://random-name.trycloudflare.com
```

### Fixed tunnel (optional — permanent URL)

If you want a stable address, use your own domain (or request a fixed quick
tunnel URL from Cloudflare) and create the tunnel once:

```bat
cloudflared tunnel create remote-desktop
cloudflared tunnel route dns remote-desktop pc.your-domain.com
```

`remote-desktop\config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: pc.your-domain.com
    service: http://localhost:6080
  - service: http_status:404
```

Run it:

```bat
cloudflared tunnel run remote-desktop
```

> ⚠️ Quick tunnels rotate ~24h. Use a fixed tunnel if the URL must not change.

---

## 4. Control the Chromebook from any device

1. On the Chromebook browser, open the tunnel URL:
   `https://random-name.trycloudflare.com` (or `https://pc.your-domain.com`).
2. The address field is pre-filled with `wss://remote-desktop:8080/websockify`
   (the Node server serves `/websockify` for the WebSocket connection).
3. **Click Connect**.
4. Enter the **VNC password** (step 1.3) and click **OK**.
5. The Chromebook's desktop appears in the browser — mouse and keyboard work.

**Client buttons:** Connect, Disconnect, Ctrl+Alt+Del, Fullscreen, Scale to fit.

> ⚠️ Keep the tab focused — Chrome throttles a background tab's mouse/keyboard
> input.

---

## 5. Different network or no installs — what actually works

This is the one path that needs **nothing installed on the Chromebook**:

| Constraint | Only viable option |
|---|---|
| Chromebook on a different network | Cloudflare Quick/Fixed tunnel (step 3) |
| Chromebook can't install any app | Browser is the only UI — only the tunnel works |
| No internet on either side | Local Wi‑Fi only — not possible across networks |

The important detail: the tunnel is **server-side on the Windows PC**. The
Chromebook just opens `https://<tunnel>.trycloudflare.com`, and Cloudflare
forwards that to `localhost:6080` on your PC. Nothing from the Chromebook
ever has to install anything.

If the Chromebook's browser can't reach public internet at all, there is no
install-free solution — you'd need to connect the two devices on the same
network (Windows → Chromebook browser directly, no tunnel).

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Chromebook shows a Cloudflare error | Share the tunnel URL — it must be reachable |
| Page loads but "Cannot connect to server" | VNC password wrong; or Node server not running |
| `ERR_CONNECTION_REFUSED` | `node server\server.js` isn't running, or Firewall blocked it |
| Chromubi/bookmark doesn't connect | Address field must start with `wss://`; check firewall rules |
| Black screen after connecting | Password wrong or Chromebook asleep — wake it |
| Mouse/keyboard stops after a few seconds | Chromebook/Chrome tab went idle — keep it awake or hover |

### Logs

* Node server: the Command Prompt window where you ran `node server\server.js`.
* Tunnel: `cloudflared tunnel run ...` prints its own logs.
* TightVNC: tray icon → **TightVNC Server** → **Log**.

---

## 7. Security checklist

- [ ] VNC password is long and unique
- [ ] Windows Firewall allows `node.exe` (port 6080) only on private networks
- [ ] The tunnel URL is only shared with people you trust
- [ ] Tunnel target is `http://localhost:6080` only (never expose port 5900)

> ⚠️ No client-side login gate was added — it's trivial to bypass in a browser.
> Security rests on the VNC password + a private tunnel URL.

---

## 8. Quick reference

```bat
# 1. Windows: TightVNC Server running on port 5900, strong password
# 2. Windows: start the server
cd remote-desktop
npm install
start /b node server\server.js

# 3. Windows: start the tunnel
cloudflared tunnel run --url http://localhost:6080

# 4. Chromebook browser (anywhere, any device): open
https://random-name.trycloudflare.com
#    (or your fixed tunnel URL)

# 5. Connect, enter the VNC password, done.
```

---

## 9. Project files

```
remote-desktop/
├── package.json          # npm install
├── server/
│   └── server.js         # Node server + WebSocket → VNC bridge
└── remote-desktop.html   # The noVNC client (only file a browser needs)
README.md                 # This file
```
