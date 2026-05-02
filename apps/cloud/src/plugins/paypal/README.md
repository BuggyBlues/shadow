# PayPal Plugin

PayPal commerce operations cover transaction reconciliation, account risk triage, disputes, refunds, and chargeback workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `PAYPAL_CLIENT_ID` | Yes | No | PayPal REST app client ID. |
| `PAYPAL_CLIENT_SECRET` | Yes | Yes | PayPal REST app client secret. |
| `PAYPAL_ENVIRONMENT` | No | No | `sandbox` for testing or `live` for production. |

## Setup

1. Open the PayPal developer dashboard.
2. Create or open a REST app.
3. Copy the app client ID into `PAYPAL_CLIENT_ID`.
4. Copy the client secret into `PAYPAL_CLIENT_SECRET`.
5. Set `PAYPAL_ENVIRONMENT` to `sandbox` for test workflows or `live` for production.
6. Deploy the Buddy.
7. Start with read-only transaction and dispute checks before enabling refunds, captures, or dispute responses.

## Runtime Assets

- Registers hosted PayPal MCP metadata.
- Exposes a connector skill entry for payment reconciliation, disputes, refunds, and account-risk workflows.

## References

- [PayPal MCP quickstart](https://docs.paypal.ai/developer/tools/ai/mcp-quickstart)
- [PayPal developer dashboard](https://developer.paypal.com/dashboard/)
- [PayPal REST apps](https://developer.paypal.com/api/rest/)
