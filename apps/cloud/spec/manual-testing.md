# Shadow Cloud — Manual Test Plan

> **How to use this document**
> Execute each scenario top-to-bottom. After each step record **✅ Pass** or **❌ Fail + observation**.
> Report failures back and they will be triaged and fixed.
>
> **Branch:** `feat/cloud-skills-workspace`
> **Working directory:** `apps/cloud/` unless stated otherwise.

---

## Prerequisites

Before running any test, complete this setup once:

```bash
# 1. Install deps
cd /path/to/shadow
pnpm install

# 2. Build CLI + dashboard (single command)
cd apps/cloud
pnpm build          # produces dist/index.js + dist/dashboard/

# 3. Verify binary works
node dist/index.js --help
```

**Environment variables required** — the following must be set when running deploy/manifest tests. Stub values are fine for offline tests:

| Variable | Used by template | Real value needed? |
|---|---|---|
| `ANTHROPIC_API_KEY` | almost all | For live agent tests |
| `DEEPSEEK_API_KEY` | solopreneur, code-review, etc. | For live agent tests |
| `OPENAI_API_KEY` | fallback | Optional |
| `STRIPE_SECRET_KEY` | solopreneur, metrics | For live agent tests |
| `GA4_PROPERTY_ID` | solopreneur, metrics | For live agent tests |
| `GOOGLE_CREDENTIALS_B64` | solopreneur, metrics | For live agent tests |
| `SLACK_BOT_TOKEN` | devops, code-review, security | For live agent tests |
| `TELEGRAM_BOT_TOKEN` | devops, metrics | For live agent tests |
| `GITHUB_TOKEN` | code-review, security, devops | For live agent tests |
| `GITHUB_REPO` | code-review | Format: `org/repo` |
| `NOTION_TOKEN` | solopreneur, research | For live agent tests |
| `DATABASE_URL` | customer-support, devops | postgres connection URL |

---

## Scenario 01 — CLI: Help and version

**Goal:** Verify the CLI binary is correctly built and self-describes.

**Steps:**

```bash
cd apps/cloud
node dist/index.js --help
node dist/index.js --version
node dist/index.js validate --help
node dist/index.js generate --help
node dist/index.js serve --help
node dist/index.js dashboard --help
node dist/index.js doctor --help
node dist/index.js images --help
node dist/index.js init --help
```

**Expected:**
- `--help` prints a usage summary listing all subcommands: `up`, `down`, `status`, `logs`, `scale`, `init`, `serve`, `dashboard`, `validate`, `doctor`, `provision`, `build`, `images`, `generate`
- `--version` prints `1.0.0`
- Each subcommand `--help` prints its own usage without errors

**Pass criteria:** Exit code `0` for all commands, no stack traces.

---

## Scenario 02 — CLI: Doctor (system health check)

**Goal:** Verify `doctor` checks prerequisites and reports clean output.

**Steps:**

```bash
cd apps/cloud
node dist/index.js doctor
```

**Expected output (example):**
```
Shadow Cloud Doctor
─────────────────
✓ Node.js: v22.22.2
✓ Docker: Docker version 27.x.x
✓ kubectl: connected to cluster
✓ Pulumi: v3.230.0
⚠ kind: not found (optional)

All checks passed (4 pass, 1 warn)
```

**Pass criteria:**
- Exit code `0`
- No `error: unknown flag` messages in output
- Node.js and Docker checks pass on any dev machine

---

## Scenario 03 — CLI: Validate all built-in templates

**Goal:** Confirm every template in `templates/` passes schema validation.

**Steps:**

```bash
cd apps/cloud
for f in templates/*.template.json; do
  echo "Validating $f..."
  node dist/index.js validate --file "$f"
  echo "Exit: $?"
done
```

**Expected for each template:**
```
✓ Schema valid
✓ Extends references valid
✓ Template references valid
✓ Bindings valid
✓ Config is valid!
```

