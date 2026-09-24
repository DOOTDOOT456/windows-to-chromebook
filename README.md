## 4c. Comparison — permanent free tunnel alternatives

| Option | Free for life? | Permanent URL | TCP/WebSocket OK | Account needed | Setup effort |
|---|---|---|---|---|---|
| **Cloudflare Tunnel** (current) | ✅ Yes | ✅ `pc.your-domain.com` (or `*.trycloudflare.com`) | ✅ | Optional (opensource CLI works without account) | Medium |
| **LocalTunnel** (`npx localtunnel`) | ✅ Yes | ⚠️ Random URL each restart (fixed with `--subdomain`) | ⚠️ HTTP only | ❌ None | Very low |
| **ngrok free** | ⚠️ Free, but **not** permanent | ⚠️ New random URL on every start | ❌ HTTP only | ❌ None | Very low |
| **rustunnel (self-hosted)** | ✅ Yes | ✅ Own domain, own cert | ✅ | ❌ None (open source) | High |
| **Tailscale Funnel** | ⚠️ Beta/free for small teams | ✅ | ✅ | ❌ None | High |

**Bottom line:** Cloudflare is still the best pick. `localhost.run` and
`localtunnel` give a free URL with zero setup but only HTTP (not raw
WebSocket), and the URL changes on every restart. **rustunnel** is the closest
genuine permanent-free alternative, but it means self-hosting the tunnel binary
on a second always-on PC — more work than running the Node server itself.

> Tip: for your use case (WebSocket + binary data), stick with Cloudflare Tunnel
> or **ngrok's** free tier if you accept a new random URL each time you restart.
