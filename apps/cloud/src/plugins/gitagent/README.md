# GitAgent Plugin

GitAgent deploys agents from gitagent-standard Git repositories. It supports runtime cloning with an init container and pre-baked image workflows for controlled releases.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | No | Yes | Personal access token for private HTTPS repositories. |

## Repository Options

| Option | Required | Description |
| --- | --- | --- |
| `git.url` | Yes | Repository URL, using HTTPS or SSH. |
| `git.ref` | No | Branch, tag, or commit SHA. |
| `git.dir` | No | Subdirectory inside the repository. |
| `git.depth` | No | Shallow clone depth. |
| `git.sshKeySecret` | No | Kubernetes secret containing an SSH key. |
| `git.tokenSecret` | No | Kubernetes secret name or env var for an HTTPS token. |
| `strategy` | No | `init-container` or `build-image`. |
| `poll` | No | Live pull interval such as `5m` or `30s`. |

## Setup

1. Prepare a gitagent-standard repository.
2. Set `git.url` and optionally pin `git.ref`.
3. Add `GITHUB_TOKEN`, `git.tokenSecret`, or `git.sshKeySecret` only for private repositories.
4. Use `init-container` for runtime cloning, or `build-image` when the repository should be baked into an image.
5. Deploy the Buddy.
6. Verify that the target repository is mounted at the expected path and that the agent config is loaded.

## Runtime Assets

- Contributes deployment configuration for Git-sourced agents.
- Can add a polling sidecar when `poll` is configured.

## References

- [GitAgent](https://github.com/open-gitagent/gitagent)
- [GitAgent website](https://gitagent.sh/)