**Templates under test (10 total):**
1. `code-review-team`
2. `customer-support-team`
3. `devops-team`
4. `gitagent-from-repo`
5. `managed-agents-demo`
6. `metrics-team`
7. `research-team`
8. `security-team`
9. `shadowob-cloud`
10. `solopreneur-pack`

**Pass criteria:** All 10 templates exit `0` and print `✓ Config is valid!`.

---

## Scenario 04 — CLI: Init (template listing and generation)

**Goal:** Verify `init` can list all templates and generate config from them.

**Steps:**

```bash
cd apps/cloud

# List all available templates
node dist/index.js init --list

# Generate a config from a template
mkdir -p /tmp/init-test
node dist/index.js init --template solopreneur-pack --output /tmp/init-test/config.json --force
cat /tmp/init-test/config.json | node -e "
  const d=[]; process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>{
    const c=JSON.parse(d.join(''));
    console.log('version:', c.version);
    console.log('agents:', c.agents?.length);
  })
"
```

**Expected:**
- `--list` prints 10 templates with agent counts and descriptions
- Generated config has `version: "1.0.0"` and agents array
- `managed-agents-demo` appears in the list (3 agents)

**Pass criteria:** All 10 templates listed, config generation succeeds.

---

## Scenario 05 — CLI: Generate Kubernetes manifests (offline)

**Goal:** Verify `generate manifests` produces valid K8s JSON without a real cluster, using stub API keys.

**Steps:**

```bash
cd apps/cloud

# Set stub env vars
export ANTHROPIC_API_KEY=stub-anthropic
export DEEPSEEK_API_KEY=stub-deepseek
export OPENAI_API_KEY=stub-openai
export STRIPE_SECRET_KEY=stub-stripe
export GA4_PROPERTY_ID=stub-ga4
export GOOGLE_CREDENTIALS_B64=stub-gcreds
export GSC_SITE_URL=https://example.com
export NOTION_TOKEN=stub-notion
export NOTION_CONTENT_DB_ID=stub
export NOTION_SOCIAL_DB_ID=stub
export NOTION_DIGEST_DB_ID=stub
export NOTION_RESEARCH_DB_ID=stub
export NOTION_COMPETITOR_DB_ID=stub
export NOTION_BUGS_DB_ID=stub
export NOTION_TICKETS_DB_ID=stub
export SLACK_BOT_TOKEN=stub-slack-bot
export SLACK_APP_TOKEN=stub-slack-app
export TELEGRAM_BOT_TOKEN=stub-telegram
export GITHUB_TOKEN=stub-github
export GITHUB_REPO=stub-org/stub-repo
export DATABASE_URL=postgres://localhost/stub
export KUBECONFIG_B64=stub-kubeconfig
export MIXPANEL_PROJECT_ID=stub
export MIXPANEL_SECRET=stub
export MIXPANEL_USERNAME=stub
export COMPETITOR_URLS=https://competitor.example.com

# Generate manifests for solopreneur-pack
mkdir -p /tmp/manifests-test
node dist/index.js generate manifests \
  --file templates/solopreneur-pack.template.json \
  --output /tmp/manifests-test

# Inspect output
ls -la /tmp/manifests-test/
```

**Expected:**
- Exit code `0`
- Output message: `✓ Generated N resource file(s) in /tmp/manifests-test`
- Files present — at least one of each type:
  - `Namespace-*.json`
  - `Deployment-*.json` (one per agent, ≥5 for solopreneur)
  - `ConfigMap-*.json`
  - `Secret-*.json`
  - `Service-*.json`

**Pass criteria:** Exit `0`, ≥15 files generated, all K8s resources have `apiVersion`, `kind`, `metadata.name`.

---

## Scenario 06 — CLI: Images commands

**Goal:** Verify image management CLI commands work.

**Steps:**

```bash
cd apps/cloud

# List available images
node dist/index.js images list
```

