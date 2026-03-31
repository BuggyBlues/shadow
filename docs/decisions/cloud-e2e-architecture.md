# Cloud E2E Architecture — Decision Record

**Date**: 2026-03-31  
**Status**: Accepted  
**Session**: `.decision-making/session.json`

---

## Context

The `apps/cloud` package provides a CLI (`shadow-cloud`) for deploying OpenClaw AI agents to Kubernetes. After the initial v1 implementation, four critical gaps were identified:

1. **Pulumi not actually deploying** — missing explicit K8s provider context + local state backend; images were not built before deployment
2. **Resource IDs not persisted** — provisioned Shadow server/channel/buddy IDs only lived in memory, making follow-up operations (status, logs) impossible
3. **No image build pipeline** — the CLI had `images build` but no workflow connecting it to the K8s deployment
4. **Fake E2E tests** — `deploy.test.ts` only tested config transformations, not real K8s or Shadow provisioning

---

## Environment (Auto-Detected)

| Property | Value |
|---|---|
| Kubernetes cluster | Rancher Desktop (k3s v1.33.5) |
| kubectl context | `rancher-desktop` |
| Container runtime | Docker (moby) via Rancher Desktop |
| Pulumi | v3.228.0, logged in as `maopeng` |
| nerdctl | Available at `~/.rd/bin/nerdctl` |

**Key finding**: Docker images built with `docker build` are directly accessible to the k3s cluster on Rancher Desktop (moby is used as the CRI). Pods with `imagePullPolicy: IfNotPresent` can use locally built images without registry push.

---

## Decisions

### D1: Image Availability Strategy
**Decision**: `local-ifnotpresent`  
**Rationale**: Rancher Desktop uses moby/Docker as container runtime for k3s. Images built locally with `docker build` are accessible to K8s pods when `imagePullPolicy: IfNotPresent`.  
**Trade-off**: Production deployments still need a registry push. The CLI `images build` command adds `--into-k8s` flag for local builds and `--push` for registry.

### D2: Pulumi State Backend
**Decision**: Local file backend (`file://${HOME}/.shadow-cloud/pulumi`)  
**Rationale**: E2E tests need reproducible, isolated state. Pulumi Cloud backend introduces network dependency and shared state between test runs. Local file backend is self-contained and suitable for CI.  
**Production**: Users can override with `PULUMI_BACKEND_URL` env var.

### D3: Kubernetes Provider Configuration
**Decision**: Explicit `k8s.Provider` with context from config/env  
**Rationale**: Pulumi automation API auto-discovers kubectl context but in multi-context environments this can pick the wrong cluster. All K8s Pulumi resources must receive an explicit provider.  
**Default context**: `rancher-desktop` (can be overridden with `--k8s-context` CLI flag)

### D4: Shadow Server for E2E
**Decision**: Reuse existing docker-compose + `scripts/e2e/seed-screenshot-env.mjs`  
**Rationale**: The project already has a dockerized Shadow server and a seed script that creates test accounts. E2E tests will:
1. Assume docker-compose is running at `http://localhost:3000`
2. Run the seed script to create/retrieve the owner account  
3. Use the owner's `accessToken` as the Shadow user token  
**Environment**: `E2E_ORIGIN=http://localhost:3000` (default matches docker-compose)

### D5: Provision State Persistence
**Decision**: JSON file at `.shadowob/provision-state.json` (relative to config file)  
**Rationale**: Simple, portable, inspectable. Stored alongside the config file so state follows the project. Directory `.shadowob/` is gitignored.  
**Contents**: `{ servers: { configId: realId }, channels: { configId: realId }, buddies: { configId: { agentId, userId, token } } }`

### D6: E2E Test Namespace
**Decision**: `shadowob-cloud-e2e`  
**Rationale**: Fixed namespace makes cleanup deterministic. Cleaned before each run via `kubectl delete namespace shadowob-cloud-e2e --ignore-not-found`.

### D7: E2E Cleanup
**Decision**: Auto-cleanup after tests  
**Rationale**: Keeps cluster clean between runs. Cleanup runs in `afterAll()` hook. On failure, namespace is preserved for debugging (`--no-cleanup` flag can skip cleanup).

