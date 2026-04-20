# shadowob-cloud

Deploy AI agents to Kubernetes with a single command.

```bash
shadowob-cloud init --template solopreneur-pack
shadowob-cloud validate
shadowob-cloud up
```

## Install

```bash
npm install -g @shadowob/cloud
# or
pnpm add -g @shadowob/cloud
```

Verify:

```bash
shadowob-cloud --version
shadowob-cloud doctor      # checks kubectl, docker, pulumi
```

## Getting Started

### 1. Create a config

```bash
shadowob-cloud init                          # interactive — creates shadowob-cloud.json
shadowob-cloud init --template devops-team   # from a preset template
shadowob-cloud init --list                   # list all available templates
```

### 2. Set API keys

Templates use `${env:VAR_NAME}` to reference secrets. Set the required keys before deploying:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

### 3. Validate

```bash
shadowob-cloud validate                   # schema + security + template ref checks
shadowob-cloud validate --strict          # also fails on unresolvable env vars
```

### 4. Deploy

```bash
shadowob-cloud up                         # deploy to your current kubectl context
shadowob-cloud up --local                 # spin up a local Kind cluster first
```

### 5. Monitor

```bash
shadowob-cloud status                     # deployments & pods overview
shadowob-cloud logs <agent-id>            # stream agent logs
shadowob-cloud dashboard                  # open the web dashboard
```

### 6. Manage

```bash
shadowob-cloud scale <agent-id> --replicas 3
shadowob-cloud down                       # tear down all resources
```

## Templates

Pre-built agent team templates:

| Template | Agents | Description |
|---|---|---|
| `solopreneur-pack` | 5 | Content writer, SEO monitor, metrics analyst, social manager, personal assistant |
| `devops-team` | 3 | Infrastructure monitor, CI/CD watcher, incident responder |
| `code-review-team` | 3 | Code reviewer, security scanner, docs auditor |
| `customer-support-team` | 2 | Support triage, issue resolver |
| `metrics-team` | 2 | Data analyst, anomaly alerter |
| `security-team` | 3 | Vulnerability scanner, dependency auditor, secrets detective |
| `research-team` | 3 | Market researcher, competitor monitor, digest curator |
| `shadowob-cloud` | 1 | Self-managing cloud agent |
| `gitagent-from-repo` | 1 | Agent loaded from a Git repository |
| `managed-agents-demo` | 3 | Demo: vault isolation, permissions, networking |

