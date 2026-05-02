# Xiaomi MiClaw Plugin

Xiaomi MiClaw supports mobile-agent ecosystem workflows for uploading MCP, Skill, and Agent assets, cloud-phone previews, mobile-agent testing, and skill publishing.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `MICLAW_ACCESS_TOKEN` | Yes | Yes | Xiaomi MiClaw platform access token. |

## Setup

1. Open the Xiaomi developer platform and confirm MiClaw access.
2. Create or copy an access token for the target workspace.
3. Paste the token into `MICLAW_ACCESS_TOKEN`.
4. Deploy the Buddy.
5. Verify with read-only project or asset lookup.
6. Require confirmation before publishing skills, MCP tools, or agents.

## Runtime Assets

- Exposes connector metadata and prompt guidance for MiClaw mobile-agent workflows.

## References

- [Xiaomi MiClaw announcement](https://dev.mi.com/xiaomihyperos/announcement/detail?id=41)
- [Xiaomi Developer](https://dev.mi.com)