**Expected:**
- Lists 5 images: `openclaw-runner`, `claude-runner`, `codex-runner`, `gemini-runner`, `opencode-runner`
- Each shows Dockerfile path and description

**Pass criteria:** Exit `0`, 5 images listed.

---

## Scenario 07 — CLI: Serve API startup

**Goal:** Verify `shadowob-cloud serve` starts, exposes the REST API, and responds correctly.

**Steps:**

```bash
cd apps/cloud

# Start serve in background
node dist/index.js serve --port 4800 &
SERVE_PID=$!
sleep 2

# Test GET /api/templates
curl -s http://localhost:4800/api/templates | node -e "
const d = []; process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  const arr = JSON.parse(d.join(''));
  console.log('Templates count:', arr.length);
  arr.forEach(t => console.log(' -', t.name, '|', t.slug));
});
"

# Test GET /api/templates/solopreneur-pack
curl -s http://localhost:4800/api/templates/solopreneur-pack | node -e "
const d = []; process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  const t = JSON.parse(d.join(''));
  console.log('Template name:', t.name);
  console.log('Version:', t.version);
});
"

# Test new API endpoints
curl -s http://localhost:4800/api/images | node -e "
const d=[]; process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>console.log('Images:', JSON.parse(d.join('')).length))
"

curl -s http://localhost:4800/api/runtimes | node -e "
const d=[]; process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>console.log('Runtimes:', JSON.parse(d.join('')).length))
"

curl -s http://localhost:4800/api/doctor | node -e "
const d=[]; process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>{const r=JSON.parse(d.join(''));
  console.log('Doctor:', r.checks.length, 'checks,', r.summary.pass, 'pass')})
"

# Cleanup
kill $SERVE_PID
```

**Expected:**
- Server starts without error
- `GET /api/templates` returns JSON array of 10 templates, each with `name`, `slug`, `description`, `agentCount`
- `GET /api/templates/solopreneur-pack` returns the full template JSON
- `GET /api/templates/nonexistent` returns HTTP 404
- `GET /api/images` returns 5 images
- `GET /api/runtimes` returns 5 runtimes
- `GET /api/doctor` returns 5 checks with summary

**Pass criteria:** All curl commands succeed, no 5xx errors.

---

## Scenario 08 — API: Validate and Init endpoints

**Goal:** Verify the validate and init API endpoints work correctly.

**Steps:**

```bash
cd apps/cloud
node dist/index.js serve --port 4801 &
SERVE_PID=$!
sleep 2

# Test POST /api/validate with valid config
curl -s -X POST http://localhost:4801/api/validate \
  -H 'Content-Type: application/json' \
  -d '{"config":{"version":"1.0.0","team":{"name":"test"},"agents":[{"id":"a","runtime":"openclaw","model":{"provider":"anthropic","name":"claude-sonnet-4-20250514"}}]}}'

# Test POST /api/validate with invalid config
curl -s -X POST http://localhost:4801/api/validate \
  -H 'Content-Type: application/json' \
  -d '{"config":{"invalid":true}}'

# Test POST /api/init
curl -s -X POST http://localhost:4801/api/init \
  -H 'Content-Type: application/json' \
  -d '{"template":"solopreneur-pack"}'

kill $SERVE_PID
```

**Expected:**
- Valid config returns `{"valid":true,...}`
- Invalid config returns validation errors
- Init returns template config JSON with agents array

**Pass criteria:** All three responses return correct JSON, no 5xx.

---

## Scenario 09 — API: Config CRUD

**Goal:** Verify config file read/write via API.

**Steps:**

```bash
cd apps/cloud
node dist/index.js serve --port 4802 &
SERVE_PID=$!
sleep 2

# Write config
curl -s -X PUT http://localhost:4802/api/config \
  -H 'Content-Type: application/json' \
  -d '{"content":"{\"version\":\"1.0.0\",\"team\":{\"name\":\"test\"}}"}'

# Read config
curl -s http://localhost:4802/api/config

kill $SERVE_PID
```

