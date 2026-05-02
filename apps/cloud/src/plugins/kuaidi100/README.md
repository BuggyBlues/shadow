# Kuaidi100 Plugin

Kuaidi100 supports logistics workflows for express tracking, global carrier lookup, shipment status explanation, delivery estimates, logistics exceptions, and return shipment support.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `KUAIDI100_KEY` | Yes | Yes | Kuaidi100 API key. |
| `KUAIDI100_CUSTOMER` | Yes | No | Kuaidi100 customer ID. |

## Setup

1. Open the Kuaidi100 API platform.
2. Create or select an application with logistics tracking access.
3. Copy the API key into `KUAIDI100_KEY`.
4. Copy the customer ID into `KUAIDI100_CUSTOMER`.
5. Deploy the Buddy.
6. Verify with a read-only tracking lookup before enabling customer-facing support workflows.

## Runtime Assets

- Exposes connector metadata and prompt guidance for logistics tracking and return-support workflows.

## References

- [Kuaidi100 MCP server](https://api.kuaidi100.com/document/mcp-summary)
- [Kuaidi100 API platform](https://api.kuaidi100.com)
