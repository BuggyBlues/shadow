# Figma Plugin

Figma Design-to-Code Pro helps a Buddy inspect design files, implement UI, maintain design-system rules, publish Code Connect mappings, and run design QA.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `FIGMA_ACCESS_TOKEN` | Yes | Yes | Figma personal access token for REST API and Code Connect workflows. |
| `FIGMA_TEAM_ID` | No | No | Optional default Figma team ID. |

## Setup

1. Open Figma account settings.
2. Create a personal access token with access to the files and teams the Buddy should inspect.
3. Copy the token into `FIGMA_ACCESS_TOKEN`.
4. If the Buddy should default to one team, copy the team ID from the Figma team URL and set `FIGMA_TEAM_ID`.
5. Deploy the Buddy and run the verification check to confirm the `figma` Code Connect CLI is installed.

## Runtime Assets

- Installs the official `@figma/code-connect` CLI.
- Mounts Figma MCP skills from `figma/mcp-server-guide`, including design implementation, Code Connect, design-system rules, and Figma file usage.

## References

- [Figma skills for MCP](https://help.figma.com/hc/en-us/articles/39166810751895-Figma-skills-for-MCP)
- [Figma MCP server docs](https://developers.figma.com/docs/figma-mcp-server/)
- [Code Connect CLI quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Figma REST API access tokens](https://www.figma.com/developers/api#access-tokens)
- [Figma MCP server guide repository](https://github.com/figma/mcp-server-guide)