**Expected:**
- PUT returns success
- GET returns the config content

**Pass criteria:** Round-trip write → read returns correct content.

---

## Scenario 10 — CLI: Deploy via serve → SSE stream (offline manifest mode)

**Goal:** Verify the full `POST /api/deploy → SSE stream` pipeline works without Kubernetes.

**Steps:**

```bash
# Set stub env vars (same as Scenario 05)
export SHADOW_CLOUD_OUTPUT_DIR=/tmp/sse-deploy-test
mkdir -p $SHADOW_CLOUD_OUTPUT_DIR

cd apps/cloud
node dist/index.js serve --port 4803 &
SERVE_PID=$!
sleep 2

# POST to /api/deploy and read the SSE stream
curl -s -X POST http://localhost:4803/api/deploy \
  -H "Content-Type: application/json" \
  -d "$(cat templates/devops-team.template.json)" \
  --no-buffer

# Inspect manifest files
ls /tmp/sse-deploy-test/

kill $SERVE_PID
unset SHADOW_CLOUD_OUTPUT_DIR
```

**Expected SSE stream output format:**
```
event: log
data: "..."

event: done
data: {"exitCode":0}
```

**Expected files in `/tmp/sse-deploy-test/`:**
- `Namespace-devops-team.json`
- `Deployment-infra-monitor.json`
- `Deployment-cicd-watcher.json`
- `Deployment-incident-responder.json`
- Several `ConfigMap-*` and `Secret-*` files

**Pass criteria:**
- SSE stream ends with `event: done` and `"exitCode":0`
- `/tmp/sse-deploy-test/` contains ≥10 manifest files

---

## Scenario 11 — CLI: Dashboard command (all-in-one)

**Goal:** Verify `dashboard` command starts serve + opens browser in one step.

**Steps:**

```bash
cd apps/cloud

# Start with --no-open to prevent browser launch
node dist/index.js dashboard --no-open --port 4804 &
DASH_PID=$!
sleep 3

# Verify API works
curl -s http://localhost:4804/api/templates | node -e "
const d=[]; process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>console.log(JSON.parse(d.join('')).length+' templates'))
"

# Verify dashboard serves
curl -sw "%{http_code}" http://localhost:4804/ | tail -1

kill $DASH_PID
```

**Expected:**
- No "too many arguments" error (previously fixed)
- API returns 10 templates
- Dashboard returns HTTP 200

**Pass criteria:** Server starts without errors, API + static serving works.

---

## Scenario 12 — Dashboard: Startup and navigation

**Goal:** Verify the dashboard UI starts, loads all pages, and renders correctly.

**Steps:**

```bash
cd apps/cloud
node dist/index.js dashboard --no-open --port 3004 &
DASH_PID=$!
sleep 3
```

Open browser: `http://localhost:3004/`

**Manual checks:**

1. **Page title:** Browser tab shows "Shadow Cloud Dashboard"
2. **Navigation sidebar:** Shows 8 links:
   - Overview (LayoutDashboard icon)
   - Templates (Package icon)
   - Config (FileCode icon)
   - Validate (Shield icon)
   - Images (Container icon)
   - Runtimes (Cpu icon)
   - Doctor (Stethoscope icon)
   - Settings (Settings icon)
3. **Click each nav item** — page loads without errors
4. **No console errors:** Open browser DevTools → Console — no red errors

**Pass criteria:** All 8 nav pages load, no JS errors.

```bash
kill $DASH_PID
```

---

## Scenario 13 — Dashboard: Templates page and deploy flow

**Goal:** Verify template cards render and deploy flow works with SSE logging.

**Steps:**

1. Start: `node dist/index.js dashboard --no-open --port 3004 &`
2. Open `http://localhost:3004/templates`

**Manual checks:**

