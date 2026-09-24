# Remote Desktop — loadable into about:blank

`remote-desktop.html` is a fully self-contained remote desktop client (noVNC).
To use it from an `about:blank` page:

1. Open `about:blank` in your browser.
2. Open DevTools console (`F12`) on the blank tab and run:

```js
document.write('<iframe src="https://YOUR-HOST/remote-desktop.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>');
```

...or simpler: just bookmark the hosted file and it works the same. The file itself
is what matters — serve it over HTTPS and it runs anywhere.

## Quick start (URL pre-fill)

Append the WebSocket URL to the file as a hash and it auto-connects:

```
https://your-host/remote-desktop.html#wss://pc.your-domain.com/websockify
```

## Server setup on your Windows PC

Three parts: a **Node.js server**, a **VNC server** on Windows, and a **tunnel** so
you can reach it from anywhere.

### 1. Node server (replaces `websockify`)

```bat
cd remote-desktop
copy package.json .
copy server\server.js .
npm install
start /b node server\server.js
```

That serves `remote-desktop.html` on `http://localhost:6080` and bridges
WebSocket `/websockify` → `localhost:5900` (VNC). Env vars:

| Var | Default | |
|---|---|---|
| `PORT` | `6080` | port to listen on |
| `VNC_HOST` | `127.0.0.1` | where the VNC server listens |
| `VNC_PORT` | `5900` | VNC server port |

### 2. VNC server

Install [TightVNC Server](https://www.tightvnc.com/) (or UltraVNC) and set a strong
VNC password. It listens on port `5900`.

### 3. Reachable from anywhere — Cloudflare Tunnel

Don't port-forward. Use Cloudflare Tunnel (free, works behind NAT):

```bat
winget install cloudflare.cloudflared
cloudflared tunnel login
cloudflared tunnel create remote-desktop
cloudflared tunnel route dns remote-desktop pc.your-domain.com
```

`config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<you>\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: pc.your-domain.com
    service: http://localhost:6080
  - service: http_status:404
```

Run it: `cloudflared tunnel run remote-desktop` (install as a Windows service with
`cloudflared service install` so it starts on boot).

Now open `https://pc.your-domain.com/remote-desktop.html` from anywhere —
the client connects over `wss://pc.your-domain.com/websockify` automatically.

## Security notes

- Start the Node server **only on localhost** (`127.0.0.1`) and put it behind
  Cloudflare Tunnel. Never expose port 6080 (or 5900) directly to the internet.
- The VNC connection is end-to-end TLS via Cloudflare, but still set a strong
  VNC password.
- Add Cloudflare Access (Zero Trust) in front of the hostname for an extra auth
  layer (free for ≤50 users).
