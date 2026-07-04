# BitSense Ransomware Incident Reporter — EC2 Deployment

Single-file HTML app (vanilla JS, no CDN, IndexedDB) served as a static page from nginx on EC2.
The instance only serves the file — **no incident data ever reaches the server**.

## Files

| File | Purpose |
|---|---|
| `ransomware-report.html` | The complete application (intake → validate → JSON → triage → store → save) |
| `deploy-ec2.sh` | Installs nginx, hardens it, deploys the app (Amazon Linux 2023; Ubuntu fallback) |
| `docker/` | Containerized alternative: Dockerfile, hardened nginx.conf, docker-compose.yml, `deploy-ec2-docker.sh` — see `docker/README-DOCKER.md` |

## Quick deploy (manual, ~3 minutes)

1. **Launch instance**: Amazon Linux 2023, `t3.micro` (free tier eligible), public subnet.
2. **Security group**: inbound TCP 80 from `0.0.0.0/0` (add 443 later for TLS); TCP 22 from *your IP only*.
3. **Copy and run**:
   ```bash
   scp -i key.pem ransomware-report.html deploy-ec2.sh ec2-user@<PUBLIC_IP>:~
   ssh -i key.pem ec2-user@<PUBLIC_IP>
   chmod +x deploy-ec2.sh && sudo ./deploy-ec2.sh
   ```
4. Open `http://<PUBLIC_IP>/`.

## Zero-touch deploy (user data)

Host `ransomware-report.html` at a raw URL (GitHub raw / S3), set `APP_SOURCE_URL` at the
top of `deploy-ec2.sh`, and paste the whole script into **Advanced details → User data**
when launching. The app is live when the instance passes status checks.

## Post-deploy checklist

- [ ] Verify the app loads and a scenario walkthrough runs end-to-end
- [ ] Add TLS: `sudo dnf install -y certbot python3-certbot-nginx && sudo certbot --nginx` (requires a DNS name)
- [ ] Lock SSH to your IP; consider SSM Session Manager instead of port 22
- [ ] Optional: put CloudFront in front for TLS + caching and close port 80 to the CDN prefix list only

## Use cases

- **UC-1 Victim self-service intake** — structured IC3-aligned capture right after discovery
- **UC-2 Deterministic triage** — transparent scoring (CRITICAL/HIGH/MEDIUM/LOW), reproducible as evidence
- **UC-3 Reporting handoff** — one-click JSON save to the local drive; official filing remains FBI field office + ic3.gov
- **UC-4 Local incident register** — IndexedDB persistence with JSON export
- **UC-5 Tabletop training** — three preloaded exfiltration scenarios (display-only walkthroughs)

## Architecture (summary)

```
User ──HTTPS GET──▶ EC2 / nginx ──▶ ransomware-report.html (static)
                                      │  all logic runs in the browser:
                                      │  form → validator → JSON builder → triage engine
                                      │        → IndexedDB (persist)  → save-to-drive (JSON)
                                      └─ scenario runner replays steps 1–4, display-only
External: FBI field office ▸ IC3 (ic3.gov) — manual, operator-initiated
```

Trust boundary: numeric triage and persistence are entirely client-side; there is no network
egress at all — records save to the operator's local drive as JSON. Upgrade path for central
archiving: Lambda Function URL + S3, keeping the HTML static.

*Not an official FBI/IC3 submission channel — always file at ic3.gov.*