1. **Template cards visible:** 10 cards including:
   - solopreneur-pack (5 agents)
   - devops-team (3 agents)
   - code-review-team (3 agents)
   - customer-support-team (2 agents)
   - metrics-team (2 agents)
   - security-team (3 agents)
   - research-team (3 agents)
   - gitagent-from-repo (1 agent)
   - shadowob-cloud (1 agent)
   - **managed-agents-demo** (3 agents) ← new
2. **Card structure:** Each card shows name, description, agent count badge, tags, "Deploy" button
3. **Deploy flow:**
   - Click **Deploy** on any template
   - Modal opens with template info
   - Click **Deploy** in modal
   - SSE log lines stream in real time
   - "Deployment complete!" appears on success

**Pass criteria:** All 10 template cards visible, deploy SSE modal works.

---

## Scenario 14 — Dashboard: Config Editor page

**Goal:** Verify the config editor supports editing, saving, validating, and loading from templates.

**Steps:**

1. Open `http://localhost:3004/config`
2. **Load from template:** Click "Load Template" → select `solopreneur-pack` → config JSON fills the editor
3. **Format:** Click "Format" button → JSON is pretty-printed
4. **Validate:** Click "Validate" button → shows validation results (pass/fail)
5. **Save:** Click "Save" → config is written to disk
6. **Edit:** Modify the JSON → Save again

**Pass criteria:** All actions complete without errors. Round-trip edit → save → reload preserves changes.

---

## Scenario 15 — Dashboard: Validate page

**Goal:** Verify standalone config validation works.

**Steps:**

1. Open `http://localhost:3004/validate`
2. Paste a valid config JSON:
   ```json
   {"version":"1.0.0","team":{"name":"test"},"agents":[{"id":"a","runtime":"openclaw","model":{"provider":"anthropic","name":"claude-sonnet-4-20250514"}}]}
   ```
3. Click **Validate**
4. Verify results show pass/warn/fail checks

**Pass criteria:** Valid config shows all checks passing. Invalid config shows errors.

---

## Scenario 16 — Dashboard: Images page

**Goal:** Verify images page lists all Docker images with status.

**Steps:**

1. Open `http://localhost:3004/images`
2. Verify 5 image definitions displayed:
   - `openclaw-runner`
   - `claude-runner`
   - `codex-runner`
   - `gemini-runner`
   - `opencode-runner`
3. Each shows Dockerfile status badge

**Pass criteria:** 5 images listed, no errors.

---

## Scenario 17 — Dashboard: Runtimes page

**Goal:** Verify runtimes page lists all agent runtimes.

**Steps:**

1. Open `http://localhost:3004/runtimes`
2. Verify 5 runtimes displayed:
   - `openclaw`
   - `claude-code`
   - `codex`
   - `gemini`
   - `opencode`
3. Each shows default image name

**Pass criteria:** 5 runtimes listed, no errors.

---

## Scenario 18 — Dashboard: Doctor page

**Goal:** Verify doctor page shows system health checks.

**Steps:**

1. Open `http://localhost:3004/doctor`
2. Verify summary cards show pass/warn/fail counts
3. Verify check detail list shows:
   - Node.js version ✓
   - Docker version ✓
   - kubectl connectivity
   - Pulumi version
   - kind availability
4. No `error: unknown flag` messages visible

**Pass criteria:** 5 checks displayed with correct status, clean output.

---

## Scenario 19 — Dashboard: Settings page

**Goal:** Verify the Settings page loads, allows editing API keys and cluster config, and persists changes.

**Steps:**

1. Open `http://localhost:3004/settings`
2. **Observe initial state:**
   - Settings form with provider API key fields
   - Presets available (Anthropic, OpenAI, Ollama, DeepSeek, Groq)
3. **Edit a field:**
   - Enter a test value in an API key field
   - Click **Save Settings**
4. **Verify persistence:**
   - Reload the page (`Cmd+R`)
   - The value entered in step 3 should still be present

