# Baidu Netdisk Plugin

Baidu Netdisk file workflows cover user files, file search, upload, folder organization, batch archiving, and personal or enterprise document retrieval.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `BAIDU_NETDISK_ACCESS_TOKEN` | Yes | Yes | Access token authorized for Baidu Netdisk MCP access. |

## Setup

1. Follow the Baidu Netdisk MCP authorization flow.
2. Obtain an access token for the account or application.
3. Paste the token into `BAIDU_NETDISK_ACCESS_TOKEN`.
4. Deploy the Buddy.
5. Verify with a small file list or file search request.
6. Require confirmation before upload, move, delete, share, or archive actions.

## Runtime Assets

- Registers the hosted Baidu Netdisk MCP SSE endpoint.
- Uses bearer-token authentication from `BAIDU_NETDISK_ACCESS_TOKEN`.

## References

- [Baidu Netdisk MCP](https://github.com/baidu-netdisk/mcp)
- [Baidu Netdisk](https://pan.baidu.com)
