# Shadow Cloud — Smoke Test

> **Goal:** Quick verification that the CLI, serve API, dashboard, deploy pipeline, and **real K8s cluster deployment** all work end-to-end.
> **Working directory:** `apps/cloud/`

---

## Results Summary

| Phase | Test | Status |
|---|---|---|
| 1 | CLI help, version, validate, doctor | ✅ Pass |
| 2 | Generate manifests (offline) | ✅ Pass — 27 files for solopreneur-pack |
| 3 | Serve API (templates, images, runtimes, doctor, validate, init) | ✅ Pass |
| 4 | Dashboard static serving via `serve` | ✅ Pass — index.html, SPA fallback, MIME types |
| 5 | Dashboard command (all-in-one start) | ✅ Pass |
| 6 | Deploy via SSE stream (all 10 templates) | ✅ Pass |
| 7 | Settings API (GET/PUT persistence) | ✅ Pass |
| 8 | Config API (GET/PUT file read/write) | ✅ Pass |
| 9 | gitagent init containers | ✅ Pass — `git-clone` init container generated |
| 10 | Unit tests (vitest) | ✅ Pass — 194 tests |
| 11 | CLI E2E tests (vitest) | ✅ Pass — 100 tests |
| 12 | Dashboard E2E (Playwright) | ✅ Pass — 21 tests |
| 13 | **K8s cluster deploy (solopreneur-pack)** | ✅ Pass — 5/5 pods Ready, 0 restarts, 5+ min stable |

---

## Previously Known Issues — All Resolved

| # | Issue | Resolution |
|---|---|---|
| 1 | Docker image not published publicly | `images/` directory available; `doctor` command checks prerequisites |
| 2 | Pods crash with stub API keys | Expected behavior; docs clarify real keys needed for live tests |
| 3 | Missing git init container in manifests | Fixed — `buildManifests()` now generates `git-clone` init containers |
| 4 | Manifest file naming inconsistent | Fixed — uses `<agent>-deployment.json` convention consistently |
| 5 | Pulumi CLI not installed by default | `doctor` command detects and reports missing prerequisites |
| 6 | `serve` doesn't serve dashboard static files | Fixed — `serve` now serves `dist/dashboard/` with SPA fallback |
| 7 | vitest picks up Playwright E2E files | Fixed — `e2e/**` added to vitest exclude |
| 8 | React setState during render in DeployModal | Fixed — moved to `useEffect` + `useMemo` |
| 9 | EACCES `/root/.openclaw` in container | Fixed — volume mount paths → `/home/node/.openclaw`, Dockerfile uses `node` user |
| 10 | SecurityContext pod vs container fields | Fixed — `readOnlyRootFilesystem`/`allowPrivilegeEscalation` only at container level |
| 11 | PVC ReadWriteMany on local-path storage | Fixed — default to `ReadWriteOnce` |
| 12 | API type `"openai"` rejected by OpenClaw | Fixed — normalized to `"openai-completions"`, `"anthropic"` → `"anthropic-messages"` |
| 13 | Agent entry `systemPrompt`/`instructions` rejected | Fixed — stripped from entry, written as `SOUL.md` in workspace |
| 14 | `integrations` unrecognized top-level config key | Fixed — omitted from OpenClaw config (template-only metadata) |
| 15 | `heartbeat.target` unknown targets | Fixed — stripped non-channel targets (e.g., `"content"`, `"morning-brief"`) |
| 16 | OpenClaw self-respawn breaks entrypoint | Fixed — `OPENCLAW_NO_RESPAWN=1` env var |
| 17 | `dashboard` command "too many arguments" error | Fixed — removed `node`/`serve` prefixes from `parseAsync` args |
| 18 | Templates not found via API (0 returned) | Fixed — adjusted `import.meta.url` path resolution for tsup bundle depth |
| 19 | `doctor` stderr leak (`error: unknown flag: --version`) | Fixed — Pulumi uses `version` subcommand; added `stdio: ['ignore', 'pipe', 'pipe']` |

---

## Quick Smoke Test Commands

