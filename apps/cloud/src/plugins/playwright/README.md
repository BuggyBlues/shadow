# Playwright Plugin

Playwright BrowserOps gives a Buddy deterministic browser automation for E2E testing, visual QA, screenshots, trace review, and scripted web workflows.

## Configuration Keys

This plugin does not require credentials.

## Setup

1. Enable the `playwright` plugin on a Buddy.
2. Deploy the Buddy.
3. Run the verification check to confirm `playwright --version` works.
4. Use the Buddy for local or sandboxed browser tasks such as screenshots, traces, and repeatable UI checks.
5. Add separate service credentials only when the tested website or app requires login.

## Runtime Assets

- Installs the `playwright` npm package.
- Installs `@playwright/mcp`.
- Registers Playwright MCP metadata.

## References

- [Playwright docs](https://playwright.dev/docs/intro)
- [Playwright CLI](https://playwright.dev/docs/test-cli)
- [Playwright MCP](https://playwright.dev/docs/mcp)
- [Playwright MCP package](https://www.npmjs.com/package/@playwright/mcp)