**Inspect the settings file:**
```bash
cat ~/.shadowob/settings.json
```

5. **Clear the field:**
   - Delete the test value, click Save again

**Pass criteria:**
- Settings page loads without errors
- Values persist to `~/.shadowob/settings.json`
- Page reloads show saved values

---

## Scenario 20 — Dashboard: Deployment detail page

**Goal:** Verify the deployment detail page renders pods, controls, and live logs.

**Prerequisites:** Requires a running K8s cluster with deployed agents.

**Steps:**

1. Open `http://localhost:3004/` (Overview page)
2. Click on a deployment row to navigate to `/deployments/:ns/:id`
3. Verify:
   - Pod list with status, ready, restarts, age columns
   - Scale up (+) and down (-) buttons
   - Destroy button
   - Log viewer with SSE streaming

**Pass criteria:** Page loads, pod info correct, log viewer streams.

---

## Scenario 21 — CLI: gitagent-from-repo template (git source mode)

**Goal:** Verify the `gitagent-from-repo` template validates and generates manifests with init-container git pull logic.

**Steps:**

```bash
cd apps/cloud

# Validate first
node dist/index.js validate --file templates/gitagent-from-repo.template.json

# Generate manifests with stub git credentials
export GITHUB_TOKEN=stub-github
export ANTHROPIC_API_KEY=stub-anthropic

mkdir -p /tmp/gitagent-test
node dist/index.js generate manifests \
  --file templates/gitagent-from-repo.template.json \
  --output /tmp/gitagent-test

ls /tmp/gitagent-test/
```

**Verify init-container in Deployment spec:**
```bash
cat /tmp/gitagent-test/Deployment-*.json | node -e "
const d = []; process.stdin.on('data', c => d.push(c));
process.stdin.on('end', () => {
  const obj = JSON.parse(d.join(''));
  const initContainers = obj.spec?.template?.spec?.initContainers ?? [];
  console.log('Init containers:', initContainers.map(c => c.name).join(', '));
});
" 2>/dev/null | head -5
```

**Expected:** Init container named `git-pull` or similar pulls the repo before the main agent starts.

**Pass criteria:**
- `validate` exits `0`
- `generate manifests` exits `0`
- At least one Deployment has `spec.template.spec.initContainers` with a git-pull container

---

## Scenario 22 — CLI: managed-agents-demo template

**Goal:** Verify the new `managed-agents-demo` template works correctly.

**Steps:**

```bash
cd apps/cloud

# Validate
node dist/index.js validate --file templates/managed-agents-demo.template.json

# Generate manifests
mkdir -p /tmp/managed-agents-test
node dist/index.js generate manifests \
  --file templates/managed-agents-demo.template.json \
  --output /tmp/managed-agents-test

ls /tmp/managed-agents-test/
```

**Expected:**
- Validation passes
- 3 agent deployments generated
- Template demonstrates managed agent patterns

**Pass criteria:** Validate + generate succeed, correct agent count.

---

## Scenario 23 — End-to-end: Full local dev workflow

**Goal:** Simulate the complete developer workflow from build to dashboard interaction.

**Steps:**

```bash
# Terminal 1 — build
cd apps/cloud
pnpm build

# Terminal 2 — start dashboard (single command replaces serve + dashboard:preview)
cd apps/cloud
node dist/index.js dashboard --no-open --port 3004
```

1. Open `http://localhost:3004` in browser
2. Verify the Overview page loads
3. **Navigate all pages:** Click each sidebar link, confirm no errors
4. **Smoke test deploy flow:**
   - Go to Templates → Deploy **solopreneur-pack** (with stub env vars)
   - Confirm SSE logs show in modal
   - Confirm "Deployment complete!" message
5. **Test doctor page:** Shows 5 checks with correct statuses

**Pass criteria:**
- Dashboard starts without errors (single command)
- All 8 pages load correctly
- Deploy modal flow completes successfully

