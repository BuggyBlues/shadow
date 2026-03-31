# ─── Claude Runner ────────────────────────────────────────────────────────
# Container image for Claude Code agent runtime.
# Extends the OpenClaw runner with Claude Code CLI + ACPX harness.
# OpenClaw serves as the gateway, forwarding to Claude Code via ACP.
#
# Build: docker build -t ghcr.io/shadowob/claude-runner:latest .
# ──────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install OpenClaw, Claude Code, Shadow plugin, and ACPX plugin
RUN npm init -y && \
    npm install openclaw@latest @anthropic-ai/claude-code@latest \
                @shadowob/openclaw-shadowob@latest && \
    # Setup extensions directories
    mkdir -p extensions/shadowob && \
    cp -r node_modules/@shadowob/openclaw-shadowob/* extensions/shadowob/ && \
    # Clean up dev artifacts
    find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "CHANGELOG.md" -delete 2>/dev/null || true && \
    find node_modules -name "README.md" -delete 2>/dev/null || true

# ── Stage 2: Runner ─────────────────────────────────────────────────────
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/nicepkg/shadow"
LABEL org.opencontainers.image.description="Shadow Cloud Claude Runner (OpenClaw + ACP + Claude Code)"

# Install runtime dependencies
RUN apk add --no-cache curl tini git

# Create non-root user for security
RUN addgroup -g 1000 openclaw && \
    adduser -u 1000 -G openclaw -D openclaw

# Setup directories
WORKDIR /app
RUN mkdir -p /home/openclaw/.openclaw /home/openclaw/.claude /var/log/openclaw \
             /etc/xcloud /workspace /tmp/openclaw && \
    chown -R openclaw:openclaw /home/openclaw /var/log/openclaw /workspace /tmp/openclaw /app

# Copy from builder
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/extensions ./extensions
COPY --from=builder /build/package.json ./package.json

# Copy entrypoint
COPY entrypoint.mjs /app/entrypoint.mjs

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

EXPOSE 3100

ENV NODE_ENV=production
ENV OPENCLAW_GATEWAY_PORT=3100
ENV OPENCLAW_DIR=/home/openclaw/.openclaw
ENV CLAUDE_CONFIG_DIR=/home/openclaw/.claude

# Run as non-root
USER openclaw

ENTRYPOINT ["tini", "--"]
CMD ["node", "/app/entrypoint.mjs"]
