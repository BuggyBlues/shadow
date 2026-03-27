# Buddy Permissions Integration Guide

## 1. Register Handler in app.ts

Add to `apps/server/src/app.ts`:

```typescript
import { createBuddyPermissionHandler } from './handlers/buddy-permission.handler'

// Add route:
app.route('/api/agents', createBuddyPermissionHandler(container))
```

## 2. Register Services in container.ts

Add to `apps/server/src/container.ts`:

```typescript
// Imports
import { BuddyPermissionDao } from './dao/buddy-permission.dao'
import { BuddyPermissionService } from './services/buddy-permission.service'

// Add to Cradle interface
buddyPermissionDao: BuddyPermissionDao
buddyPermissionService: BuddyPermissionService

// Add to createAppContainer
buddyPermissionDao: asClass(BuddyPermissionDao).singleton(),
buddyPermissionService: asClass(BuddyPermissionService).singleton(),
```

## 3. Export Schema in index.ts

Add to `apps/server/src/db/schema/index.ts`:

```typescript
export {
  buddyPermissions,
  buddyServerSettings,
  buddyVisibilityEnum,
} from './buddy-permissions'
```

## 4. Add i18n Strings

### en.json
Add after `agentMgmt` section:

```json
"buddyPermissions": {
  "title": "Permissions",
  "visibilityTitle": "Visibility",
  "publicMode": "Public",
  "publicModeDesc": "Everyone in the server can see and interact with this Buddy",
  "privateMode": "Private",
  "privateModeDesc": "Only allowed users can see and interact with this Buddy",
  "selectServer": "Select Server",
  "defaultPermissions": "Default Permissions",
  "allowedUsers": "Allowed Users",
  "noPermissions": "No Users Added",
  "noPermissionsDesc": "Add users to allow them to see and interact with this Buddy",
  "grantAccess": "Grant Access",
  "grantPermission": "Grant Permission",
  "editPermission": "Edit Permission",
  "selectUser": "Select User",
  "searchUsers": "Search users...",
  "permissions": "Permissions",
  "view": "View",
  "viewDesc": "Can see the Buddy in member list",
  "interact": "Interact",
  "interactDesc": "Buddy will respond to their messages",
  "mention": "Mention",
  "mentionDesc": "Can @mention the Buddy",
  "manage": "Manage",
  "manageDesc": "Can modify Buddy settings",
  "saveChanges": "Save Changes",
  "permissionGranted": "Permission granted",
  "permissionRevoked": "Permission revoked"
}
```

### zh-CN.json
Add corresponding Chinese translations.

## 5. Integrate PermissionsPanel into Buddy Management

Modify `apps/web/src/pages/buddy-management.tsx`:

### Add import:
```typescript
import { PermissionsPanel } from '../components/buddy/permissions-panel'
import { Lock, Shield } from 'lucide-react'
```

### Add state:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview')
```

### Fetch servers for permissions panel:
```typescript
const { data: servers = [] } = useQuery({
  queryKey: ['my-servers'],
  queryFn: () => fetchApi<Server[]>('/api/servers'),
  enabled: !!selectedAgent && activeTab === 'permissions',
})
```

### Add Interface Server:
```typescript
interface Server {
  id: string
  name: string
  iconUrl: string | null
}
```

### Modify AgentDetail component to include tabs:

Replace the AgentDetail component's return statement to include tabs:

```tsx
return (
  <>
    {/* Tabs */}
    <div className="flex gap-1 mb-6 border-b border-border-subtle">
      <button
        onClick={() => setActiveTab('overview')}
        className={`px-4 py-2 text-sm font-medium transition ${
          activeTab === 'overview'
            ? 'text-primary border-b-2 border-primary'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        {t('common.overview')}
      </button>
      <button
        onClick={() => setActiveTab('permissions')}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
          activeTab === 'permissions'
            ? 'text-primary border-b-2 border-primary'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <Shield size={14} />
        {t('buddyPermissions.title')}
      </button>
    </div>

    {activeTab === 'overview' ? (
      // ... existing overview content
    ) : (
      <PermissionsPanel
        buddyId={agent.id}
        servers={servers}
      />
    )}
  </>
)
```

## 6. Build and Test

```bash
# Install dependencies
pnpm install

# Run database migration
pnpm db:migrate

# Start development server
pnpm dev
```

## Files Added/Modified

### New Files:
- `apps/server/src/db/migrations/0029_add_buddy_permissions.sql`
- `apps/server/src/db/schema/buddy-permissions.ts`
- `apps/server/src/dao/buddy-permission.dao.ts`
- `apps/server/src/services/buddy-permission.service.ts`
- `apps/server/src/handlers/buddy-permission.handler.ts`
- `apps/server/src/validators/buddy-permission.schema.ts`
- `apps/web/src/components/buddy/permissions-panel.tsx`
- `docs/buddy-permissions-design.md`

### Modified Files:
- `apps/server/src/app.ts` - Add handler route
- `apps/server/src/container.ts` - Register services
- `apps/server/src/db/schema/index.ts` - Export schema
- `apps/web/src/pages/buddy-management.tsx` - Add permissions tab
- `apps/web/src/lib/locales/en.json` - Add i18n strings
- `apps/web/src/lib/locales/zh-CN.json` - Add i18n strings
