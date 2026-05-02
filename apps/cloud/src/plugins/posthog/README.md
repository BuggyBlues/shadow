# PostHog Plugin

PostHog ProductOps covers funnels, retention, feature flags, experiments, session replay, HogQL, logs, and product-growth diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `POSTHOG_API_KEY` | Yes | Yes | PostHog personal or project API key. |
| `POSTHOG_PROJECT_ID` | No | No | Optional default PostHog project ID. |
| `POSTHOG_HOST` | No | No | Optional PostHog host, for example `https://app.posthog.com` or a self-hosted URL. |

## Setup

1. Open PostHog project or personal API settings.
2. Create an API key with the minimum scopes needed by the Buddy.
3. Add the key as `POSTHOG_API_KEY`.
4. Add `POSTHOG_PROJECT_ID` if the Buddy should default to one project.
5. Add `POSTHOG_HOST` for EU cloud or self-hosted installations.
6. Deploy the Buddy and run the CLI verification check.

## Runtime Assets

- Installs the experimental `posthog-cli` package.
- Registers hosted PostHog MCP metadata.

## References

- [PostHog MCP](https://posthog.com/docs/model-context-protocol)
- [PostHog API overview](https://posthog.com/docs/api/overview)
- [PostHog Endpoints CLI](https://posthog.com/docs/endpoints/cli)
