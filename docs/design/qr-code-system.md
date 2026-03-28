# QR Code System Design

> **Status**: Design Phase  
> **Scope**: Web + Mobile  
> **Owner**: @happlex

## Overview

A comprehensive QR code system for Shadow that enables users to:
- Scan QR codes to add friends, join servers, and access channels
- Generate and share personalized QR code posters for profiles, buddies, servers, and channels
- Support both mobile and desktop platforms with unified experience

## User Stories

### As a user, I want to...

1. **Scan QR codes** to quickly connect with others and join communities
2. **Generate a QR code poster** for my profile to share with friends
3. **Share server/channel invites** via beautiful QR code posters
4. **Reset my QR code** if I feel it's being misused
5. **Access QR features** from intuitive entry points on both mobile and PC

## Product Requirements

### 1. QR Code Scanner Entry Points

| Platform | Location | Behavior |
|----------|----------|----------|
| **Mobile** | Personal Tab - Top Right Corner | Opens full-screen scanner |
| **PC** | Bottom Left - "+" Button | Opens scanner modal |

**Scanner Capabilities:**
- Mobile: Camera-based real-time scanning
- PC: Upload QR code image only (no camera support)
- Decode Shadow custom URI schemes
- Handle invite codes for private servers/channels

### 2. QR Code Poster Generation Entry Points

| Entity | Entry Location |
|--------|----------------|
| **User Profile** | Profile Page → QR Code Icon |
| **Buddy Profile** | Buddy Detail Page → QR Code Icon |
| **Server** | Server Settings / Info Page → QR Code Icon |
| **Channel** | Channel Info Page → QR Code Icon |

### 3. QR Code Poster Design

#### Visual Style
- **Theme**: Clean, bright white background
- **Branding**: Shadow logo prominently displayed
- **Layout**: Centered QR code with user/entity information

#### Content Elements

| Element | User/Buddy | Server | Channel |
|---------|------------|--------|---------|
| Avatar/Icon | ✅ Profile Photo | ✅ Server Icon | ✅ Channel Icon |
| Name | ✅ Display Name | ✅ Server Name | ✅ Channel Name |
| QR Code | ✅ Centered | ✅ Centered | ✅ Centered |
| Shadow Logo | ✅ Bottom | ✅ Bottom | ✅ Bottom |
| Banner | ❌ | ✅ Server Banner | ❌ |
| Description | ✅ Optional | ✅ Server Description | ❌ |

#### Technical Specs
- **Format**: PNG image
- **Resolution**: 1080x1920px (mobile-optimized)
- **QR Code**: 400x400px centered
- **Color**: Black modules on white background with Shadow brand accent

### 4. URI Scheme Design

```
shadow://user/{userId}
shadow://buddy/{buddyId}
shadow://server/{serverId}
shadow://server/{serverId}?invite={inviteCode}     # Private server
shadow://channel/{channelId}
shadow://channel/{channelId}?invite={inviteCode}    # Private channel
```

### 5. Action Flows

#### Scan → Add Friend
```
Scan User QR → Show Profile Preview → [Confirm] → Send Friend Request → Wait for Acceptance
```

#### Scan → Join Server
```
Scan Server QR → Validate Invite → Show Server Preview → [Confirm] → Join Server → Auto-join
```

#### Scan → Join Channel
```
Scan Channel QR → Validate Access → Show Channel Preview → [Confirm] → Join Server + Channel
```

### 6. Invite Code & Expiration

| Type | Expiration | Resettable |
|------|------------|------------|
| User Profile | Permanent | ✅ Yes |
| Buddy Profile | Permanent | ✅ Yes |
| Public Server | Permanent | ✅ Yes |
| Private Server | Configurable (default 7 days) | ✅ Yes |
| Public Channel | Permanent | ✅ Yes |
| Private Channel | Configurable (default 7 days) | ✅ Yes |

### 7. Share & Save Actions

