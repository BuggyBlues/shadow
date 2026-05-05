## Summary

<!-- Brief description of what this PR does -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (non-breaking change that improves code quality)
- [ ] Documentation
- [ ] CI / build / infrastructure

## Affected areas

- [ ] Server (`apps/server`)
- [ ] Web (`apps/web`)
- [ ] Admin (`apps/admin`)
- [ ] Desktop (`apps/desktop`)
- [ ] Mobile (`apps/mobile`)
- [ ] SDK (`packages/sdk`, `packages/sdk-python`)
- [ ] Shared (`packages/shared`)
- [ ] OpenClaw (`packages/openclaw-shadowob`)
- [ ] CI / Workflows

## Checklist

- [ ] My code follows the project's conventions
- [ ] I have tested my changes locally
- [ ] I have added tests that cover my changes (if applicable)
- [ ] All existing tests pass
- [ ] I have updated documentation (if applicable)

## Security checklist

- [ ] New or changed routes/events/jobs declare the actor, resource, action, scope/capability, and data class.
- [ ] Sensitive service writes accept an `Actor` or go through `PolicyService`; handlers do not make ad hoc authorization decisions only at the route layer.
- [ ] API changes are synced to API docs, TypeScript SDK, and Python SDK.
- [ ] Financial mutations do not credit wallets from ordinary user routes; use verified payment, refund, settlement, task reward, or admin grant paths.
- [ ] Cloud/AI/media/provider changes use existing guards for SSRF, reserved env vars, JSON limits, private media access, and secret redaction.
- [ ] Added or updated tests include at least one denied/unauthorized case for the affected resource.
- [ ] `pnpm check:security-pr` passes locally for security-sensitive changes.
