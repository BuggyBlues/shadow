# Baidu AppBuilder Plugin

Baidu AppBuilder connects a Buddy to Qianfan AppBuilder capabilities such as search, OCR, knowledge retrieval, image understanding, file question answering, and AI capability marketplace workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `BAIDU_APPBUILDER_TOKEN` | Yes | Yes | AppBuilder API token. |
| `BAIDU_APPBUILDER_APP_ID` | No | No | Default AppBuilder app ID for app-specific workflows. |

## Setup

1. Open Baidu Qianfan AppBuilder.
2. Create or select the app or MCP capability you want the Buddy to use.
3. Create an API token with the needed permissions.
4. Paste the token into `BAIDU_APPBUILDER_TOKEN`.
5. Add `BAIDU_APPBUILDER_APP_ID` when the Buddy should target one app by default.
6. Deploy the Buddy and verify with a read-only search, OCR, or knowledge retrieval request.

## Runtime Assets

- Exposes connector metadata and prompt guidance for AppBuilder and Qianfan MCP workflows.
- Write or publish actions should require explicit confirmation.

## References

- [Baidu AppBuilder MCP marketplace](https://ai.baidu.com/ai-doc/AppBuilder/Jlt4dqv3h)
- [Baidu AppBuilder](https://cloud.baidu.com/product/AppBuilder)