---

## Scenario 24 — Automated regression: Unit tests

**Goal:** Confirm the vitest unit test suite passes cleanly.

**Steps:**

```bash
cd apps/cloud
pnpm test
```

**Expected output:**
```
Test Files  13 passed (13)
     Tests  194 passed (194)
```

**Pass criteria:** All 194 tests green.

---

## Scenario 25 — Automated regression: CLI E2E tests

**Goal:** Confirm the CLI E2E test suite passes.

**Steps:**

```bash
cd apps/cloud
pnpm test:e2e:cli
```

**Expected output:**
```
✓ __tests__/e2e/validate-all-templates.test.ts
✓ __tests__/e2e/generate-manifests.test.ts

Test Files  2 passed (2)
     Tests  100 passed (100)
```

**Pass criteria:** All 100 tests green.

---

## Scenario 26 — Automated regression: Dashboard E2E Playwright tests

**Goal:** Confirm the full Playwright test suite passes.

**Steps:**

```bash
cd apps/cloud
pnpm test:e2e:dashboard
```

**Expected output:**
```
  21 passed
```

**Pass criteria:** 21/21 green.

---

## Scenario 27 — K8s Cluster: Deploy solopreneur-pack to a running cluster

**Goal:** Verify generated manifests deploy to a real Kubernetes cluster and all
agent pods reach `1/1 Running` with 0 restarts.

**Prerequisites:**
- K8s cluster running (Rancher Desktop / minikube / kind / cloud)
- `kubectl` configured
- Docker image built: `docker build -t ghcr.io/shadowob/openclaw-runner:latest images/openclaw-runner/`
- Real API keys set (at minimum `DEEPSEEK_API_KEY`)

**Steps:**

```bash
cd apps/cloud

# 1. Set real API keys (replace with your values)
export DEEPSEEK_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-your-key"
export GA4_PROPERTY_ID="123456789"
export GOOGLE_CREDENTIALS_B64="$(echo '{}' | base64)"
export GSC_SITE_URL="https://example.com"
export NOTION_CONTENT_DB_ID="placeholder"
export NOTION_SOCIAL_DB_ID="placeholder"
export NOTION_TOKEN="ntn_placeholder"
export STRIPE_SECRET_KEY="sk_test_placeholder"

# 2. Generate manifests
node dist/index.js generate manifests \
  -f templates/solopreneur-pack.template.json \
  -o /tmp/k8s-deploy

# 3. Deploy (namespace first)
kubectl apply -f /tmp/k8s-deploy/solopreneur-namespace.json
sleep 2
kubectl apply -f /tmp/k8s-deploy/

# 4. Wait for startup and verify
sleep 30
kubectl -n solopreneur get pods
```

**Expected:**
```
NAME                              READY   STATUS    RESTARTS   AGE
solo-assistant-xxx                1/1     Running   0          38s
solo-content-xxx                  1/1     Running   0          38s
solo-metrics-xxx                  1/1     Running   0          38s
solo-seo-xxx                      1/1     Running   0          38s
solo-social-xxx                   1/1     Running   0          38s
```

**Stability check — wait 5 minutes:**
```bash
sleep 300
kubectl -n solopreneur get pods
# All pods should still show RESTARTS=0
```

**Pass criteria:**
- All 5 pods reach `1/1 Running` within 60s
- After 5 minutes, all pods show `0` restarts

---

## Scenario 28 — K8s Cluster: Verify container security context

**Goal:** Confirm containers run as non-root with a read-only filesystem and
dropped capabilities.

**Steps:**

