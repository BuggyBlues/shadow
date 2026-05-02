# TAPD Plugin

TAPD supports project-management workflows for requirements, defects, tasks, iterations, project dashboards, daily reports, and R&D planning.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `TAPD_CLIENT_ID` | Yes | No | TAPD application client ID. |
| `TAPD_CLIENT_SECRET` | Yes | Yes | TAPD application client secret. |
| `TAPD_WORKSPACE_ID` | No | No | Default TAPD workspace ID. |

## Setup

1. Create or select a TAPD application.
2. Copy the client ID into `TAPD_CLIENT_ID`.
3. Copy the client secret into `TAPD_CLIENT_SECRET`.
4. Add `TAPD_WORKSPACE_ID` when the Buddy should default to one workspace.
5. Deploy the Buddy.
6. Verify with read-only requirement, defect, task, or iteration lookup before enabling writes.

## Runtime Assets

- Exposes connector metadata and prompt guidance for TAPD project-management workflows.
- Changes to requirements, defects, tasks, and iteration state should require explicit confirmation.

## References

- [TAPD MCP server](https://cloud.tencent.com/developer/mcp/server/11474)
- [TAPD](https://www.tapd.cn)
