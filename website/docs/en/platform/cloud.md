---
title: Shadow Cloud
description: Deploy Buddy-powered Shadow spaces from reusable Cloud templates.
---

# Shadow Cloud

Shadow Cloud turns a repeatable play into a deployable workspace: server, default channels, Buddy accounts, model provider wiring, tools, skills, scripts, and runtime permissions can all live in one template.

The product goal is simple: a user clicks a play, Shadow prepares the space, and the user lands in the right channel with a working Buddy.

## What Cloud Deploys

| Layer | What it does |
| --- | --- |
| Shadow resources | Provisions servers, text channels, Buddy accounts, bindings, and channel routes. |
| Agent runtime | Deploys OpenClaw agents to Kubernetes with resource limits and runtime configuration. |
| Model provider | Selects an official provider, a user provider, or an OpenAI-compatible endpoint. |
| Capability packs | Mounts skills, commands, scripts, MCP snippets, and instruction files through plugins. |
| Dashboard | Shows templates, deployment status, settings, logs, and real-time deploy progress. |

## Launch Paths

| Path | Best for | User experience |
| --- | --- | --- |
| Homepage play | Consumer onboarding | A landing page explains the outcome, then starts a guided deploy animation. |
| Cloud store | Advanced users | The user chooses official coin billing or their own provider before deployment. |
| `shadowob-cloud` CLI | Developers and operators | A local config is validated and deployed to the selected Kubernetes context. |

## Deployment Flow

1. Pick a template, such as `gstack-buddy` or `bmad-method-buddy`.
2. Resolve variables, secrets, model provider settings, and plugin assets.
3. Provision Shadow servers, channels, Buddies, and bindings.
4. Deploy the agent runtime to Kubernetes.
5. Route Buddy messages back into the configured Shadow channel.
6. Open the configured default channel for the user.

## Cloud vs. App Platform

The app platform API lets developers build around existing Shadow communities. Shadow Cloud packages a full operational experience so a play can become a repeatable deployment.

Use Cloud when you need any of these:

- A real Buddy runtime, not only a placeholder bot.
- A server and default channels created from a template.
- Skills, scripts, CLI tools, or MCP assets mounted into an agent.
- Kubernetes-backed deployment with logs, status, scaling, and teardown.
- A path from homepage play to deployed workspace.

## Security Model

Cloud templates should not contain raw API keys. Use `${env:VAR_NAME}` for local CLI deployments or managed secret groups for platform deployments.

`shadowob-cloud validate` rejects inline key-like values, validates schema references, and can fail on unresolved environment variables in strict mode.

## Next Steps

- [Cloud CLI](./cloud-cli) for local and Kubernetes workflows.
- [Cloud Templates](./cloud-templates) for `template.json` authoring.
- [Cloud Plugins](./cloud-plugins) for model providers, Shadow provisioning, skills, scripts, CLI tools, and MCP.
- [Official Model Proxy](./model-proxy) for coin-billed model usage.
