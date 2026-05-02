# Firebase Plugin

Firebase AppOps supports Auth, Firestore, Hosting, Security Rules, Cloud Functions, Genkit, AI Logic, Crashlytics, and release diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `FIREBASE_TOKEN` | Yes | Yes | Firebase CLI token for CI-style project operations. |
| `FIREBASE_PROJECT_ID` | No | No | Optional default Firebase project ID. |

## Setup

1. Install or open the Firebase CLI in a trusted local environment.
2. Run `firebase login:ci` or use the current Firebase CLI authentication method for CI environments.
3. Copy the generated token into `FIREBASE_TOKEN`.
4. Add `FIREBASE_PROJECT_ID` if most workflows target one project.
5. Deploy the Buddy.
6. Run the verification check to confirm `firebase --version` works and Firebase skills are mounted.

## Runtime Assets

- Installs `firebase-tools`.
- Installs `firebase-mcp`.
- Mounts official Firebase agent skills from `firebase/agent-skills`.

## References

- [Firebase agent skills](https://firebase.google.com/docs/ai-assistance/agent-skills)
- [Firebase MCP server](https://firebase.google.com/docs/ai-assistance/mcp-server)
- [Firebase CLI for CI systems](https://firebase.google.com/docs/cli#cli-ci-systems)
- [Firebase agent skills repository](https://github.com/firebase/agent-skills)
