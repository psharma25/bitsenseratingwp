# =============================================================================
# BitSense Ransomware Incident Reporter — container image
# Static single-file app served by nginx. No backend, no data egress:
# the container only serves the HTML; all incident data stays in the
# operator's browser (IndexedDB + local JSON save).
# =============================================================================
FROM nginx:1.27-alpine

# Hardened server config (security headers, GET/HEAD only, no server tokens)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The entire application
COPY ransomware-report.html /usr/share/nginx/html/index.html

# Run nginx as the unprivileged bundled user on an unprivileged port
RUN sed -i 's/listen  *80;/listen 8080;/' /etc/nginx/conf.d/default.conf 2>/dev/null || true \
 && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html \
 && touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
