# Shadow Design System - Component Library

A game-inspired React component library for Shadow.

## Installation

```bash
npm install @shadow/design-system
# or
yarn add @shadow/design-system
```

## Usage

```tsx
import { Button, Card, Input, Avatar, Badge } from '@shadow/design-system';

function App() {
  return (
    <Card variant="cyan">
      <Button variant="cyan" icon={Rocket}>
        Get Started
      </Button>
      <Avatar name="Alex" color="cyan" />
      <Badge variant="green">Online</Badge>
    </Card>
  );
}
```

## Components

### Button
3D game-style buttons with elastic animation.

```tsx
<Button variant="cyan">Primary</Button>
<Button variant="pink" icon={Trash}>Delete</Button>
<Button variant="secondary">Secondary</Button>
```

**Variants:** `cyan` | `pink` | `green` | `yellow` | `purple` | `secondary`

### Card
Colorful bordered cards with glow shadows.

```tsx
<Card variant="cyan">
  <CardHeader icon={<Layers />} title="Title" subtitle="Description" />
</Card>
```

**Variants:** `default` | `cyan` | `pink` | `green` | `yellow` | `purple`

### Input
Form inputs with focus glow.

```tsx
<Input placeholder="Enter text..." />
<Input error="This field is required" />
<TextArea rows={4} />
```

### Switch
Elastic toggle switch.

```tsx
<Switch checked={true} onChange={(checked) => {}} label="Notifications" />
```

### Avatar
User avatars with color variants.

```tsx
<Avatar name="Alex" color="cyan" />
<AvatarGroup>
  <Avatar name="A" color="cyan" />
  <Avatar name="B" color="pink" />
</AvatarGroup>
```

### Badge
Status badges with 5 colors.

```tsx
<Badge variant="green">Online</Badge>
<Badge variant="pink">Hot</Badge>
```

### Progress
Progress bars with color variants.

```tsx
<Progress value={75} variant="cyan" />
<Progress value={45} variant="pink" size="sm" />
```

### Spinner
Game-style 4-color loading spinner.

```tsx
<Spinner size="md" />
```

### Tabs
Segmented control tabs.

```tsx
<Tabs
  tabs={[
    { id: 'all', label: 'All' },
    { id: 'online', label: 'Online' },
  ]}
  activeTab="all"
  onChange={(tabId) => {}}
/>
```

### Chat
Chat interface components.

```tsx
<ChatFrame>
  <ServerPill label="S1" active />
  <ChatMessage name="Alex" nameColor="cyan" time="2:34 PM">
    Hello world!
  </ChatMessage>
</ChatFrame>
```

## Design Tokens

### Colors
- **Cyan** `#00D4FF` - Primary
- **Pink** `#FF6B9D` - Danger/Error
- **Green** `#4ADE80` - Success
- **Yellow** `#FCD34D` - Warning
- **Purple** `#A78BFA` - VIP/Special

### Animation
All interactive elements use `cubic-bezier(0.34, 1.56, 0.64, 1)` for elastic bounce effect.

### 3D Buttons
Primary buttons have a 3D press effect:
- Default: `shadow-[0_3px_0_{color-dark}]`
- Hover: `shadow-[0_5px_0_{color-dark}] translateY(-2px)`
- Active: `shadow-none translateY(1px)`

## License
MIT
