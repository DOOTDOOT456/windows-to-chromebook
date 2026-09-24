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

### Server configuration

The Node server reads settings from `config.example.json` (or `config.json`):

```json
{
  "server": { "port": 6080, "host": "127.0.0.1" },
  "vnc": { "host": "127.0.0.1", "port": 5900 },
  "stream": { "scaleViewport": true, "quality": 6 },
  "control": { "sendCtrlAltDel": true },
  "client": { "password": "" }
}
```

Every key and its definition lives in the client: open the client and click
**📖 Key definitions** (or add `#defs` to the URL) to see the full list with
type, default, and effect.

Copy `config.example.json` to `config.json` and edit it to your setup. Env
vars (`PORT`, `VNC_HOST`, `VNC_PORT`) always override the file.

You should see:

```
Remote desktop server listening on 0.0.0.0:6080
VNC bridge -> 127.0.0.1:5900
```

> Test on the PC itself: open a browser and go to
> `http://localhost:6080/remote-desktop.html` — the client should load.
> (Connecting needs the tunnel or the password set.)

---

## 3. Cloudflare options for reaching your Windows PC

Your Chromebook needs an internet-accessible URL for the Node server. All of
the following are Cloudflare products and all work with **no installs on the
Chromebook**. Pick the row that matches what you want.

| Option | URL type | Setup | Best for |
|---|---|---|---|
| **Quick tunnel (random)** | `https://<random>.trycloudflare.com` | `cloudflared tunnel run --url http://localhost:6080` | Fastest: one command, no DNS |
| **Quick tunnel (fixed URL)** | `https://<name>.trycloudflare.com` (you pick the name) | Dashboard → Quick Tunnels → Request a fixed URL, then `cloudflared tunnel run --url http://localhost:6080 --subdomain <name>` | No domain, permanent-ish (free plan) |
| **Own domain tunnel** | `https://pc.your-domain.com` | Domain → DNS → Cloudflare tunnel → `config.yml` + `cloudflared tunnel run remote-desktop` | Permanent, clean URL, no rotation |
| **Cloudflare Access** (optional) | Same tunnel URL + identity gate | Tunnel + Access policy → only signed-in users can open the tunnel | Extra security (free for small teams) |
| **Cloudflare Tunnel** (self-hosted alternative) | `https://<your-host>` | Self-host `cloudflared`/`cloudflared` on a second PC | No Cloudflare dependency |

<!-- This project uses Cloudflare Tunnel as the Internet-facing reverse proxy.
The rest of the README covers the 3 tunnel types and the optional Access
layer. -->

The remaining sections show how to run **Option B (fixed quick tunnel)** and
**Option C (own domain)** from a single Windows PC. Quick tunnel (random) is
a one-liner; the own-domain tunnel is the most stable.

---

## 4. Quick tunnel — fastest setup (Option A)

Zero DNS, zero account required. Cloudflare gives you a random public URL:

```bat
winget install cloudflare.cloudflared
cloudflared tunnel run --url http://localhost:6080
```

You get something like `https://random-trycloudflare-com.trycloudflare.com`.
It works but changes URL on every tunnel restart — fine for testing, not for
a permanent remote desktop.

---

## 5. Quick tunnel — fixed URL (Option B)

Request a fixed URL so the address doesn't change between restarts. Two ways:

### B1 — Right in the cloudflared CLI (no dashboard, no signup needed)

```bat
cloudflared tunnel create my-desktop
cloudflared tunnel token -- tunnel-id <TUNNEL_ID>
cloudflared tunnel run --url http://localhost:6080 --subdomain my-desktop
```

Your URL is:

```
https://my-desktop.trycloudflare.com
```

### B2 — Request a fixed URL in the Cloudflare dashboard (free)

1. Open <https://one.dash.cloudflare.com> → **Networks → Tunnels** → **Create a tunnel**.
2. Pick **HTTP** (or **Secure WebSockets**, which we use: `wss://`).
3. Under **Quick Tunnels**, click **Request a fixed URL** and enter a name like
   `my-desktop`.
4. Copy the assigned URL and run:

   ```bat
   cloudflared tunnel run --url http://localhost:6080 --subdomain my-desktop
   ```

> Fixed quick tunnel URLs are approved in the dashboard and can take a few
> minutes. Once approved, they are permanent on the free plan.

---

## 6. Own domain tunnel (most stable, Option C)

If you own a domain (`pc.your-domain.com`), point it at the tunnel. No
Cloudflare-assigned URL, no rotation, fully permanent:

