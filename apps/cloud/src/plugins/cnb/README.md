# CNB Plugin

CNB supports code-collaboration workflows for repository lookup, issue creation, CloudBase-native development support, CI/CD assistance, and project automation.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `CNB_TOKEN` | Yes | Yes | CNB access token. |
| `CNB_ENDPOINT` | No | No | CNB API endpoint. Defaults to `https://cnb.cool`. |

## Setup

1. Open CNB and create an access token with repository and issue permissions.
2. Paste the token into `CNB_TOKEN`.
3. Set `CNB_ENDPOINT` only when using a non-default CNB endpoint.
4. Deploy the Buddy.
5. Verify with repository lookup before enabling issue creation or CI/CD changes.

## Runtime Assets

- Exposes connector metadata and prompt guidance for CNB and CloudBase development workflows.
- Defaults `CNB_ENDPOINT` to `https://cnb.cool` when omitted.

## References

- [CNB MCP on CloudBase](https://docs.cloudbase.net/ai/mcp/develop/server-templates/cloudrun-mcp-cnb)
- [CNB](https://cnb.cool)
