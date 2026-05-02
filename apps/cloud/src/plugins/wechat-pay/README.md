# WeChat Pay Plugin

WeChat Pay supports Mini Program and Official Account payment workflows, order creation, payment lookup, refund support, chargeback handling, and commerce triage.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `WECHAT_PAY_MCH_ID` | Yes | No | WeChat Pay merchant ID. |
| `WECHAT_PAY_API_V3_KEY` | Yes | Yes | WeChat Pay API v3 key. |
| `WECHAT_PAY_PRIVATE_KEY` | Yes | Yes | Merchant private key for WeChat Pay requests. |
| `WECHAT_PAY_SERIAL_NO` | No | No | Merchant certificate serial number. |

## Setup

1. Open the WeChat Pay merchant platform.
2. Copy the merchant ID into `WECHAT_PAY_MCH_ID`.
3. Configure and copy the API v3 key into `WECHAT_PAY_API_V3_KEY`.
4. Paste the merchant private key into `WECHAT_PAY_PRIVATE_KEY`.
5. Add `WECHAT_PAY_SERIAL_NO` when your workflow requires certificate selection.
6. Deploy the Buddy and verify with payment status lookup before order creation or refunds.

## Runtime Assets

- Exposes connector metadata and prompt guidance for WeChat Pay MCP-style workflows.
- Order creation and refund actions should require explicit confirmation.

## References

- [WeChat Pay MCP plugin guide](https://yuanqi.tencent.com/guide/wechat-pay-mcp-plugin)
- [WeChat Pay](https://pay.weixin.qq.com)
