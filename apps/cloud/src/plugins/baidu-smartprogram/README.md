# Baidu Smart Program Plugin

Baidu Smart Program supports small-program development workflows such as login, build checks, preview, publish support, configuration review, and release operations.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `BAIDU_SMARTPROGRAM_APP_KEY` | Yes | No | Baidu Smart Program app key. |
| `BAIDU_SMARTPROGRAM_APP_SECRET` | Yes | Yes | Baidu Smart Program app secret. |

## Setup

1. Open the Baidu Smart Program developer console.
2. Create or select the target Smart Program.
3. Copy the app key into `BAIDU_SMARTPROGRAM_APP_KEY`.
4. Copy the app secret into `BAIDU_SMARTPROGRAM_APP_SECRET`.
5. Deploy the Buddy.
6. Start with project checks and preview workflows before enabling upload or publish actions.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Baidu Smart Program CLI-style workflows.
- Publish and submission workflows should require explicit confirmation.

## References

- [Baidu Smart Program CLI](https://smartprogram.baidu.com/docs/develop/devtools/smartapp_cli_function/)
- [Baidu Smart Program](https://smartprogram.baidu.com)