Write your own — see [Config Reference](#config-reference) below.

## CLI Commands

| Command | Description |
|---|---|
| `shadowob-cloud init` | Generate an `shadowob-cloud.json` config |
| `shadowob-cloud validate` | Validate config (schema, security, refs) |
| `shadowob-cloud up` | Deploy agents to Kubernetes |
| `shadowob-cloud down` | Destroy all deployed resources |
| `shadowob-cloud status` | Show deployment & pod status |
| `shadowob-cloud logs <id>` | Stream agent logs |
| `shadowob-cloud scale <id>` | Scale agent replicas |
| `shadowob-cloud dashboard` | Open web dashboard |
| `shadowob-cloud serve` | Start API server + dashboard |
| `shadowob-cloud generate manifests` | Export K8s manifests (offline) |
| `shadowob-cloud generate openclaw-config` | Export OpenClaw configs (debug) |
| `shadowob-cloud doctor` | Check prerequisites |
| `shadowob-cloud build` | Build Docker images for Git agents |
| `shadowob-cloud images` | Manage runner images |
| `shadowob-cloud cluster init` | Bootstrap k3s on bare servers |
| `shadowob-cloud cluster import` | Register an existing kubeconfig locally |
| `shadowob-cloud cluster status` | Check SSH + k3s health on all nodes |
| `shadowob-cloud cluster list` | List all registered clusters |
| `shadowob-cloud cluster kubeconfig <name>` | Print kubeconfig path |
| `shadowob-cloud cluster destroy` | Uninstall k3s and remove local files |

## Bare-Server Cluster Management

Deploy to cloud servers (Ubuntu/Debian) over SSH with a single command — no existing K8s required.

### How it works

1. `cluster init` — SSH into each server, install k3s, form the cluster, store kubeconfig at `~/.shadow-cloud/clusters/<name>.yaml`
2. `up --cluster <name>` — Pulumi uses the stored kubeconfig to deploy agents to that cluster

### 1. Write a cluster.json

```jsonc
{
  "name": "prod",
  "nodes": [
    {
      "role": "master",
      "host": "1.2.3.4",
      "user": "root",
      "sshKeyPath": "~/.ssh/id_rsa"
    },
    {
      "role": "worker",
      "host": "1.2.3.5",
      "user": "root",
      "password": "${env:SERVER_PASSWORD}"
    }
  ]
}
```

Credentials never stored on disk — use `${env:VAR}` for passwords.

### 2. Bootstrap k3s

```bash
shadowob-cloud cluster init                        # default: reads cluster.json
shadowob-cloud cluster init --config my-cluster.json
shadowob-cloud cluster init --force                # reinstall k3s even if already present
```

**Re-initializing safely:** If k3s is already installed on a node, `init` skips that node by default. Pass `--force` to fully reinstall (uninstalls first, then reinstalls).

### 3. Deploy agents

```bash
shadowob-cloud up --cluster prod
shadowob-cloud up --cluster prod --stack prod      # use a named Pulumi stack
shadowob-cloud up --cluster prod --skip-provision  # skip Shadow resource provisioning
```

### 4. Manage the cluster

```bash
shadowob-cloud cluster status                      # SSH health + k3s version on each node
shadowob-cloud cluster list                        # list all registered clusters
shadowob-cloud cluster kubeconfig prod             # print kubeconfig path (use with kubectl)

export KUBECONFIG=$(shadowob-cloud cluster kubeconfig prod)
kubectl get pods -n my-team
```

### 5. Share cluster access across machines

Another developer on a different machine can register the same cluster without running `init` again:

```bash
# On any machine that has the kubeconfig file:
shadowob-cloud cluster import --name prod --file ./prod.yaml
shadowob-cloud up --cluster prod
```

### 6. Tear down

```bash
shadowob-cloud cluster destroy                     # confirms prompt
shadowob-cloud cluster destroy --yes               # skip confirmation
```

Runs `k3s-uninstall.sh` (master) and `k3s-agent-uninstall.sh` (workers) over SSH, then removes `~/.shadow-cloud/clusters/prod.*`.

## Dashboard

```bash
shadowob-cloud dashboard    # builds (if needed) and opens the web UI
```

**Pages:** Templates (browse & one-click deploy), Overview (deployment status), Settings (API keys & cluster config). Deploy progress is streamed in real-time via SSE.

## Config Reference

### File structure

```jsonc
{
  "version": "1",
  "name": "My Agent Team",
  "description": "What this team does",

  // Shadow server/channel/buddy config
  "plugins": {
    "shadowob": {
      "servers": [{ "id": "srv1", "name": "Server" }],
      "buddies": [{ "id": "bot1", "name": "Bot" }],
      "bindings": [{
        "targetId": "bot1",
        "targetType": "buddy",
        "servers": ["srv1"],
        "channels": ["ch1"],
        "agentId": "my-agent"
      }]
    }
  },

  // AI provider registry
  "registry": {
    "providers": [{
      "id": "anthropic",
      "api": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "${env:ANTHROPIC_API_KEY}",
      "models": [{ "id": "claude-sonnet-4-5" }]
    }],
    "configurations": [{
      "id": "base",
      "openclaw": { "tools": [{ "name": "search", "enabled": true }] }
    }]
  },

  // Agent deployments
  "deployments": {
    "namespace": "my-team",
    "agents": [{
      "id": "my-agent",
      "runtime": "openclaw",
      "identity": {
        "name": "Agent Name",
        "systemPrompt": "You are a helpful agent."
      },
      "configuration": { "extends": "base" },
      "resources": {
        "requests": { "cpu": "100m", "memory": "256Mi" },
        "limits": { "cpu": "500m", "memory": "512Mi" }
      }
    }]
  }
}
```

### Template variables

| Syntax | Description |
|---|---|
| `${env:VAR_NAME}` | Environment variable |
| `${secret:k8s/secret-name/key}` | Kubernetes Secret reference |

### API type normalization

| Config value | Normalized to |
|---|---|
| `anthropic` | `anthropic-messages` |
| `openai` | `openai-completions` |
| `google` | `google-generative-ai` |
| `bedrock` | `bedrock-converse-stream` |

### Configuration inheritance

```jsonc
{
  "configuration": {
    "extends": "base",           // inherits from registry.configurations[id="base"]
    "openclaw": {                // deep-merged (arrays replaced, not appended)
      "tools": [{ "name": "extra-tool", "enabled": true }]
    }
  }
}
```

## Managed Agents Features

### Vault — per-agent secret isolation

Each agent can reference a named vault, generating isolated K8s Secrets:

```jsonc
{
  "vaults": {
    "default": {
      "providers": { "anthropic": { "apiKey": "${env:ANTHROPIC_API_KEY}" } },
      "secrets": { "github-token": "${env:GITHUB_TOKEN}" }
    },
    "restricted": {
      "providers": { "anthropic": { "apiKey": "${env:RESTRICTED_KEY}" } }
    }
  },
  "deployments": {
    "agents": [
      { "id": "main-agent", "vault": "default", ... },
      { "id": "sandboxed", "vault": "restricted", ... }
    ]
  }
}
```

### Per-tool permission policies

Control which tools auto-execute vs. require human approval:

```jsonc
{
  "permissions": {
    "default": "approve-reads",
    "tools": {
      "bash": "always-ask",
      "web-fetch": "always-allow",
      "mcp-*": "always-ask"
    },
    "nonInteractive": "deny"
  }
}
```

Levels: `always-allow` | `approve-reads` | `always-ask` | `deny-all`

### Per-agent networking

Each agent gets its own K8s NetworkPolicy:

```jsonc
{
  "networking": {
    "type": "limited",          // "unrestricted" | "limited" | "deny-all"
    "allowedHosts": ["api.anthropic.com"],
    "allowMcpServers": true,
    "allowPackageManagers": false
  }
}
```

### Agent versioning

Version annotations on K8s Deployments for rollback tracking:

```jsonc
{
  "id": "my-agent",
  "version": "1.2.0",
  "changelog": "Added web search tool"
}
```

Generates: `shadowob-cloud/agent-version`, `shadowob-cloud/deployed-at`, `shadowob-cloud/changelog` annotations.

## Security

All pods are hardened by default:

- **Non-root** — `runAsUser: 1000`, `runAsNonRoot: true`
- **Read-only rootfs** — writable only in `/tmp`, `/home/node/.openclaw`, `/var/log/openclaw`
- **Dropped capabilities** — `drop: ["ALL"]`, no privilege escalation
- **Seccomp** — `RuntimeDefault` profile
- **NetworkPolicy** — per-agent deny-all ingress with explicit allow rules
- **Inline key detection** — `shadowob-cloud validate` rejects configs with hardcoded API keys

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │           Interface Layer            │
                    │   ┌──────────┐    ┌──────────────┐  │
                    │   │   CLI    │    │  HTTP/REST   │  │
                    │   │ commands │    │  + Dashboard  │  │
                    │   └────┬─────┘    └──────┬───────┘  │
                    └────────┼─────────────────┼──────────┘
                             │                 │
                    ┌────────▼─────────────────▼──────────┐
                    │           Service Layer (IoC)        │
                    │  ┌────────┐ ┌──────────┐ ┌───────┐  │
                    │  │ Config │ │ Manifest │ │Deploy │  │
                    │  │Service │ │ Service  │ │Service│  │
                    │  ├────────┤ ├──────────┤ ├───────┤  │
                    │  │Provis- │ │ Template │ │  K8s  │  │
                    │  │ioning │ │ Service  │ │Service│  │
                    │  └────────┘ └──────────┘ └───────┘  │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────▼─────────────────────┐
                    │           Core Modules               │
                    │  config/ infra/ runtimes/ utils/     │
                    └─────────────────────────────────────┘
```

The service layer can be used as a programmatic SDK:

```typescript
import { createContainer } from '@shadowob/cloud'

const container = createContainer()
const config = container.config.parseFile('shadowob-cloud.json')
const resolved = container.config.resolve(config)
const manifests = container.manifest.build({ config: resolved, namespace: 'shadowob-cloud' })
await container.deploy.up({ filePath: 'shadowob-cloud.json' })
```

## Development

```bash
pnpm install
pnpm --filter @shadowob/cloud build             # build CLI
pnpm --filter @shadowob/cloud dashboard:build    # build dashboard
pnpm --filter @shadowob/cloud test               # 194 unit tests
pnpm --filter @shadowob/cloud test:e2e:cli       # 100 CLI E2E tests
```

## License

See [LICENSE](../../LICENSE).
