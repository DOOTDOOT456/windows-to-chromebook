# Remote Desktop — loadable into about:blank

`remote-desktop.html` is a fully self-contained remote desktop client (noVNC).
To use it from an `about:blank` page:

1. Open `about:blank` in your browser.
2. Paste this into the address bar... actually about:blank has no address bar — instead:
   - Open DevTools console (`F12`) on the blank tab and run:

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

Two parts: a **VNC server on Windows** and a **tunnel** so you can reach it from anywhere.

### 1. VNC server

Install [TightVNC Server](https://www.tightvnc.com/) (or UltraVNC) and set a strong
VNC password. It listens on port `5900`.

### 2. WebSocket bridge

The browser client speaks WebSocket, not raw VNC. Install Node.js, then:

```bash
npm install -g ws  # only if running the manual websockify
```

Easiest: use Python's websockify (`pip install websockify`) and run:

```
websockify --web=. 6080 localhost:5900
```

This serves the client files on port 6080 and bridges WebSockets → VNC.

### 3. Reachable from anywhere — Cloudflare Tunnel

Don't port-forward. Use Cloudflare Tunnel (free, works behind NAT):

```bash
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

- **Google Sign-In gate**: the client requires a Google account sign-in before the
  connect panel is shown. You need an OAuth **Client ID** from
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type “Web application”,
  with the page’s origin listed under Authorized JavaScript origins). The client ID is entered once
  and remembered in localStorage. You can optionally hard-code allowed emails in the
  `ALLOWED_EMAILS` set inside `remote-desktop.html`.
  > ⚠️ Client-side sign-in proves identity but isn’t a hard security boundary — anyone with the URL
  > can bypass it via DevTools. For a strong gate, put **Cloudflare Access (Zero Trust)** in front of
  > the hostname (free for ≤50 users, supports Google as an identity provider) and/or verify the
  > Google JWT on the server.
- The VNC connection is end-to-end TLS via Cloudflare, but still set a strong VNC password.
- Never expose port 5900 directly to the internet.
