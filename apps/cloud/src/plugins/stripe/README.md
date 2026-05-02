# Stripe Plugin

Stripe BillingOps connects a Buddy to payment processing, Checkout, subscriptions, invoices, Connect, webhook testing, refunds, disputes, and billing guardrails.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Yes | Stripe secret key. Prefer a restricted key (`rk_*`) with only the permissions the Buddy needs. |

## Setup

1. Open the Stripe Dashboard.
2. Create a restricted API key for the Buddy whenever possible.
3. Grant only the needed permissions, such as read-only billing, invoices, customers, subscriptions, or webhook access.
4. Add the key as `STRIPE_SECRET_KEY`.
5. Use a test-mode key first.
6. Deploy the Buddy and run read-only checks before enabling write actions such as refunds or subscription changes.

## Runtime Assets

- Exposes the bundled Stripe skill.
- Exposes the `stripe` CLI command in plugin metadata.
- Registers Stripe Agent Toolkit MCP metadata.

## References

- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Stripe MCP](https://docs.stripe.com/mcp)
- [Stripe Agent Toolkit](https://docs.stripe.com/agents)
- [Stripe API keys](https://docs.stripe.com/keys)
- [Restricted API keys](https://docs.stripe.com/keys#limit-access)