```bash
POD=$(kubectl -n solopreneur get pods -l agent=solo-assistant -o name | head -1)

# Check running user (should be UID 1000, not root)
kubectl -n solopreneur exec $POD -- id
# Expected: uid=1000(node) gid=1000(node)

# Check read-only root filesystem
kubectl -n solopreneur exec $POD -- sh -c 'touch /app/test 2>&1' || echo "EXPECTED_FAIL"

# Check writable tmp
kubectl -n solopreneur exec $POD -- sh -c 'touch /tmp/test && echo OK'

# Check home dir writable
kubectl -n solopreneur exec $POD -- sh -c 'touch /home/node/.openclaw/test && echo OK'
```

**Pass criteria:**
- Container runs as `uid=1000(node)`
- `/app` is read-only, `/tmp` and `/home/node/.openclaw` are writable

---

## Scenario 29 — K8s Cluster: Verify config and workspace files

**Goal:** Confirm OpenClaw config is valid JSON and SOUL.md is written.

**Steps:**

```bash
POD=$(kubectl -n solopreneur get pods -l agent=solo-content -o name | head -1)

# Check config.json
kubectl -n solopreneur exec $POD -- cat /home/node/.openclaw/openclaw.json | python3 -m json.tool > /dev/null && echo "Valid JSON"

# Check SOUL.md
kubectl -n solopreneur exec $POD -- cat /workspace/shared/SOUL.md | head -5

# Verify no 'integrations' key
kubectl -n solopreneur exec $POD -- sh -c 'cat /home/node/.openclaw/openclaw.json' | python3 -c "
import json, sys
c = json.load(sys.stdin)
assert 'integrations' not in c, 'integrations should be stripped!'
print('OK: no integrations key')
"
```

**Pass criteria:**
- Config is valid JSON
- SOUL.md exists with agent instructions
- No `integrations` top-level key in config

---

## Scenario 30 — K8s Cluster: Cleanup

**Steps:**

```bash
kubectl delete namespace solopreneur
```

**Pass criteria:** Namespace and all resources deleted.

---

## Test Results Summary

Fill in after running:

| # | Scenario | Status | Notes |
|---|---|---|---|
| 01 | CLI help & version | | |
| 02 | CLI doctor | | |
| 03 | Validate all templates | | 10 templates |
| 04 | CLI init | | 10 templates listed |
| 05 | Generate manifests offline | | 27 files for solopreneur-pack |
| 06 | CLI images | | 5 images |
| 07 | Serve API startup | | templates, images, runtimes, doctor |
| 08 | API validate & init | | |
| 09 | API config CRUD | | |
| 10 | Deploy via SSE stream (offline) | | |
| 11 | Dashboard command | | all-in-one start |
| 12 | Dashboard navigation | | 8 sidebar pages |
| 13 | Dashboard templates + deploy | | 10 cards, SSE modal |
| 14 | Dashboard config editor | | load/format/validate/save |
| 15 | Dashboard validate page | | |
| 16 | Dashboard images page | | 5 images |
| 17 | Dashboard runtimes page | | 5 runtimes |
| 18 | Dashboard doctor page | | 5 checks |
| 19 | Dashboard settings page | | persist to settings.json |
| 20 | Dashboard deployment detail | | pods, scale, logs |
| 21 | CLI gitagent-from-repo | | git-clone init container |
| 22 | CLI managed-agents-demo | | 3 agents (new template) |
| 23 | End-to-end dev workflow | | single dashboard command |
| 24 | Automated: unit tests | | 194 tests |
| 25 | Automated: CLI E2E tests | | 100 tests |
| 26 | Automated: Playwright E2E | | 21 tests |
| 27 | K8s: Deploy solopreneur-pack | | 5/5 pods |
| 28 | K8s: Security context | | non-root, read-only |
| 29 | K8s: Config & workspace files | | valid JSON, SOUL.md |
| 30 | K8s: Cleanup | | namespace deleted |

---

## Reporting Failures

When reporting a failure, include:

1. **Scenario number + step** (e.g. "Scenario 13, step 3")
2. **Actual behavior** (what happened)
3. **Expected behavior** (what should have happened)
4. **Terminal output or screenshot**
5. **OS + Node version** (`node --version`)