```bash
cd apps/cloud

# 1. Build (CLI + dashboard together)
pnpm install && pnpm build   # produces dist/index.js + dist/dashboard/

# 2. CLI quick checks
node dist/index.js --help     # lists 17 commands
node dist/index.js --version  # prints 1.0.0
node dist/index.js doctor     # checks Node.js, Docker, kubectl, Pulumi, kind

# 3. Validate all templates (10 total)
for f in templates/*.template.json; do
  node dist/index.js validate --file "$f"
done

# 4. Init — list templates
node dist/index.js init --list   # prints 10 templates with agent counts

# 5. Generate manifests (offline, stub keys)
export ANTHROPIC_API_KEY=stub DEEPSEEK_API_KEY=stub OPENAI_API_KEY=stub
export STRIPE_SECRET_KEY=stub GA4_PROPERTY_ID=stub GOOGLE_CREDENTIALS_B64=stub
export GSC_SITE_URL=https://example.com NOTION_TOKEN=stub
export NOTION_CONTENT_DB_ID=stub NOTION_SOCIAL_DB_ID=stub NOTION_DIGEST_DB_ID=stub
export NOTION_RESEARCH_DB_ID=stub NOTION_COMPETITOR_DB_ID=stub NOTION_BUGS_DB_ID=stub
export NOTION_TICKETS_DB_ID=stub SLACK_BOT_TOKEN=stub SLACK_APP_TOKEN=stub
export TELEGRAM_BOT_TOKEN=stub GITHUB_TOKEN=stub GITHUB_REPO=org/repo
export DATABASE_URL=postgres://localhost/db KUBECONFIG_B64=stub
export MIXPANEL_PROJECT_ID=stub MIXPANEL_SECRET=stub MIXPANEL_USERNAME=stub
export COMPETITOR_URLS=https://example.com

mkdir -p /tmp/smoke-test
node dist/index.js generate manifests \
  --file templates/solopreneur-pack.template.json \
  --output /tmp/smoke-test
ls /tmp/smoke-test/   # expect 27 files

# 6. Dashboard command (all-in-one: starts serve + opens browser)
node dist/index.js dashboard --no-open --port 4800 &
DASH_PID=$!
sleep 3

# 7. Test API endpoints
curl -s http://localhost:4800/api/templates | node -e "
  const d=[]; process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>console.log(JSON.parse(d.join('')).length+' templates'))
"   # expect: 10 templates

curl -s http://localhost:4800/api/images | node -e "
  const d=[]; process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>console.log(JSON.parse(d.join('')).length+' images'))
"   # expect: 5 images

curl -s http://localhost:4800/api/runtimes | node -e "
  const d=[]; process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>console.log(JSON.parse(d.join('')).length+' runtimes'))
"   # expect: 5 runtimes

curl -s http://localhost:4800/api/doctor | node -e "
  const d=[]; process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>{const r=JSON.parse(d.join(''));
    console.log(r.checks.length+' checks, '+r.summary.pass+' pass')})
"   # expect: 5 checks

# 8. Validate via API
curl -s -X POST http://localhost:4800/api/validate \
  -H 'Content-Type: application/json' \
  -d '{"config":{"version":"1.0.0","team":{"name":"test"},"agents":[]}}'
# expect: {"valid":true,...}

# 9. Init via API
curl -s -X POST http://localhost:4800/api/init \
  -H 'Content-Type: application/json' \
  -d '{"template":"solopreneur-pack"}'
# expect: JSON with template config

# 10. Deploy via SSE
curl -s -X POST http://localhost:4800/api/deploy \
  -H 'Content-Type: application/json' \
  -d "$(cat templates/solopreneur-pack.template.json)" \
  --no-buffer | tail -3
# expect: event: done \n data: {"exitCode":0,...}

# 11. Dashboard static serving
curl -sw "%{http_code}" http://localhost:4800/ | tail -1   # expect: 200

kill $DASH_PID

# 12. Automated tests
pnpm test              # 194 unit tests
pnpm test:e2e:cli      # 100 CLI E2E tests
pnpm test:e2e:dashboard # 21 Playwright tests

# 13. K8s cluster deploy (requires a running cluster + real API keys)
#     See "Kubernetes Cluster Verification" section below.
```

---

## API Endpoints Reference

