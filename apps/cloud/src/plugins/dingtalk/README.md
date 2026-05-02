# DingTalk Plugin

DingTalk supports enterprise operations for contacts, departments, robots, DING messages, tasks, calendars, check-ins, work notices, and application workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `DINGTALK_Client_ID` | Yes | No | DingTalk application Client ID. |
| `DINGTALK_Client_Secret` | Yes | Yes | DingTalk application Client Secret. |
| `ACTIVE_PROFILES` | No | No | Comma-separated DingTalk MCP profiles, or `ALL`. |
| `ROBOT_CODE` | No | No | Application robot code for robot message workflows. |
| `ROBOT_ACCESS_TOKEN` | No | Yes | Custom group robot access token. |
| `DINGTALK_AGENT_ID` | No | No | Agent ID for work notice workflows. |

## Setup

1. Open the DingTalk Open Platform.
2. Create or select an organization application.
3. Copy the Client ID into `DINGTALK_Client_ID`.
4. Copy the Client Secret into `DINGTALK_Client_Secret`.
5. Add robot or work-notice fields only when those workflows are needed.
6. Set `ACTIVE_PROFILES` to the MCP modules the Buddy should use, or leave the default for contacts and robot send-message.
7. Deploy the Buddy and verify with a read-only organization or calendar lookup before enabling sends or updates.

## Runtime Assets

- Registers the `dingtalk-mcp` package through `npx`.
- Defaults `ACTIVE_PROFILES` to `dingtalk-contacts,dingtalk-robot-send-message` when omitted.

## References

- [DingTalk Server API MCP overview](https://open.dingtalk.com/document/ai-dev/dingtalk-server-api-mcp-overview)
- [Create a DingTalk application](https://open.dingtalk.com/document/orgapp/create-an-application)
