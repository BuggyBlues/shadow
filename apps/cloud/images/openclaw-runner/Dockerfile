# ── Build stage ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install OpenClaw and shadowob plugin
RUN npm init -y && \
    npm install openclaw@latest @shadowob/openclaw-shadowob@latest && \
    # Setup extensions directory
    mkdir -p extensions/shadowob && \
    cp -r node_modules/@shadowob/openclaw-shadowob/* extensions/shadowob/ && \
    # Cleanup dev artifacts to reduce image size
    find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "*.d.ts" -delete 2>/dev/null || true && \
    find node_modules -name "*.d.ts.map" -delete 2>/dev/null || true && \
    find node_modules -name "*.js.map" -delete 2>/dev/null || true && \
    find node_modules -name "CHANGELOG.md" -delete 2>/dev/null || true && \
    find node_modules -name "README.md" -delete 2>/dev/null || true

# ── Runtime stage ────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache curl tini

# Create non-root user for security
# node:22-alpine already has 'node' user at UID/GID 1000.
# Reuse it to match securityContext.runAsUser=1000.
RUN mkdir -p /home/node/.openclaw /var/log/openclaw /etc/xcloud /tmp/openclaw && \
    chown -R node:node /home/node /var/log/openclaw /tmp/openclaw

WORKDIR /app

# Copy OpenClaw + plugin + dependencies
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/extensions ./extensions
COPY --from=builder /build/package.json ./package.json

# Copy entrypoint
COPY entrypoint.mjs ./entrypoint.mjs

# Ensure /app is owned by non-root user
RUN chown -R node:node /app

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

EXPOSE 3100

ENV NODE_ENV=production
ENV OPENCLAW_GATEWAY_PORT=3100
ENV OPENCLAW_DIR=/home/node/.openclaw

# Run as non-root
USER node

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "entrypoint.mjs"]
