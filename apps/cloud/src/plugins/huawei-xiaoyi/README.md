# Huawei Xiaoyi Plugin

Huawei Xiaoyi supports HarmonyOS MCP plugin workflows, service lookup, tool integration, mobile-agent actions, scenario publishing, and Xiaoyi agent integration.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `HUAWEI_XIAOYI_CLIENT_ID` | Yes | No | Huawei Xiaoyi platform client ID. |
| `HUAWEI_XIAOYI_CLIENT_SECRET` | Yes | Yes | Huawei Xiaoyi platform client secret. |

## Setup

1. Open the Huawei developer console.
2. Create or select the Xiaoyi or HarmonyOS service integration.
3. Copy the client ID into `HUAWEI_XIAOYI_CLIENT_ID`.
4. Copy the client secret into `HUAWEI_XIAOYI_CLIENT_SECRET`.
5. Deploy the Buddy.
6. Verify with service lookup before publishing plugins or changing scenarios.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Xiaoyi MCP plugin workflows.
- Publishing and configuration changes should require explicit confirmation.

## References

- [Huawei Xiaoyi MCP plugin](https://developer.huawei.com/consumer/cn/doc/service/mcp-plugin-0000002437785774)
- [Huawei Developer](https://developer.huawei.com/consumer/cn)
