# Taobao Open Platform / Alibaba AI PAAS Plugin

Taobao Open Platform and Alibaba AI PAAS support ecommerce operations for products, orders, customer service, marketing, shopping guidance, and store workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `TAOBAO_APP_KEY` | Yes | No | Taobao Open Platform app key. |
| `TAOBAO_APP_SECRET` | Yes | Yes | Taobao Open Platform app secret. |
| `TAOBAO_SESSION` | No | Yes | Optional session token for authorized shop operations. |

## Setup

1. Open Alibaba Developer or Taobao Open Platform.
2. Create or select an application with the required ecommerce permissions.
3. Copy the app key into `TAOBAO_APP_KEY`.
4. Copy the app secret into `TAOBAO_APP_SECRET`.
5. Add `TAOBAO_SESSION` for shop-authorized operations.
6. Deploy the Buddy and verify with read-only product, shop, or order lookup.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Alibaba AI PAAS and Taobao ecommerce workflows.
- Store, product, customer, and order mutations should require explicit confirmation.

## References

- [Alibaba AI PAAS MCP services](https://developer.alibaba.com/docs/doc.htm?articleId=122221&docType=1&treeId=843)
- [Alibaba Developer](https://developer.alibaba.com)
