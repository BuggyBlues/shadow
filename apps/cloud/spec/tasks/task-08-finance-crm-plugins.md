# Task 08: Finance & CRM Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~700 lines (9 plugins × ~80 lines each)  
> **Output**: `src/plugins/{stripe,paypal,xero,revenucat,hubspot,intercom,close,apollo,mailchimp}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Hooks reference

## Objective

Create 9 finance and CRM plugins. Finance plugins handle payments/billing, CRM plugins handle customer relationships. Both categories primarily provide **tool** capabilities.

---

## Plugin Specifications

### 1. `stripe` — Stripe

**Capabilities**: tool, webhook, data-source  
**Auth**: api-key

**Auth Fields**:
- `STRIPE_SECRET_KEY` (required, sensitive)
- `STRIPE_WEBHOOK_SECRET` (optional, sensitive) — For webhook endpoint verification

**Config Schema**:
```json
{
  "webhookEvents": {
    "type": "array",
    "items": { "type": "string" },
    "default": ["payment_intent.succeeded", "subscription.created", "invoice.payment_failed"],
    "description": "Stripe event types to receive"
  },
  "webhookDomain": { "type": "string", "description": "Domain for webhook endpoint" },
  "enableTestMode": { "type": "boolean", "default": false }
}
```

**buildK8sResources**: Create webhook Ingress if `webhookDomain` is set.

---

### 2. `paypal` — PayPal

**Capabilities**: tool, webhook  
**Auth**: api-key

**Auth Fields**:
- `PAYPAL_CLIENT_ID` (required, sensitive)
- `PAYPAL_CLIENT_SECRET` (required, sensitive)

**Config Schema**:
```json
{
  "sandbox": { "type": "boolean", "default": false, "description": "Use PayPal sandbox environment" },
  "webhookEvents": { "type": "array", "items": { "type": "string" } }
}
```

---

### 3. `xero` — Xero (Accounting)

**Capabilities**: tool, data-source  
**Auth**: oauth2

**Auth Fields**:
- `XERO_CLIENT_ID` (required, sensitive)
- `XERO_CLIENT_SECRET` (required, sensitive)

**OAuth Config**:
```json
{
  "authorizationUrl": "https://login.xero.com/identity/connect/authorize",
  "tokenUrl": "https://identity.xero.com/connect/token",
  "scopes": ["accounting.transactions", "accounting.contacts"]
}
```

**Config Schema**:
```json
{
  "tenantId": { "type": "string", "description": "Xero tenant/organization ID" }
}
```

---

### 4. `revenucat` — RevenueCat

**Capabilities**: tool, data-source, webhook  
**Auth**: api-key

**Auth Fields**:
- `REVENUECAT_API_KEY` (required, sensitive) — V1 API key
- `REVENUECAT_WEBHOOK_AUTH` (optional, sensitive)

**Config Schema**:
```json
{
  "projectId": { "type": "string", "description": "RevenueCat project ID" },
  "enableWebhooks": { "type": "boolean", "default": false }
}
```

---

### 5. `hubspot` — HubSpot

**Capabilities**: tool, data-source  
**Auth**: token (Private App Token)

**Auth Fields**:
- `HUBSPOT_ACCESS_TOKEN` (required, sensitive) — Private app access token

**Config Schema**:
```json
{
  "pipelines": { "type": "array", "items": { "type": "string" }, "description": "Deal pipeline IDs" },
  "enableContacts": { "type": "boolean", "default": true },
  "enableDeals": { "type": "boolean", "default": true },
  "enableTickets": { "type": "boolean", "default": false }
}
```

---

### 6. `intercom` — Intercom

**Capabilities**: channel, tool, data-source  
**Auth**: token

**Auth Fields**:
- `INTERCOM_ACCESS_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "enableInbox": { "type": "boolean", "default": true, "description": "Listen on Intercom inbox" },
  "autoAssign": { "type": "boolean", "default": false, "description": "Auto-assign conversations to agent" },
  "tags": { "type": "array", "items": { "type": "string" }, "description": "Filter conversations by tags" }
}
```

**Note**: Intercom is also a **channel** plugin — agents can receive and respond to customer conversations.

**buildOpenClawConfig**: Returns both `channels.intercom` and `plugins.entries.intercom`.

---

### 7. `close` — Close CRM

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `CLOSE_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "enableLeads": { "type": "boolean", "default": true },
  "enableOpportunities": { "type": "boolean", "default": true }
}
```

---

### 8. `apollo` — Apollo.io

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `APOLLO_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "enableEnrichment": { "type": "boolean", "default": true, "description": "Enrich contact data" },
  "enableSequences": { "type": "boolean", "default": false, "description": "Enable email sequences" }
}
```

---

### 9. `mailchimp` — Mailchimp

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `MAILCHIMP_API_KEY` (required, sensitive)
- `MAILCHIMP_SERVER_PREFIX` (required, not sensitive) — e.g., "us1"

**Config Schema**:
```json
{
  "audienceId": { "type": "string", "description": "Default audience/list ID" },
  "enableCampaigns": { "type": "boolean", "default": false, "description": "Allow agent to create/send campaigns" }
}
```

---

## Implementation Notes

- **Webhook plugins** (stripe, paypal, revenucat): Implement `buildK8sResources` for Ingress creation.
- **Channel plugins** (intercom): Also produce `channels` config, not just `plugins.entries`.
- **OAuth plugins** (xero): Include full `oauth` config in manifest for console setup wizard.

## Acceptance Criteria

1. All 9 plugins have `manifest.json` + `index.ts`
2. Webhook plugins include `buildK8sResources`
3. Intercom returns both channel and tool config
4. Unit tests: `__tests__/plugins/finance-crm.test.ts` (~80 lines)

## Files Created

```
src/plugins/stripe/manifest.json + index.ts
src/plugins/paypal/manifest.json + index.ts
src/plugins/xero/manifest.json + index.ts
src/plugins/revenucat/manifest.json + index.ts
src/plugins/hubspot/manifest.json + index.ts
src/plugins/intercom/manifest.json + index.ts
src/plugins/close/manifest.json + index.ts
src/plugins/apollo/manifest.json + index.ts
src/plugins/mailchimp/manifest.json + index.ts

__tests__/plugins/finance-crm.test.ts
```
