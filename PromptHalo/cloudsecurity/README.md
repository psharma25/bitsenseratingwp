# AWS Cloud Security for Agentic AI — Checklist App

A 40-control AWS security checklist (identity, network, data, logging,
compute, governance, agentic-AI security, and incident response), backed by
a real server and database — with email one-time-passcode (OTP) login and
admin/viewer roles.

This replaces the earlier single-file, localStorage-only version: state now
lives in a SQLite database on the server, and editing requires logging in.

## What's inside

- **`server/`** — Node.js + Express backend. Uses Node's built-in `node:sqlite`
  module, so there's no native database driver to compile — `npm install`
  stays fast and portable (important for it to "just work" in a fresh
  Codespace or any other machine).
- **`public/aws-ai.html`** — the checklist UI. Same look and content as
  before; the lock/unlock + save logic now talks to the backend API instead
  of `localStorage`.
- **`data/app.db`** — created automatically on first run. Not committed to
  git (see `.gitignore`).

## Roles

- **Admin** — can check off controls, edit notes, edit the checklist's own
  text (titles/descriptions/playbook content), and manage other users.
- **Viewer** — read-only.

**The first person to ever log in becomes admin automatically.** Everyone
after that starts as a viewer; an admin can promote/demote/remove people
from the "Manage users" panel in the app.

## Running it locally

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Running it in GitHub Codespaces (self-starting)

This repo includes a `.devcontainer/devcontainer.json`. Opening it in a
GitHub Codespace will automatically:

1. Run `npm install` and create a `.env` from `.env.example` if one doesn't
   exist yet.
2. Start the server in the background on port 3000, which Codespaces will
   forward and offer to open in your browser.

No manual setup needed to get it running — though you'll still want to add
real email credentials (below) before relying on it for real logins.

**Note:** a Codespace isn't always-on — it stops when you close the tab or
after ~30 minutes idle, and free GitHub accounts have limited monthly
Codespaces hours. Every time you reopen it, `postStartCommand` fires again
and restarts the server, but nobody can reach it while it's stopped. That's
fine for your own dev/testing; see **Deploying somewhere real** below for
something other people can actually use.

## Email login (OTP)

Login works by emailing a 6-digit one-time code. This needs an SMTP
provider, which you can now configure **from inside the app** — no manual
file editing required:

1. Log in (the first login becomes admin automatically).
2. Click **Email settings** in the toolbar.
3. Enter your SMTP host, port, username, password, and from-address, then
   **Save**. This writes the values into `.env` on the server and applies
   them immediately — no restart needed.
4. Use **Send test email** in the same panel to confirm it works before
   relying on it.

Works with:

- **AWS SES (SMTP interface)** — host like `email-smtp.<region>.amazonaws.com`,
  port `587`, and the SMTP username/password from the SES console (these are
  different from your AWS access key/secret).
- **SendGrid (SMTP relay)** — host `smtp.sendgrid.net`, port `587`, username
  `apikey`, password = your SendGrid API key.

You can still set these manually in `.env` instead (see `.env.example`) if
you'd rather not enter credentials through the browser.

**If SMTP isn't configured yet**, the app still fully works — OTP codes are
printed to the server's console/log instead of emailed. This is what lets a
fresh Codespace boot be immediately testable before you've wired up real
email. Look for a block like this in the terminal / `/tmp/server.log`:

```
================ EMAIL (no SMTP configured — dev mode) ================
To:      you@company.com
Code:    482913
==========================================================================
```

## Sessions

Set `JWT_SECRET` in `.env` to a long random string (e.g. `openssl rand -hex 48`)
so logins survive a server restart. If you don't set it, a random secret is
generated on each boot and everyone is logged out whenever the server
restarts.

## Deploying somewhere real (always-on, reachable by others)

Codespaces (above) is for *you* to develop/test in — it isn't always-on and
isn't meant for other people to hit. For a real always-on deployment, use
**Render**, which this repo is preconfigured for via `render.yaml`.

### Deploy to Render

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint**, then pick your repo (Render
   auto-detects `render.yaml`). Or use a direct link once your repo is
   public — replace `YOUR_GITHUB_REPO_URL` below with the real URL:
   `https://render.com/deploy?repo=YOUR_GITHUB_REPO_URL`
3. Render reads `render.yaml` and automatically runs `npm install` then
   `npm start` — no manual setup. It also auto-generates a `JWT_SECRET` for
   you so sessions work out of the box.
4. Redeploys happen automatically on every push to your default branch.

**Add email**: in the Render dashboard, open your service → **Environment**
tab → fill in `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` (left
blank in `render.yaml` on purpose, since secrets shouldn't live in the repo).
Or use the in-app **Email settings** panel after logging in — see the
persistence caveat just below before relying on that route.

### Important: free-tier storage is not durable

Render's **free** web service plan has an **ephemeral filesystem** — the
SQLite database (`data/app.db`, which holds every user, role, checklist
check-off, and any SMTP settings saved through the in-app panel) is **wiped**
every time the service redeploys or wakes up from being idle. Free services
also auto-sleep after ~15 minutes of no traffic, so this happens often.

This is fine for confirming the deploy itself works, but not for actually
relying on saved data. Two ways to fix it:

1. **Upgrade to a paid Render instance type** and attach a persistent disk —
   uncomment the `disk:` block in `render.yaml` once you're on a paid plan.
2. **Swap SQLite for Render's free managed Postgres** — a separate always-on
   database service, unaffected by the web service's ephemeral disk. This
   needs a small code change in `server/db.js`; ask if you'd like this done.

Running locally (`npm start`) or in a Codespace doesn't have this problem —
the filesystem there is a normal persistent disk for as long as that
machine/container exists.

## Security notes

- OTP codes are hashed before being stored, expire after 10 minutes, and
  lock out after 5 wrong attempts.
- Sessions are httpOnly, `SameSite=Lax` cookies — not readable by page
  JavaScript.
- There is no rate limiting beyond per-email OTP cooldown/attempt limits.
  If you expose this publicly, consider adding a reverse-proxy rate limiter
  (e.g. via your hosting platform or an Nginx/Cloudflare layer) in front of
  `/api/auth/request-otp`.
- The SMTP password entered in **Email settings** is stored in plaintext in
  `.env` on the server (same as if you'd typed it into the file by hand) —
  it is never sent back to the browser after saving, but treat `.env` and
  server access accordingly.
- This is appropriate for an internal team tool, not a public-internet
  product without further hardening.
