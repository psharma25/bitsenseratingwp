#!/bin/bash
# =============================================================================
# BitSense Ransomware Incident Reporter — Docker deployment on EC2
# Target: Amazon Linux 2023 (Ubuntu 22.04/24.04 fallback included)
#
# Two ways to use this script:
#
#   A) USER DATA (zero-touch): paste this whole file into "Advanced details →
#      User data" when launching the instance AND set APP_SOURCE_URL below to
#      a raw URL of ransomware-report.html (GitHub raw / S3 object). Docker is
#      installed, the image is built on-instance, and the container starts on
#      port 80 automatically.
#
#   B) MANUAL: copy the docker/ folder (with ransomware-report.html inside)
#      to the instance and run:
#         scp -i key.pem -r docker ec2-user@<PUBLIC_IP>:~
#         ssh -i key.pem ec2-user@<PUBLIC_IP>
#         cd docker && chmod +x deploy-ec2-docker.sh && sudo ./deploy-ec2-docker.sh
#
# Security group required: inbound TCP 80 from 0.0.0.0/0 (add 443 for TLS
# later); TCP 22 restricted to your IP only — or skip 22 and use SSM.
# =============================================================================
set -euo pipefail

APP_SOURCE_URL=""   # optional: e.g. https://raw.githubusercontent.com/<you>/<repo>/main/ransomware-report.html
IMAGE="bitsense/ransomware-reporter:1.0"
NAME="ransomware-reporter"
HOST_PORT=80

echo "[1/5] Installing Docker..."
if command -v dnf >/dev/null 2>&1; then                 # Amazon Linux 2023
  dnf -y -q install docker
  systemctl enable --now docker
  usermod -aG docker ec2-user 2>/dev/null || true
elif command -v apt-get >/dev/null 2>&1; then           # Ubuntu fallback
  apt-get update -qq
  apt-get install -y -qq docker.io
  systemctl enable --now docker
  usermod -aG docker ubuntu 2>/dev/null || true
else
  echo "ERROR: unsupported distro (need dnf or apt-get)" >&2; exit 1
fi

echo "[2/5] Staging build context..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}"
# user-data mode: nothing is on disk yet — pull everything into /opt
if [[ ! -f "${BUILD_DIR}/Dockerfile" ]]; then
  BUILD_DIR=/opt/bitsense-rr
  mkdir -p "${BUILD_DIR}"
  cat > "${BUILD_DIR}/Dockerfile" <<'DOCKER'
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ransomware-report.html /usr/share/nginx/html/index.html
RUN chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html \
 && touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid
USER nginx
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
DOCKER
  cat > "${BUILD_DIR}/nginx.conf" <<'NGINX'
server_tokens off;
server {
    listen 8080; listen [::]:8080; server_name _;
    root /usr/share/nginx/html; index index.html;
    if ($request_method !~ ^(GET|HEAD)$) { return 405; }
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy no-referrer always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'" always;
    location / { try_files $uri /index.html; }
}
NGINX
fi

echo "[3/5] Placing application file..."
if [[ -f "${BUILD_DIR}/ransomware-report.html" ]]; then
  : # already staged (manual mode)
elif [[ -f "${SCRIPT_DIR}/../ransomware-report.html" ]]; then
  cp "${SCRIPT_DIR}/../ransomware-report.html" "${BUILD_DIR}/"
elif [[ -n "${APP_SOURCE_URL}" ]]; then
  curl -fsSL "${APP_SOURCE_URL}" -o "${BUILD_DIR}/ransomware-report.html"
else
  echo "ERROR: ransomware-report.html not found and APP_SOURCE_URL is empty." >&2
  exit 1
fi

echo "[4/5] Building image and starting container..."
docker build -t "${IMAGE}" "${BUILD_DIR}"
docker rm -f "${NAME}" >/dev/null 2>&1 || true
docker run -d --name "${NAME}" \
  -p "${HOST_PORT}:8080" \
  --restart unless-stopped \
  --read-only --tmpfs /tmp --tmpfs /run --tmpfs /var/cache/nginx \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  "${IMAGE}"

echo "[5/5] Done."
PUBLIC_IP="$(curl -fsS --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
echo "============================================================"
echo " BitSense Ransomware Incident Reporter (Docker) deployed."
echo " URL:    http://${PUBLIC_IP:-<instance-public-ip>}/"
echo " Status: docker ps --filter name=${NAME}"
echo " Logs:   docker logs -f ${NAME}"
echo " Update: rebuild with new HTML, then re-run this script"
echo " Next steps:"
echo "   - Restrict SG port 22 to your IP (or use SSM Session Manager)"
echo "   - TLS: front with an ALB + ACM cert, or CloudFront, or add"
echo "     an nginx-proxy/certbot companion via docker-compose"
echo "   - Optional: push image to ECR for repeatable multi-instance deploys:"
echo "       aws ecr create-repository --repository-name bitsense/ransomware-reporter"
echo "       docker tag ${IMAGE} <acct>.dkr.ecr.<region>.amazonaws.com/${IMAGE}"
echo "       docker push <acct>.dkr.ecr.<region>.amazonaws.com/${IMAGE}"
echo "============================================================"
