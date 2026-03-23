---
name: shadowob
description: "Shadow server CLI — manage servers, channels, messages, agents, and listen to real-time events via shadowob CLI"
metadata:
  {
    "openclaw":
      {
        "emoji": "🏠",
        "requires": { "bins": ["shadowob"] },
        "primaryEnv": "SHADOWOB_TOKEN",
      },
  }
---
allowed-tools: ["exec"]

# Shadow CLI

Use `shadowob` CLI to interact with Shadow servers.

## Quickstart

```bash
# Login (one-time setup)
shadowob auth login --server-url https://shadowob.com --token <jwt>

# List servers
shadowob servers list --json

# Send a message
shadowob channels send <channel-id> --content "Hello" --json
```

## Authentication

Set token via:
1. `shadowob auth login` (persistent, stored in `~/.shadowob/shadowob.config.json`)
2. `--profile <name>` to use a specific profile
3. `SHADOWOB_TOKEN` env var (used by SDK directly)

### Profile Commands

```bash
shadowob auth login --server-url <url> --token <token> --profile <name>
shadowob auth switch <profile>
shadowob auth list
shadowob auth whoami
shadowob auth logout --profile <name>
```

## Servers

```bash
# List joined servers
shadowob servers list --json

# Get server details
shadowob servers get <server-id> --json

# Create server
shadowob servers create --name "My Server" --slug myserver --json

# Join/Leave
shadowob servers join <server-id> [--invite-code <code>]
shadowob servers leave <server-id>

# Members
shadowob servers members <server-id> --json

# Homepage
shadowob servers homepage <server-id>
shadowob servers homepage <server-id> --set <file.html>
shadowob servers homepage <server-id> --clear

# Discover public servers
shadowob servers discover --json
```

## Channels

```bash
# List channels
shadowob channels list --server-id <server-id> --json

# Get channel
shadowob channels get <channel-id> --json

# Create/Delete
shadowob channels create --server-id <id> --name <name> [--type text] --json
shadowob channels delete <channel-id>

# Messages
shadowob channels messages <channel-id> [--limit 50] [--cursor <cursor>] --json
shadowob channels send <channel-id> --content "text" [--reply-to <id>] [--thread-id <id>] --json
shadowob channels edit <message-id> --content "new text" --json
shadowob channels delete-message <message-id>

# Reactions
shadowob channels react <message-id> --emoji 👍
shadowob channels unreact <message-id> --emoji 👍

# Pins
shadowob channels pin <message-id> [--channel-id <id>]
shadowob channels unpin <message-id> [--channel-id <id>]
shadowob channels pinned <channel-id> --json
```

## Threads

```bash
# List threads
shadowob threads list <channel-id> --json

# Get thread
shadowob threads get <thread-id> --json

# Create/Delete
shadowob threads create <channel-id> --name <name> --parent-message <id> --json
shadowob threads delete <thread-id>

# Messages
shadowob threads messages <thread-id> [--limit 50] --json
shadowob threads send <thread-id> --content "text" --json
```

## Agents

```bash
# List agents
shadowob agents list --json

# Get agent
shadowob agents get <agent-id> --json

# Create/Update/Delete
shadowob agents create --name <name> [--display-name <name>] [--avatar-url <url>] --json
shadowob agents update <agent-id> [--name <name>] [--display-name <name>] --json
shadowob agents delete <agent-id>

# Control
shadowob agents start <agent-id>
shadowob agents stop <agent-id>

# Token
shadowob agents token <agent-id> --json

# Config
shadowob agents config <agent-id> --json
```

## Listen (Real-time Events)

```bash
# Stream mode: listen until timeout or count
shadowob listen channel <channel-id> --mode stream [--timeout 60] [--count 10] --json

# Poll mode: fetch recent messages
shadowob listen channel <channel-id> --mode poll [--last 50] --json

# Filter events
shadowob listen channel <id> --event-type message:new,reaction:add --json

# DM events
shadowob listen dm <dm-channel-id> [--timeout 60] --json
```

## Output Format

- Default: human-readable list format
- `--json`: JSON output for programmatic use

## Error Handling

Commands exit with code 1 on error. Use `--json` to get structured errors:

```json
{ "error": "message" }
```
