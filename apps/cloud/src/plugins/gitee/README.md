# Gitee Plugin

Gitee provides development workflows for repositories, issues, pull requests, notifications, code lookup, release collaboration, and implementation handoff.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GITEE_ACCESS_TOKEN` | Yes | Yes | Gitee personal access token. |
| `GITEE_API_BASE` | No | No | API base URL. Defaults to `https://gitee.com/api/v5`. |

## Setup

1. Open Gitee personal access token settings.
2. Create a token with the repository, issue, and pull request scopes needed by the Buddy.
3. Paste the token into `GITEE_ACCESS_TOKEN`.
4. Set `GITEE_API_BASE` only when using a compatible non-default endpoint.
5. Deploy the Buddy.
6. Verify with repository and issue lookup before enabling write actions.

## Runtime Assets

- Registers the official `@gitee/mcp-gitee` MCP server through `npx`.
- Defaults `GITEE_API_BASE` to `https://gitee.com/api/v5`.

## References

- [Gitee MCP](https://gitee.com/oschina/mcp-gitee)
- [Gitee personal access tokens](https://gitee.com/profile/personal_access_tokens)
