# BitSense Ransomware Incident Reporter — Docker → AWS EC2

Containerized deployment of the single-file app. The container is a hardened
`nginx:alpine` serving one static HTML file — **no incident data ever reaches
the server or the container**; everything runs in the operator's browser.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | nginx:1.27-alpine, non-root, port 8080, healthcheck |
| `nginx.conf` | server_tokens off, GET/HEAD only, CSP + security headers |
| `docker-compose.yml` | read-only rootfs, cap_drop ALL, no-new-privileges, port 80→8080 |
| `deploy-ec2-docker.sh` | One-shot EC2 install: Docker + build + run (AL2023 / Ubuntu) |
| `ransomware-report.html` | The application (copy it into this folder before building) |

## Local test (any machine with Docker)

```bash
cp ../ransomware-report.html .        # if not already here
docker compose up -d --build
open http://localhost/                # or curl -I http://localhost/
```

## Deploy to EC2 — Option A: build on the instance (~4 minutes)

1. **Launch instance**: Amazon Linux 2023, `t3.micro` (free tier), public subnet.
2. **Security group**: inbound TCP 80 from `0.0.0.0/0`; TCP 22 from *your IP only* (or use SSM and skip 22).
3. **Copy and run**:
   ```bash
   scp -i key.pem -r docker ec2-user@<PUBLIC_IP>:~
   ssh -i key.pem ec2-user@<PUBLIC_IP>
   cd docker && chmod +x deploy-ec2-docker.sh && sudo ./deploy-ec2-docker.sh
   ```
4. Open `http://<PUBLIC_IP>/`.

## Deploy to EC2 — Option B: zero-touch user data

Host `ransomware-report.html` at a raw URL (GitHub raw / S3), set
`APP_SOURCE_URL` at the top of `deploy-ec2-docker.sh`, and paste the whole
script into **Advanced details → User data** at launch. The script writes its
own Dockerfile/nginx.conf, pulls the HTML, builds, and starts the container.

## Deploy to EC2 — Option C: pre-built image via ECR (repeatable / fleet)

```bash
# on your workstation
aws ecr create-repository --repository-name bitsense/ransomware-reporter
aws ecr get-login-password --region <region> | docker login --username AWS \
  --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker build -t <acct>.dkr.ecr.<region>.amazonaws.com/bitsense/ransomware-reporter:1.0 .
docker push <acct>.dkr.ecr.<region>.amazonaws.com/bitsense/ransomware-reporter:1.0

# on each instance (with an instance role granting ecr:GetAuthorizationToken + pull)
aws ecr get-login-password --region <region> | sudo docker login --username AWS \
  --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
sudo docker run -d --name ransomware-reporter -p 80:8080 --restart unless-stopped \
  --read-only --tmpfs /tmp --tmpfs /run --tmpfs /var/cache/nginx \
  --security-opt no-new-privileges:true --cap-drop ALL \
  <acct>.dkr.ecr.<region>.amazonaws.com/bitsense/ransomware-reporter:1.0
```

Same image also runs unchanged on **ECS Fargate** (task port 8080 behind an
ALB) or **App Runner** if you outgrow a single instance.

## Container hardening applied

- Runs as the unprivileged `nginx` user, listens on 8080 (no root, no port <1024 inside)
- `--read-only` root filesystem with tmpfs for nginx runtime dirs
- `--cap-drop ALL`, `no-new-privileges`
- GET/HEAD only; `server_tokens off`; CSP with `connect-src 'none'` (the app makes zero network calls)
- Healthcheck baked into the image

## Ops cheat sheet

```bash
docker ps --filter name=ransomware-reporter     # status
docker logs -f ransomware-reporter              # access/error logs
docker restart ransomware-reporter              # bounce
# update the app: replace ransomware-report.html, then
docker compose up -d --build                    # or re-run deploy-ec2-docker.sh
```

## TLS

Pick one:
- **ALB + ACM** (recommended on AWS): terminate TLS at the load balancer, target port 80.
- **CloudFront** in front of the instance; restrict SG port 80 to the CloudFront prefix list.
- **On-box**: add an `nginx-proxy` + `acme-companion` pair to docker-compose (requires a DNS name).

*Not an official FBI/IC3 submission channel — always file at ic3.gov.*
