# GitHub Plugin

GitHub RepoOps connects a Buddy to repository operations, issue triage, PR review, release notes, CI failure debugging, and automation workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Yes | Yes | GitHub personal access token with the repository, issue, and pull request permissions the Buddy needs. |

## Setup

1. Open GitHub developer settings.
2. Create a fine-grained or classic personal access token.
3. Grant only the repositories and permissions the Buddy needs, such as repository metadata, contents, issues, pull requests, and actions read access.
4. Add the token as `GITHUB_PERSONAL_ACCESS_TOKEN`.
5. Deploy the Buddy.
6. Run a read-only check first, such as repository lookup or issue search, before allowing write actions.

## Runtime Assets

- Exposes the bundled GitHub skill.
- Exposes the `gh` CLI command in plugin metadata.
- Registers GitHub MCP metadata through the official MCP server package.

## References

- [GitHub CLI manual](https://cli.github.com/manual/)
- [GitHub MCP server](https://github.com/github/github-mcp-server)
- [GitHub personal access tokens](https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Fine-grained personal access tokens](https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens)