1. **Add the tunnel:**

   ```bat
   cloudflared tunnel create remote-desktop
   cloudflared tunnel token -- tunnel-id <TUNNEL_ID>
   ```

2. **Route DNS:** in the Cloudflare dashboard, add an **A/AAAA or CNAME** record
   for `pc.your-domain.com` pointing at your Cloudflare nameservers (or use
   `cloudflared tunnel route dns remote-desktop pc.your-domain.com`).

3. **Configure the tunnel** (`remote-desktop\config.yml`):

   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL_ID>.json
   ingress:
     - hostname: pc.your-domain.com
       service: http://localhost:6080
     - service: http_status:404
   ```

4. **Run it:**

   ```bat
   cloudflared tunnel run remote-desktop
   ```

5. Open `https://pc.your-domain.com` on the Chromebook.

> ⚠️ Quick tunnels rotate ~24h. Use this own-domain tunnel if the address must
> never change.


---

## 4. Control the Chromebook from anywhere

This is the whole point: the **Chromebook controls your Windows PC**.

1. On the Chromebook browser, open the tunnel URL:
   `https://random-name.trycloudflare.com` (or `https://pc.your-domain.com`).
2. The address field is pre-filled with the noVNC client URL.
3. **Click Connect**.
4. Enter the **VNC password** (step 1.3) and click **OK**.
5. Your **Windows desktop appears in the browser** — you control it with the
   Chromebook's mouse and keyboard.

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

## 10. Configuration reference — every option explained

The config file (`config.json`, falling back to `config.example.json`) has four
groups. Every option, its type, default, and what it does:

### `server` — where the Node bridge listens

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | number | `6080` | TCP port the Node server (and noVNC client) listens on. Env var `PORT` overrides it. |
| `host` | string | `127.0.0.1` | Interface to bind. Leave `127.0.0.1` — the Cloudflare tunnel connects locally; `0.0.0.0` exposes the client to your LAN. |

### `vnc` — where the VNC server lives

| Option | Type | Default | Description |
|---|---|---|---|
| `host` | string | `127.0.0.1` | Host of the VNC server (TightVNC). Keep it local; never expose 5900 to the internet. |
| `port` | number | `5900` | VNC TCP port. Env vars `VNC_HOST` / `VNC_PORT` override both. |

### `stream` — picture quality & encoding (what the client requests)

| Option | Type | Default | Description |
|---|---|---|---|
| `scaleViewport` | bool | `true` | Fit the remote desktop to your browser window instead of showing it at native pixel size. |
| `viewOnly` | bool | `false` | Watch-only mode: no mouse/keyboard is sent to the Windows PC. |
| `quality` | number | `6` | Overall quality level (0–9) the client asks the VNC server for. Higher = sharper but more bandwidth. |
| `encoding` | string | `auto` | Pixel encoding to negotiate (`auto`, `tight`, `jpeg`, `hextile`, `raw`, …). `auto` lets noVNC pick the best. **Dev-tunable** — see the FOR DEVS ONLY section. |

### `control` — what the on-screen "Send keys" buttons do

Each `send*` option toggles a button in the client toolbar; each sends that
key combo to the remote Windows PC (handy when the Chromebook keyboard lacks
the key):

| Option | Type | Default | Description |
|---|---|---|---|
| `sendCtrlAltDel` | bool | `true` | Send **Ctrl+Alt+Del** (unlock screen, task manager). |
| `sendAltTab` | bool | `true` | Send **Alt+Tab** (switch window). |
| `sendAltF4` | bool | `true` | Send **Alt+F4** (close window). |
| `sendWinD` | bool | `true` | Send **Win+D** (show desktop). |
| `sendEsc` | bool | `true` | Send **Esc**. |
| `sendEnter` | bool | `true` | Send **Enter**. |
| `sendSpace` | bool | `true` | Send **Space**. |
| `sendArrowKeys` | bool | `true` | Send the **arrow keys**. |
| `sendNumericPad` | bool | `true` | Send **numpad** keys. |
| `showSendKeys` | bool | `true` | Show/hide the whole "Send keys" button group. |
| `showFullscreen` | bool | `true` | Show/hide the **Fullscreen** button. |

### `client` — connection & UI defaults for the browser client

