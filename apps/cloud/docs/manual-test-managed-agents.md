# Managed Agents — Manual Test Documentation

> Covers P0 (vault/permissions) and P1 (networking/versioning) features.

## Prerequisites

```bash
cd apps/cloud
pnpm run build
```

---

## Test 1: Validate managed-agents-demo template

```bash
node dist/index.js validate --file templates/managed-agents-demo.template.json --dry-run
```

**Expected:**
- Schema valid
- No inline API keys
- Extends references valid
- `4 env ref(s), 0 secret ref(s), 0 file ref(s)`
- `Config is valid! 3 agent(s), 1 configuration(s), 4 env ref(s)`

---

## Test 2: Generate manifests with vault isolation

```bash
ANTHROPIC_API_KEY=sk-test OPENAI_API_KEY=sk-test GITHUB_TOKEN=gh-test RESTRICTED_ANTHROPIC_KEY=sk-restricted \
  node dist/index.js generate manifests \
    --file templates/managed-agents-demo.template.json \
    --output /tmp/managed-agents-test
```

**Expected:** 16 resource files generated.

### 2a: Verify per-agent secret isolation

```bash
# code-assistant uses vault "default" → 3 keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, github-token)
cat /tmp/managed-agents-test/code-assistant-secrets-secret.json | python3 -m json.tool
# → stringData has 3 entries

# researcher uses vault "restricted" → 1 key (ANTHROPIC_API_KEY only)
cat /tmp/managed-agents-test/researcher-secrets-secret.json | python3 -m json.tool
# → stringData has 1 entry with "restricted-key"

# sandboxed-runner has no vault specified and no vaults config match → empty secret
cat /tmp/managed-agents-test/sandboxed-runner-secrets-secret.json | python3 -m json.tool
```

---

## Test 3: Verify version annotations

```bash
cat /tmp/managed-agents-test/code-assistant-deployment.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['metadata']['annotations'], indent=2))"
```

**Expected:**
```json
{
  "shadowob-cloud/agent-version": "1.0.0",
  "shadowob-cloud/deployed-at": "<ISO timestamp>",
  "shadowob-cloud/changelog": "Initial release with coding assistance"
}
```

---

## Test 4: Verify per-agent NetworkPolicy

### 4a: Limited networking (code-assistant)

```bash
cat /tmp/managed-agents-test/code-assistant-netpol-networkpolicy.json | python3 -m json.tool
```

**Expected:**
- `policyTypes: ["Ingress", "Egress"]`
- Egress allows port 443 (HTTPS) and 53 (DNS)
- Annotation: `shadowob-cloud/allowed-hosts: api.anthropic.com,api.github.com`

### 4b: Unrestricted networking (researcher)

```bash
cat /tmp/managed-agents-test/researcher-netpol-networkpolicy.json | python3 -m json.tool
```

**Expected:**
- `policyTypes: ["Ingress"]` (only ingress restricted)
- No `egress` section

### 4c: Deny-all networking (sandboxed-runner)

```bash
cat /tmp/managed-agents-test/sandboxed-runner-netpol-networkpolicy.json | python3 -m json.tool
```

**Expected:**
- `policyTypes: ["Ingress", "Egress"]`
- Egress only allows DNS (port 53)
- No port 443 in egress

---

## Test 5: Verify permission policy mapping

```bash
# code-assistant: approve-reads default, web-fetch always-allow, mcp-* deny-all
cat /tmp/managed-agents-test/code-assistant-config-configmap.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); c=json.loads(d['data']['config.json']); print(json.dumps(c.get('tools',{}), indent=2))"
```

**Expected:**
```json
{
  "profile": "approve-reads",
  "allow": ["web-fetch"]
}
```

```bash
# researcher: always-allow default, bash/file-write deny-all
cat /tmp/managed-agents-test/researcher-config-configmap.json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); c=json.loads(d['data']['config.json']); print(json.dumps(c.get('tools',{}), indent=2))"
```

**Expected:**
```json
{
  "profile": "dangerously-skip-permissions",
  "deny": ["bash", "file-write"]
}
```

---

## Test 6: Automated test suite

```bash
# Unit tests (188 tests)
npx vitest run

# E2E tests (90 tests — includes managed-agents-demo template)
pnpm run build && npx vitest run --config vitest.cli.config.ts
```

**Expected:** All tests pass.

---

## Summary

| Feature | Status | Verified By |
|---------|--------|-------------|
| Vault per-agent secret isolation | ✅ | Test 2a |
| Permission policy → ACPX mapping | ✅ | Test 5 |
| NetworkPolicy: unrestricted | ✅ | Test 4b |
| NetworkPolicy: limited + allowedHosts | ✅ | Test 4a |
| NetworkPolicy: deny-all | ✅ | Test 4c |
| Version annotations on Deployment | ✅ | Test 3 |
| Template validation (schema + security) | ✅ | Test 1 |
| Full test suite (278 tests) | ✅ | Test 6 |