All endpoints are served by `node dist/index.js serve` (or `dashboard`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` or `/api/health` | Health check |
| `GET` | `/api/templates` | List all templates (10 total) |
| `GET` | `/api/templates/:name` | Get template by slug |
| `GET` | `/api/deployments` | List deployments across namespaces |
| `GET` | `/api/deployments/:ns/:id/pods` | Pod list for an agent |
| `GET` | `/api/deployments/:ns/:id/logs` | SSE live pod logs |
| `POST` | `/api/deployments/:ns/:id/scale` | Scale replicas |
| `POST` | `/api/deploy` | Deploy config (SSE progress stream) |
| `POST` | `/api/destroy` | Tear down namespace |
| `POST` | `/api/validate` | Validate config JSON |
| `GET` | `/api/doctor` | System health checks |
| `POST` | `/api/init` | Generate config from template |
| `POST` | `/api/provision` | Provision Shadow resources |
| `POST` | `/api/generate/manifests` | Generate K8s manifests |
| `POST` | `/api/generate/openclaw-config` | Generate agent config |
| `GET` | `/api/images` | List Docker image definitions |
| `GET` | `/api/config` | Read config file |
| `PUT` | `/api/config` | Write config file |
| `GET` | `/api/runtimes` | List available runtimes |
| `GET` | `/api/settings` | Read user settings |
| `PUT` | `/api/settings` | Write user settings |
| `*` | `/*` | Dashboard SPA static files |

---

## CLI Commands Reference

17 commands total (14 top-level + 3 subcommands):

| Command | Description |
|---------|-------------|
| `up` | Deploy agent cluster to Kubernetes |
| `down` | Destroy agent cluster |
| `status` | Show cluster status (deployments, pods, outputs) |
| `logs` | View agent logs (with follow) |
| `scale` | Scale agent replicas |
| `init` | Generate config template (`--list` to browse) |
| `serve` | Start API server |
| `dashboard` | Start API + open browser (wraps serve) |
| `validate` | Validate config file |
| `doctor` | Check system prerequisites |
| `provision` | Provision Shadow resources |
| `build` | Build Docker images for agents |
| `images list` | List image definitions |
| `images build` | Build a Docker image |
| `images push` | Push image to registry |
| `generate manifests` | Generate K8s manifests |
| `generate openclaw-config` | Generate agent config |

---

## Dashboard Pages Reference

8 sidebar pages + 1 detail page:

| Path | Page | Description |
|------|------|-------------|
| `/` | Overview | Deployment list across namespaces, auto-refreshes |
| `/templates` | Templates | Card grid with Deploy button + SSE modal |
| `/config` | Config | JSON editor, save/validate/format/load-from-template |
| `/validate` | Validate | Paste config JSON, see pass/warn/fail results |
| `/images` | Images | Container image definitions with Dockerfile status |
| `/runtimes` | Runtimes | Agent runtimes with default images |
| `/doctor` | Doctor | System health check cards + detail list |
| `/settings` | Settings | Provider API keys, presets (Anthropic, OpenAI, etc.) |
| `/deployments/:ns/:id` | Detail | Pods, scale+/-, destroy, live log viewer |

---

## Kubernetes Cluster Verification

> **Goal:** Deploy all agents to a real Kubernetes cluster and verify pods reach
> Ready state with zero restarts.

### Prerequisites

- A running K8s cluster (e.g. Rancher Desktop, minikube, kind, or cloud-hosted)
- `kubectl` configured and able to reach the cluster
- Docker image `ghcr.io/shadowob/openclaw-runner:latest` available (built locally or pulled from registry)
- **Real API keys** for the providers used by the template

### Build the Docker image (local cluster)

```bash
cd images/openclaw-runner
docker build -t ghcr.io/shadowob/openclaw-runner:latest .
```

### Generate manifests with real keys

```bash
cd apps/cloud
export DEEPSEEK_API_KEY="sk-your-deepseek-key"
export ANTHROPIC_API_KEY="sk-your-anthropic-key"
# ... set all required env vars for the template ...

node dist/index.js generate manifests \
  -f templates/solopreneur-pack.template.json \
  -o /tmp/cluster-deploy

ls /tmp/cluster-deploy/   # expect 27 files
```

### Deploy to cluster

```bash
kubectl apply -f /tmp/cluster-deploy/solopreneur-namespace.json
sleep 2
kubectl apply -f /tmp/cluster-deploy/
```

### Verify pod health

```bash
sleep 30
kubectl -n solopreneur get pods
# All 5 pods: 1/1 Running, 0 restarts

sleep 300
kubectl -n solopreneur get pods
# Still 0 restarts after 5 minutes
```

### Debugging if pods crash

```bash
kubectl -n solopreneur logs <pod-name> --tail=50

kubectl -n solopreneur patch deployment <agent-name> \
  --type json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/command","value":["sleep","3600"]}]'
kubectl -n solopreneur exec -it <new-pod> -- sh
```