| Option | Type | Default | Description |
|---|---|---|---|
| `showCursor` | bool | `true` | Show the remote cursor while moving the mouse. |
| `waitForWindowResponse` | bool | `false` | Wait for the window to acknowledge input before sending more (reduces input lag artifacts, adds latency). |
| `hostname` | string | `localhost` | Pre-filled VNC host in the client's address field. Leave as `localhost` — the Node bridge does the real connection. |
| `password` | string | `""` | Pre-fill the VNC password in the client. **Leave empty** — anyone reading the page source would see it. |
| `port` | number | `5900` | Pre-filled VNC port in the client (again, the bridge handles this). |
| `showDotCursor` | bool | `false` | Draw a visible dot at the cursor position when the remote cursor is hidden or hard to see. |
| `shared` | bool | `false` | Ask the VNC server to allow other simultaneous viewers ("shared session"). |
| `cursor` | bool | `false` | Draw the local (client-side) cursor instead of the remote one. |
| `resizeSession` | bool | `false` | Ask the Windows desktop to resize its resolution to match your browser window. **Dev-tunable.** |

> The in-app version of this list is always available in the client: click
> **📖 Key definitions** (or add `#defs` to the URL).

---

## 11. 🔧 FOR DEVS ONLY — configs available but shouldn't be touched

These options exist in the config and are passed straight through to noVNC's
RFB engine or the raw VNC protocol. They are off/neutral by default because the
wrong value can garble the picture, tank performance, or break the connection
entirely. Only change them if you understand the RFB protocol and what noVNC
does with each setting.

| Option | Default | What it really does | Why it's risky |
|---|---|---|---|
| `stream.encoding` | `auto` | Forces a single VNC pixel encoding (`tight`, `hextile`, `zrle`, `raw`, `copyrect`…) instead of letting the server/client negotiate per-frame. | `raw` sends uncompressed frames over the internet — instant lag. An encoding the server doesn't support will fail the handshake. |
| `stream.desktopScalingFactor` | `1` | Requests the OS DPI scale factor noVNC advertises to the server; affects how Windows sizes the desktop. | Values ≠ 1 can misalign mouse coordinates on HiDPI Windows sessions. |
| `stream.jpegQuality` | `6` | JPEG compression level (0–9) for `tight`/`jpeg` sub-encodings. | Only matters when a JPEG-capable encoding is active; a bad value degrades image quality with no benefit. |
| `stream.paletteSize` | `0` | Force indexed-color mode with N palette entries (0 = off) — a very old VNC bandwidth trick. | Modern desktops look terrible in palette mode; almost never correct today. |
| `stream.ffv1` | `false` | Enable the FFV1 lossless video codec inside Tight encoding. | Needs a server that actually implements it; silently falls back or breaks the stream with servers that don't. |
| `stream.copyRectangles` | `false` | Allow `CopyRect` pseudo-encoding (server says "this region is identical to that one" instead of resending pixels). | Some servers misuse it with scrolling, causing smearing artifacts. |
| `stream.tight` | `false` | Force-enable the Tight encoding family explicitly. | Redundant with `encoding: "auto"`; forcing it can conflict with negotiation. |
| `stream.tightCompression` | `false` | Turn on Tight's extra zlib compression levels. | Higher CPU on the host for marginal bandwidth savings on fast links. |
| `client.resizeSession` | `false` | Send `SetDesktopSize` so the Windows resolution follows your browser window size. | Windows can end up in a broken/odd resolution that's hard to undo remotely; not all VNC servers honor it. |
| `client.shared` | `false` | Open the session in shared mode so multiple clients can watch/control at once. | Two controllers fighting over one desktop; some servers disconnect existing sessions when this flips. |
| `client.cursor` | `false` | Client-side cursor rendering (local cursor shape instead of the server's). | Cursor shape/position can desync from the actual remote cursor. |
| `client.showDotCursor` | `false` | Overlay a fixed dot at the pointer position. | Only useful for debugging invisible-cursor issues; visually noisy in normal use. |
| `client.waitForWindowResponse` | `false` | Throttle input until the client window confirms the last event. | Adds input latency; only helps with very unreliable links. |

> Rule of thumb: if `quality`, `scaleViewport`, and the defaults already look
> fine, leave everything in this section alone. They're here for debugging
> specific encoding/bandwidth problems, not for tuning ""feel"".

---

## 12. Quick reference

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

## 13. Project files

```
remote-desktop/
├── package.json          # npm install
├── server/
│   └── server.js         # Node server + WebSocket → VNC bridge
└── remote-desktop.html   # The noVNC client (only file a browser needs)
README.md                 # This file
```
