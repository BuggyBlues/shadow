# Task 15: Template Migration to Plugin Config

> **Priority**: P2 (Wave 3 — after plugins exist)  
> **Depends on**: Task 03 (shadowob plugin), Tasks 04-11 (plugin implementations)  
> **Estimated**: ~300 lines  
> **Output**: Updated template files in `templates/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 5.2 (Example config with plugins)
- `spec/plugin-development-guide.md` — Config section
- `templates/` — All 11 template files (current format)

Study the existing templates to understand their current structure. Each template is a JSON file that represents a `shadowob-cloud.json` config.

## Objective

Migrate all 11 templates from using the old hardcoded `plugins.shadowob` format to the new generic `plugins` format that references proper plugins.

## Current Template Format

Currently, templates use:
```json
{
  "plugins": {
    "shadowob": {
      "servers": [...],
      "buddies": [...],
      "bindings": [...]
    }
  }
}
```

## New Template Format

Templates should use the new generic plugin format and reference multiple plugins:

```json
{
  "plugins": {
    "shadowob": {
      "enabled": true,
      "config": {
        "servers": [...],
        "buddies": [...],
        "bindings": [...]
      }
    },
    "github": {
      "enabled": true,
      "secrets": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      },
      "config": {
        "org": "my-org",
        "repos": ["my-repo"]
      },
      "agents": {
        "code-reviewer": {
          "config": { "autoReview": true }
        }
      }
    },
    "slack": {
      "enabled": false,
      "secrets": {
        "SLACK_BOT_TOKEN": "${env:SLACK_BOT_TOKEN}"
      },
      "config": {
        "mentionOnly": true
      }
    }
  }
}
```

## Deliverables

### Template Migration Plan

For each template, update the `plugins` section:

| Template | Current Plugins | New Plugins |
|----------|----------------|-------------|
| `shadowob-cloud.template.json` | shadowob | shadowob |
| `solopreneur-pack.template.json` | shadowob | shadowob, slack (optional), github (optional) |
| `code-review-team.template.json` | shadowob | shadowob, github |
| `customer-support-team.template.json` | shadowob | shadowob, slack (optional), intercom (optional) |
| `devops-team.template.json` | shadowob | shadowob, github, sentry (optional), vercel (optional) |
| `metrics-team.template.json` | shadowob | shadowob, posthog (optional), stripe (optional) |
| `research-team.template.json` | shadowob | shadowob, notion (optional), firecrawl (optional) |
| `security-team.template.json` | shadowob | shadowob, github, sentry (optional) |
| `managed-agents-demo.template.json` | shadowob | shadowob |
| `gitagent-from-repo.template.json` | shadowob | shadowob, github |

### Migration Rules

1. **Wrap existing shadowob config**: Move `plugins.shadowob.servers/buddies/bindings` inside `plugins.shadowob.config`
2. **Add relevant plugins**: Based on template purpose, add 1-3 relevant plugins as `enabled: false` with placeholder config and secret references
3. **Use `${env:VAR}` for secrets**: All secret values use environment variable references
4. **Keep optional plugins disabled**: Additional plugins are included as `enabled: false` so users can enable them
5. **Preserve all existing deployment config**: Don't change anything outside `plugins`

### Example Migration

**Before** (`code-review-team.template.json`):
```json
{
  "plugins": {
    "shadowob": {
      "servers": [{ "id": "code-hq", "name": "Code Review HQ" }],
      "buddies": [{ "id": "reviewer", "name": "Code Reviewer" }],
      "bindings": [...]
    }
  },
  "deployments": { ... }
}
```

**After**:
```json
{
  "plugins": {
    "shadowob": {
      "enabled": true,
      "config": {
        "servers": [{ "id": "code-hq", "name": "Code Review HQ" }],
        "buddies": [{ "id": "reviewer", "name": "Code Reviewer" }],
        "bindings": [...]
      }
    },
    "github": {
      "enabled": false,
      "secrets": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      },
      "config": {
        "org": "your-org",
        "repos": ["your-repo"],
        "autoReview": true
      },
      "agents": {
        "code-reviewer": {
          "config": { "autoReview": true, "reviewStyle": "thorough" }
        }
      }
    }
  },
  "deployments": { ... }
}
```

## Acceptance Criteria

1. All 11 templates use the new `plugins.{name}.config` wrapper format
2. Shadowob config is wrapped correctly (backward compatible)
3. Relevant optional plugins are added (disabled) for each template
4. All secret values use `${env:VAR}` references (no hardcoded secrets)
5. Existing deployment config is unchanged
6. `POST /api/init` with any template still works (templates validate correctly)
7. Unit test update: existing template tests pass after migration

## Files Modified

```
templates/shadowob-cloud.template.json
templates/solopreneur-pack.template.json
templates/code-review-team.template.json
templates/customer-support-team.template.json
templates/devops-team.template.json
templates/metrics-team.template.json
templates/research-team.template.json
templates/security-team.template.json
templates/managed-agents-demo.template.json
templates/gitagent-from-repo.template.json
```

## Important

- **DO NOT modify `deployments` section** — only change `plugins`
- **DO NOT remove the `shadowob` plugin** — it must still work for all templates
- **Check that `POST /api/validate` passes** for each migrated template
