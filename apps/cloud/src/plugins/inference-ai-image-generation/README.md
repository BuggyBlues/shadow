# AI Image Generation Plugin

AI Image Generation uses inference.sh models for text-to-image, image editing, inpainting, LoRA workflows, upscaling, product mockups, concept art, and marketing visuals.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `INFSH_API_KEY` | Yes | Yes | API key used by the `belt` CLI and image-generation skills. |

## Setup

1. Sign in to inference.sh.
2. Create or copy an API key from your inference.sh account settings.
3. Add the key as `INFSH_API_KEY` in the deployment form or secret group.
4. Deploy the Buddy.
5. Run the verification check to confirm the `belt` CLI is installed and the image skills are mounted.

## Runtime Assets

- Installs the `belt` CLI with the official inference.sh installer.
- Mounts image-focused skills from `infsh-skills/skills`, including `ai-image-generation`, `gpt-image`, `flux-image`, `p-image`, `p-image-edit`, `image-upscaling`, and `background-removal`.

## References

- [AI Image Generation skill](https://skills.sh/infsh-skills/skills/ai-image-generation)
- [inference.sh skills](https://inference.sh/skills)
- [inference.sh CLI setup](https://inference.sh/docs/extend/cli-setup)
- [inference.sh authentication](https://inference.sh/docs/api/authentication)
- [infsh-skills repository](https://github.com/infsh-skills/skills)
