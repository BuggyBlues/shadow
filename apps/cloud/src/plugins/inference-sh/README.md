# inference.sh Plugin

inference.sh lets a Buddy run cloud AI apps for images, videos, LLMs, search, audio, 3D, and automation through the `belt` CLI.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `INFSH_API_KEY` | Yes | Yes | API key used by the `belt` CLI. |

## Setup

1. Sign in to inference.sh.
2. Create or copy an API key from your inference.sh account settings.
3. Add the key as `INFSH_API_KEY` in the deployment form or secret group.
4. Deploy the Buddy.
5. Run the verification check to confirm `belt --help` works inside the runtime.

## Runtime Assets

- Installs system prerequisites for the official installer.
- Installs the `belt` CLI with `https://cli.inference.sh`.
- Mounts the `infsh-cli` skill from `infsh-skills/skills`.

## References

- [inference.sh skills](https://inference.sh/skills)
- [inference.sh CLI setup](https://inference.sh/docs/extend/cli-setup)
- [inference.sh authentication](https://inference.sh/docs/api/authentication)
- [infsh-skills repository](https://github.com/infsh-skills/skills)
