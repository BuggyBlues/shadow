---
title: Cloud CLI
description: Use the standalone shadowob-cloud CLI to validate, deploy, monitor, and manage Buddy templates.
---

# Cloud CLI

`shadowob-cloud` is the standalone deployment CLI for Shadow Cloud. It can create a config from a template, validate secrets and schema, deploy to Kubernetes, open the dashboard, and manage bare-server k3s clusters.

## Install

```bash
npm install -g @shadowob/cloud
# or
pnpm add -g @shadowob/cloud
```

Verify your workstation:

```bash
shadowob-cloud --version
shadowob-cloud doctor
```

`doctor` checks local prerequisites such as `kubectl`, Docker, and Pulumi.

## First Deploy

```bash
shadowob-cloud init --template gstack-buddy
shadowob-cloud validate --strict
shadowob-cloud up
shadowob-cloud status
```

Templates use `${env:VAR_NAME}` for secrets:

```bash
export DEEPSEEK_API_KEY="sk-..."
export SHADOW_SERVER_URL="https://app.example.com"
export SHADOW_USER_TOKEN="..."
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `shadowob-cloud init` | Create `shadowob-cloud.json`, optionally from a built-in template. |
| `shadowob-cloud init --list` | List available templates. |
| `shadowob-cloud validate --strict` | Validate schema, template references, security, and environment variables. |
| `shadowob-cloud up` | Deploy to the current Kubernetes context. |
| `shadowob-cloud up --local` | Start a local Kind cluster before deploying. |
| `shadowob-cloud status` | Show deployments and pods. |
| `shadowob-cloud logs <agent-id>` | Stream agent logs. |
| `shadowob-cloud scale <agent-id> --replicas 3` | Scale an agent deployment. |
| `shadowob-cloud down` | Tear down deployed resources. |
| `shadowob-cloud dashboard` | Open the Cloud dashboard. |
| `shadowob-cloud serve` | Start the API server and dashboard. |
| `shadowob-cloud generate manifests` | Export Kubernetes manifests without applying them. |

## Bare-Server Clusters

Cloud can bootstrap k3s on Ubuntu or Debian servers over SSH.

```bash
shadowob-cloud cluster init --config cluster.json
shadowob-cloud cluster status
shadowob-cloud up --cluster prod
```

A minimal cluster file:

```json
{
  "name": "prod",
  "nodes": [
    {
      "role": "master",
      "host": "1.2.3.4",
      "user": "root",
      "sshKeyPath": "~/.ssh/id_rsa"
    }
  ]
}
```

Kubeconfigs are stored under `~/.shadow-cloud/clusters/<name>.yaml`.

## Local Debugging

```bash
shadowob-cloud generate openclaw-config
shadowob-cloud logs strategy-buddy
shadowob-cloud dashboard
```

Use `generate openclaw-config` when you need to inspect the final model provider, tools, permissions, and Shadow channel configuration that will be mounted into the agent.
