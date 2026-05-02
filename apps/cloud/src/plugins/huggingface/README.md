# Hugging Face Plugin

Hugging Face ModelOps and DatasetOps covers model search, datasets, Spaces, Jobs, evaluations, training workflows, and Hub publishing.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `HF_TOKEN` | Yes | Yes | Hugging Face token for Hub, model, dataset, Space, and Jobs workflows. |
| `HF_ORG` | No | No | Optional default Hugging Face organization. |

## Setup

1. Open Hugging Face settings.
2. Create an access token with the minimum permissions needed for the Buddy.
3. Copy the token into `HF_TOKEN`.
4. If the Buddy should default to one organization, set `HF_ORG`.
5. Deploy the Buddy.
6. Run the verification check to confirm the `hf` CLI is available and the Hugging Face skills are mounted.

## Runtime Assets

- Installs Python prerequisites and the `huggingface_hub[cli]` package.
- Exposes the `hf` CLI in the runtime path.
- Registers the Hugging Face MCP package.
- Mounts official skills from `huggingface/skills`.

## References

- [Hugging Face Agent Skills](https://huggingface.co/docs/hub/agents-skills)
- [Hugging Face CLI for AI agents](https://huggingface.co/docs/hub/agents-cli)
- [Hugging Face MCP server](https://huggingface.co/docs/hub/agents-mcp)
- [Hugging Face access tokens](https://huggingface.co/settings/tokens)
- [Hugging Face skills repository](https://github.com/huggingface/skills)
