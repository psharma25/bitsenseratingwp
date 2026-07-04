#!/bin/bash
# =============================================================================
# BitSense Ransomware Incident Reporter — EC2 deployment (Amazon Linux 2023)
#
# Two ways to use this script:
#
#   A) USER DATA (zero-touch): paste this whole file into the "User data" box
#      when launching the instance. It installs nginx and pulls the HTML from
#      the APP_SOURCE_URL below (set it to your GitHub raw URL / S3 object).
#
#   B) MANUAL: scp both files to the instance, then run:
#         scp -i key.pem ransomware-report.html deploy-ec2.sh ec2-user@<IP>:~
#         ssh -i key.pem ec2-user@<IP>
#         chmod +x deploy-ec2.sh && sudo ./deploy-ec2.sh
#      When ransomware-report.html sits next to this script, it is used
#      directly and APP_SOURCE_URL is ignored.
#
# Security group required: inbound TCP 80 (and 443 if you add TLS), TCP 22
# restricted to your IP for SSH. No other ports.
# =============================================================================
set -euo pipefail

APP_SOURCE_URL=""   # optional: e.g. https://raw.githubusercontent.com/<you>/<repo>/main/ransomware-report.html
WEB_ROOT="/usr/share/nginx/html"
APP_FILE="ransomware-report.html"

echo "[1/5] Installing nginx..."
if command -v dnf >/dev/null 2>&1; then
  dnf -y update -q
  dnf -y install nginx -q
else                                   # Ubuntu fallback
  apt-get update -qq
  apt-get install -y -qq nginx
  WEB_ROOT="/var/www/html"
fi

echo "[2/5] Placing application file..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/${APP_FILE}" ]]; then
  cp "${SCRIPT_DIR}/${APP_FILE}" "${WEB_ROOT}/index.html"
elif [[ -n "${APP_SOURCE_URL}" ]]; then
  curl -fsSL "${APP_SOURCE_URL}" -o "${WEB_ROOT}/index.html"
else
  echo "ERROR: ${APP_FILE} not found next to script and APP_SOURCE_URL is empty." >&2
  exit 1
fi
chmod 644 "${WEB_ROOT}/index.html"

echo "[3/5] Hardening nginx (headers, server tokens, method limits)..."
mkdir -p /etc/nginx/conf.d
cat > /etc/nginx/conf.d/bitsense.conf <<'NGINX'
server_tokens off;

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # static-only app: block everything except GET/HEAD
    if ($request_method !~ ^(GET|HEAD)$) { return 405; }

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy no-referrer always;
    # app is fully self-contained: no external scripts/styles/fonts
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'" always;

    location / {
        try_files $uri /index.html;
    }
}
NGINX
# on Ubuntu the root differs — patch config if needed
if [[ "${WEB_ROOT}" == "/var/www/html" ]]; then
  sed -i 's|/usr/share/nginx/html|/var/www/html|' /etc/nginx/conf.d/bitsense.conf
  rm -f /etc/nginx/sites-enabled/default
fi

echo "[4/5] Starting nginx..."
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "[5/5] Done."
PUBLIC_IP="$(curl -fsS --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
echo "============================================================"
echo " BitSense Ransomware Incident Reporter deployed."
echo " URL: http://${PUBLIC_IP:-<instance-public-ip>}/"
echo " Next steps:"
echo "   - Restrict SG port 22 to your IP; keep only 80/443 public"
echo "   - Add TLS: dnf install certbot python3-certbot-nginx && certbot --nginx"

echo "============================================================"
