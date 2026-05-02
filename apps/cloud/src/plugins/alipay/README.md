# Alipay Plugin

Alipay payment operations support order creation, payment status lookup, refunds, refund tracking, reconciliation, and after-sales payment workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `ALIPAY_APP_ID` | Yes | No | Application ID from the Alipay Open Platform app. |
| `ALIPAY_PRIVATE_KEY` | Yes | Yes | Private key used to sign Alipay API requests. |
| `ALIPAY_PUBLIC_KEY` | No | Yes | Alipay public key used to verify responses. |
| `ALIPAY_GATEWAY_URL` | No | No | Gateway URL. Use `https://openapi.alipay.com/gateway.do` for production unless your app uses another environment. |

## Setup

1. Open the Alipay Open Platform console.
2. Create or select an application.
3. Copy the app ID into `ALIPAY_APP_ID`.
4. Generate and upload the app public key in the Alipay console.
5. Paste the matching app private key into `ALIPAY_PRIVATE_KEY`.
6. Add `ALIPAY_PUBLIC_KEY` if your workflow verifies signed responses directly.
7. Deploy the Buddy and start with payment lookup or refund lookup before enabling create or refund actions.

## Runtime Assets

- Exposes connector metadata and prompt guidance for payment, refund, and reconciliation workflows.
- Write actions should require explicit user confirmation.

## References

- [Alipay Payment MCP quickstart](https://opendocs.alipay.com/solution/0ilmhz)
- [Alipay Open Platform](https://opendocs.alipay.com)
