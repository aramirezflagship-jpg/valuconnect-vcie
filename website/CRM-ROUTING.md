# How the CRM is served at vcsolutions.us/crm

`vercel.json` cannot carry comments (Vercel validates it against a strict schema
and rejects unknown keys), so the explanation lives here.

## Why a rewrite rather than a subdomain

The domain's nameservers are at **GoDaddy** and the site is served by **Vercel**.
Adding `crm.vcsolutions.us` would mean a new DNS record, and Cloudflare Access
would mean moving the nameservers off GoDaddy entirely.

Neither is necessary. Vercel proxies `/crm` through to the engine on Render, so:

- one domain, no new DNS record
- the browser only ever sees `vcsolutions.us`, so the session cookie is set for
  this domain and behaves normally
- the CRM's own `fetch` calls are same-origin, so no CORS configuration at all

## Activating it

1. Deploy the engine to Render (see `DEPLOY.md` in the leak-engine repo).
2. In `vercel.json`, replace every `ENGINE-HOST` with the Render hostname,
   e.g. `valuconnect-leak-engine.onrender.com`. **Host only — no `https://`,
   no trailing slash**, since the scheme is already in the destination.
3. In `assets/js/main.js` set `var CRM_URL = '/crm';` to show the Log In link.
4. `npx vercel --prod`

Check:
```bash
curl -I https://vcsolutions.us/crm/login.html      # 200
curl -s  https://vcsolutions.us/api/crm-auth-mode  # {"mode":"password"}
```

## Which paths are proxied, and why only these

`/crm/*` is the CRM itself. The four `/api/*` groups are what its pages call:
sign-in, sign-out, the auth-mode probe, and the two API surfaces. Nothing else on
the marketing site is affected — the rewrites are specific rather than a
catch-all, so a future `/api/...` on the website cannot be swallowed by accident.

## Gotcha

Rewrites run **before** static files. If a real `crm/` folder is ever added to
this site it will be shadowed by the proxy and appear to do nothing.
