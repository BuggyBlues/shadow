# Google Workspace Plugin

Google Workspace connects a Buddy to Gmail, Calendar, Drive, Docs, Sheets, Chat, Admin, and other Workspace APIs through the official `gws` CLI and its agent skills.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON` | No | Yes | Preferred credentials JSON exported by `gws auth export --unmasked`, or a service-account JSON. |
| `GOOGLE_WORKSPACE_PROJECT_ID` | No | No | Optional Google Cloud project ID. |
| `GOOGLE_WORKSPACE_CLI_SANITIZE_TEMPLATE` | No | No | Optional sanitizer template passed through to the runtime. |

At least one usable `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON` value is required for real Google Workspace API calls. The runtime still accepts older deployment secrets for compatibility, but new templates should use the `gws auth export --unmasked` credentials JSON field.

## Setup

1. Install the official Google Workspace CLI locally.
2. Run the interactive `gws auth login` flow on a trusted machine with a browser.
3. Export credentials with `gws auth export --unmasked`.
4. Paste the exported JSON into `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON`.
5. For server-to-server use cases, paste a service-account JSON into `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON`.
6. Deploy the Buddy.
7. Run verification checks for `gws --version`, `gws auth status`, and small read smoke tests before enabling write workflows.

## Runtime Assets

- Installs `@googleworkspace/cli`.
- Mounts official `gws-*` agent skills from `googleworkspace/cli`.
- Writes credentials JSON into the runtime as private files.

## References

- [Google Workspace CLI](https://github.com/googleworkspace/cli)
- [Google Workspace CLI authentication](https://github.com/googleworkspace/cli#authentication)
- [Google Workspace CLI prerequisites](https://github.com/googleworkspace/cli#prerequisites)
- [Google Workspace APIs](https://developers.google.com/workspace)