| Action | Mobile | PC |
|--------|--------|-----|
| Save to Gallery | ✅ Native save | ✅ Download to folder |
| System Share | ✅ Share sheet | ❌ N/A |
| Copy Link | ✅ Copy URI | ✅ Copy URI |
| Copy Image | ✅ To clipboard | ✅ To clipboard |

## Technical Requirements

### Frontend

#### QR Code Generation
- **Library**: `qrcode` (npm) for generating QR codes
- **Canvas**: HTML5 Canvas API for poster composition
- **Styling**: Tailwind CSS for layout, Canvas for image generation

#### QR Code Scanning
- **Mobile**: `react-native-camera` or `expo-camera` with `react-native-qrcode-scanner`
- **PC**: `jsQR` library for image decoding (upload only)

#### Implementation Notes
- Generate posters client-side to reduce server load
- Cache generated posters in local storage
- Support real-time preview before saving

### Backend

#### API Endpoints

```typescript
// Generate invite code for private server/channel
POST /api/v1/servers/:id/invite
POST /api/v1/channels/:id/invite
Request: { expiresIn?: number, maxUses?: number }
Response: { inviteCode: string, expiresAt: string }

// Reset QR code (invalidates old invites)
POST /api/v1/users/me/qr/reset
POST /api/v1/servers/:id/qr/reset
POST /api/v1/channels/:id/qr/reset

// Validate invite code
GET /api/v1/invites/:code
Response: { type: 'server' | 'channel', targetId: string, ... }

// Consume invite
POST /api/v1/invites/:code/accept
```

#### Database Schema

```typescript
// Invite codes table
interface InviteCode {
  id: string;
  code: string;           // Unique 8-char alphanumeric
  type: 'server' | 'channel';
  targetId: string;       // Server or Channel ID
  createdBy: string;      // User ID
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

// QR code metadata (for tracking/resets)
interface QRCodeMeta {
  id: string;
  entityType: 'user' | 'buddy' | 'server' | 'channel';
  entityId: string;
  version: number;        // Increment on reset
  createdAt: Date;
}
```

## Security Considerations

1. **Rate Limiting**: Limit QR code generation (10/hour per user)
2. **Invite Validation**: Verify user has permission to access private resources
3. **Token Rotation**: Invalidate old invites when QR is reset
4. **Scan Logging**: Log scan attempts for abuse detection
5. **HTTPS Only**: All QR code URIs must use HTTPS

## Error Handling

| Error Scenario | User Message |
|----------------|--------------|
| Invalid QR Code | "This QR code is invalid or corrupted" |
| Expired Invite | "This invite has expired. Ask for a new one!" |
| Max Uses Reached | "This invite has reached its usage limit" |
| Private Server (No Access) | "You need an invite to join this server" |
| Already Member | "You're already a member of this server" |
| Rate Limited | "Please wait before generating a new QR code" |

## Success Metrics

- **Adoption**: % of users who generate at least one QR poster
- **Engagement**: Average QR scans per user per week
- **Conversion**: % of scans that result in successful friend/server adds
- **Share Rate**: % of generated posters that are shared/saved

## Future Enhancements

- [ ] Animated QR codes for premium users
- [ ] Custom poster themes (seasonal, premium)
- [ ] QR code analytics (scan counts, sources)
- [ ] NFC tag support for physical sharing
- [ ] Batch QR generation for events

## Appendix

### A. QR Code Poster Mockup Structure

```
+------------------------+
|                        |
|    [Avatar/Icon]       |
|                        |
|    Entity Name         |
|    @handle (if user)   |
|                        |
|    +----------------+  |
|    |                |  |
|    |   QR CODE      |  |
|    |   (400x400)    |  |
|    |                |  |
|    +----------------+  |
|                        |
|    [Description]       |
|    (optional)          |
|                        |
|       [SHADOW LOGO]    |
|                        |
+------------------------+
```

### B. Related Documents

- [Mobile Scanner Implementation](./mobile-qr-scanner.md) (TBD)
- [PC Upload Scanner](./pc-qr-scanner.md) (TBD)
- [QR Poster Generation API](./qr-poster-api.md) (TBD)
