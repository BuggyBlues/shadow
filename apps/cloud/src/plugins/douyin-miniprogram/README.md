# Douyin Mini Program Plugin

Douyin Mini Program supports CI workflows for login, preview, upload, review submission, npm builds, release notes, and version management.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `DOUYIN_MINIPROGRAM_APP_ID` | Yes | No | Douyin Mini Program app ID. |
| `DOUYIN_MINIPROGRAM_PRIVATE_KEY` | No | Yes | Private key or CI credential for automated workflows. |

## Setup

1. Open the Douyin Open Platform.
2. Create or select the target Mini Program.
3. Copy the app ID into `DOUYIN_MINIPROGRAM_APP_ID`.
4. Add `DOUYIN_MINIPROGRAM_PRIVATE_KEY` if the Buddy should run CI or upload workflows.
5. Deploy the Buddy.
6. Verify with configuration checks and preview workflows before upload or review submission.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Douyin Mini Program CLI and CI workflows.
- Upload and review submission actions should require explicit confirmation.

## References

- [Douyin Mini Program CLI](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/dev-tools/developer-instrument/development-assistance/ide-cli)
- [Douyin Open Platform](https://developer.open-douyin.com)