### D8: Claude Runner E2E
**Decision**: Skipped (no ANTHROPIC_API_KEY available)  
**Future**: When `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` + `ANTHROPIC_MODEL` are set in `.env.e2e`, add claude-runner tests.

---

## Architecture: Full E2E Pipeline

```
E2E Test Run
├── [Setup] docker-compose check (Shadow server at :3000)
├── [Setup] seed-screenshot-env.mjs → get accessToken
├── [Test] shadow-cloud init → creates shadow-cloud.json template
├── [Test] shadow-cloud validate → validates test config
├── [Test] shadow-cloud generate manifests → outputs K8s YAML
├── [Test] shadow-cloud images build openclaw-runner → docker build
├── [Test] shadow-cloud images build openclaw-runner (cached) → faster
├── [Test] shadow-cloud provision → Shadow server/channels/buddies created
│           ↓ saves .shadowob/provision-state.json
├── [Test] shadow-cloud up → Pulumi deploy to K8s
│           ↓ namespace shadowob-cloud-e2e created
│           ↓ pods: {agentId}-deployment created
│           ↓ services: {agentId}-svc created
│           ↓ configmaps: {agentId}-config created
├── [Test] shadow-cloud status → shows deployments + pods
├── [Test] shadow-cloud status --resources → shows provisioned IDs
├── [Test] shadow-cloud logs --agent {id} → streams log output
├── [Test] shadow-cloud scale {id} 2 → scales to 2 replicas
├── [Test] shadow-cloud scale {id} 1 → scales back to 1
├── [Test] Wait for pods ready → health probe at :3100/health
├── [Test] shadow-cloud down → Pulumi destroy
│           ↓ all K8s resources removed
└── [Cleanup] delete Shadow servers/buddies via API
```

---

## Module Changes

| File | Type | Key Changes |
|---|---|---|
| `src/utils/state.ts` | NEW | Provision state CRUD — load/save/merge |
| `src/utils/k8s-client.ts` | MOD | Add stateDir + kubeContext options to Pulumi workspace |
| `src/infra/shared.ts` | MOD | Create `k8s.Provider` with explicit context, return it |
| `src/infra/agent-deployment.ts` | MOD | Accept provider, add `imagePullPolicy` option |
| `src/infra/networking.ts` | MOD | Accept provider |
| `src/infra/config-resources.ts` | MOD | Accept provider |
| `src/infra/index.ts` | MOD | Pass provider to all resources, expose kubeContext |
| `src/cli/up.ts` | MOD | Add `--k8s-context` + `--state-dir`, persist state |
| `src/cli/provision.ts` | MOD | Persist state, add `--state-dir` |
| `src/cli/status.ts` | MOD | Add `--resources` flag showing persisted IDs |
| `src/cli/images.ts` | MOD | Add `--into-k8s` flag, better pipeline output |
| `__tests__/e2e/helpers.ts` | NEW | Subprocess CLI runner + K8s wait helpers |
| `__tests__/e2e/cli.test.ts` | NEW | Real CLI E2E tests: all 10 commands |
| `__tests__/fixtures/test-cloud.json` | NEW | Test fixture config |
| `.env.e2e.example` | NEW | Template for E2E credentials |

---

## Security Notes

- **Shadow tokens** are stored in K8s Secrets (Opaque), not ConfigMaps
- **API keys** are extracted from config into K8s Secrets automatically by `config-resources.ts`
- **Provision state** at `.shadowob/provision-state.json` contains buddy tokens — gitignored
- **Pulumi local state** at `~/.shadow-cloud/pulumi` — contains K8s resource state, not credentials

---

## Alternative Approaches Considered

### Rejected: kind cluster for E2E
Kind has explicit image loading (`kind load docker-image`) but requires creating a cluster per test run. Rancher Desktop's k3s is already running and Docker images are directly accessible.

### Rejected: Pulumi Cloud backend for E2E
Network dependency, shared state, potential rate limits in CI. Local file backend is more reliable.

### Rejected: Mock Shadow server
Real integration point is the core value. Mocking would make E2E tests hollow.

### Rejected: nerdctl k8s.io namespace build
Rancher Desktop's containerd `k8s.io` namespace is not accessible via nerdctl in this setup. Docker moby images work with `imagePullPolicy: IfNotPresent` on this k3s distribution.
