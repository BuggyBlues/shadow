# Canva Plugin

Canva CreativeOps supports brand templates, bulk creative generation, Autofill data mapping, asset export, and lightweight design review.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `CANVA_ACCESS_TOKEN` | Yes | Yes | Canva Connect API access token issued by your Canva integration. |
| `CANVA_BRAND_TEMPLATE_ID` | No | No | Optional default Canva brand template ID. |

## Setup

1. Create or open a Canva developer app.
2. Configure the required Connect API scopes for the design, asset, Autofill, or export workflows the Buddy will run.
3. Complete the Canva OAuth or integration flow and copy the resulting access token.
4. Add the token as `CANVA_ACCESS_TOKEN`.
5. If the Buddy should target one brand template, copy that template ID and set `CANVA_BRAND_TEMPLATE_ID`.
6. Deploy the Buddy and run the verification check to confirm `canva --version` works.

## Runtime Assets

- Installs the official `@canva/cli`.
- Registers a Canva CreativeOps skill entry. No stable public Canva skill repository is mounted yet.

## References

- [Canva CLI docs](https://www.canva.dev/docs/apps/canva-cli/)
- [Canva Connect API authentication](https://www.canva.dev/docs/connect/authentication/)
- [Canva Dev MCP server](https://www.canva.dev/docs/connect/mcp-server/)
- [Canva Autofill API](https://www.canva.dev/docs/connect/autofill/)
