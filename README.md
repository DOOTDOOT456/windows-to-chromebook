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
  "vnc": { "host": "127.0.0.1", "port": 5900 }
}
```

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
