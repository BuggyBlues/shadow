# Contributing

Thank you for your interest in contributing to Shadow! This document provides guidelines for contributing.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/buggyblues/shadow/issues) to avoid duplicates
2. Create a [new issue](https://github.com/buggyblues/shadow/issues/new) with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)

### Suggesting Features

1. Open a [new issue](https://github.com/buggyblues/shadow/issues/new) with the `enhancement` label
2. Describe the feature and its use case
3. Discuss with maintainers before implementing

### Submitting Code

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/shadow.git
   cd shadow
   ```
3. **Create** a feature branch:
   ```bash
   git checkout -b feat/my-feature main
   ```
4. **Make** your changes following the [Development Guide](Development-Guide.md)
5. **Test** your changes:
   ```bash
   pnpm lint
   pnpm test
   ```
6. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(web): add voice channel support"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feat/my-feature
   ```
8. **Open** a Pull Request against `main`

## Pull Request Guidelines

- One feature/fix per PR
- Include tests for new functionality
- Update documentation if needed
- Add i18n translation keys to all locale files
- Ensure Biome linting passes
- Write a clear PR description explaining what and why

## Development Setup

See [Installation](Installation.md) for the full setup guide.

Quick start:

```bash
pnpm install
docker compose up postgres redis minio -d
pnpm dev
```

## Project Structure

See [Monorepo Structure](Monorepo-Structure.md) for a detailed breakdown.
