# Membership Tiers And Capability Gates

## Goal

Membership must let new users click a website play and start immediately, while still protecting
advanced Cloud SaaS and server-creation operations. The model should support later tiers such as
`pro`, `team`, or `enterprise` without rewriting clients or play launch actions.

## Principles

1. Registration and login are open. Invite codes upgrade access; they do not create the account.
2. The server gates capabilities, not UI labels. A tier is a bundle of capabilities plus a numeric
   level.
3. Clients show the returned tier and capability list. They should avoid branching only on
   `visitor` versus `member`.
4. Product surfaces should downgrade gracefully. A visitor can still use community plays, but a
   blocked advanced operation should offer invite redemption.

## Current Ladder

| Tier | Level | Intended users | Capabilities |
| --- | ---: | --- | --- |
| `visitor` | 0 | Newly registered users, OAuth/email-code users without invite redemption | Community features, public/private play entry |
| `member` | 10 | Users with a redeemed invite code or admins | `cloud:deploy`, `server:create`, `invite:create`, `oauth_app:create` |

Future tiers should use higher `level` values and additive capability bundles. Examples:

| Future tier | Suggested level | Example capabilities |
| --- | ---: | --- |
| `pro` | 20 | Higher Cloud quota, custom Buddy bundles, priority queues |
| `team` | 30 | Team server management, shared billing, workspace governance |
| `enterprise` | 40 | SSO, audit exports, dedicated deployment policy |

## API Contract

Every authenticated response that returns a user can include `user.membership`. The membership API
also returns the same shape:

```json
{
  "status": "member",
  "tier": {
    "id": "member",
    "level": 10,
    "label": "Member",
    "capabilities": ["cloud:deploy", "server:create", "invite:create", "oauth_app:create"]
  },
  "level": 10,
  "isMember": true,
  "memberSince": "2026-05-03T00:00:00.000Z",
  "inviteCodeId": "invite-id",
  "capabilities": ["cloud:deploy", "server:create", "invite:create", "oauth_app:create"]
}
```

Field rules:

- `status`: stable tier id for i18n and analytics.
- `tier`: display metadata and canonical capability bundle for the tier.
- `level`: numeric ordering for progressive entitlement checks and UI sorting.
- `isMember`: compatibility flag for the current invite-redeemed boundary.
- `capabilities`: effective capabilities after all grants are resolved.
- `memberSince`: first invite redemption or admin creation date when available.
- `inviteCodeId`: invite that unlocked the first membership tier when available.

## Capability Gates

The first protected capabilities are:

| Capability | Gate |
| --- | --- |
| `cloud:deploy` | Create Cloud SaaS deployments from website plays or app surfaces |
| `server:create` | Create new community servers |
| `invite:create` | Generate invite codes |
| `oauth_app:create` | Register third-party OAuth applications |

Handlers must call the membership service with a capability name. They should not compare tier ids
directly. This keeps future paid or organization tiers compatible with existing endpoints.

## Client Display

Web and mobile account settings should show:

- current tier label
- numeric level
- effective capabilities
- invite redemption action for users whose `isMember` is false

The display should use i18n keys keyed by `settings.membershipTiers.<tier-id>` and fall back to
`tier.label` when a new server-side tier ships before all translations are available.

## Rollout Checklist

1. Keep invite code optional in registration and email-code auth.
2. Include membership in auth responses.
3. Use `GET /api/membership/me` to refresh account status.
4. Use `POST /api/membership/redeem-invite` to upgrade a visitor.
5. Gate advanced operations by capability.
6. Add future tiers by extending the tier registry and SDK typings, then adding translations.
