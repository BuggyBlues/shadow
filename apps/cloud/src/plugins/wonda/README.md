# Wonda Plugin

Wonda gives a Buddy a content-production CLI for images, videos, music, audio, editing, social research, social publishing, credential workflows, and mobile-device automation.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `WONDA_API_KEY` | No | Yes | Optional key for authenticated Wonda generation and account features. |

## Setup

1. Enable the `wonda` plugin.
2. If authenticated generation is needed, sign in to Wonda and copy an API key or account token from the Wonda settings page.
3. Add the value as `WONDA_API_KEY`.
4. Deploy the Buddy.
5. Run the verification check to confirm `wonda --version` works.

## Runtime Assets

- Installs the `@degausai/wonda` npm CLI.
- Mounts the `wonda-cli` skill from `degausai/wonda`.

## References

- [Wonda CLI skill](https://skills.sh/degausai/wonda/wonda-cli)
- [Wonda GitHub repository](https://github.com/degausai/wonda)
- [Wonda account settings](https://app.wondercat.ai/settings/billing)
