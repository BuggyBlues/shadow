# Skill Discovery Plugin

Skill Discovery helps a Buddy search, evaluate, and recommend installable agent skills before adding new capabilities.

## Configuration Keys

This plugin does not require credentials.

## Setup

1. Enable the `skill-discovery` plugin on a Buddy.
2. Deploy the Buddy.
3. Use the Buddy to search for candidate skills and compare their source, scope, and trust level.
4. Install or add a skill only after the user approves the exact source.

## Runtime Assets

- Installs the `skills` npm CLI.
- Mounts the `find-skills` skill from `vercel-labs/skills`.

## References

- [Find Skills skill](https://skills.sh/vercel-labs/skills/find-skills)
- [Vercel Labs skills repository](https://github.com/vercel-labs/skills)
- [Agent Skills directory](https://skills.sh)
