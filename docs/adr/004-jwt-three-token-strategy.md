# Implement Three-Token JWT Strategy

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

We need a secure authentication and authorization system that supports:

1. General API access (user authentication)
2. Long-lived sessions without frequent re-login
3. Time-limited room access for meetings (security & expiration)

A single JWT token type doesn't adequately address all these requirements while maintaining security best practices.

## Decision Drivers

- **Security**: Short-lived tokens for API access, token rotation
- **User Experience**: Don't force frequent re-login
- **Meeting Access Control**: Time-limited room access
- **Token Revocation**: Ability to invalidate refresh tokens
- **Performance**: Fast token verification
- **Separation of Concerns**: Different token types for different purposes
- **Standards Compliance**: Follow OAuth 2.0 and JWT best practices

## Considered Options

1. **Three-Token Strategy** - Access + Refresh + Room tokens
2. **Single Token** - One JWT for everything
3. **Two-Token Strategy** - Access + Refresh only
4. **Session-Based Auth** - Traditional server-side sessions

## Decision Outcome

Chosen option: **Three-Token Strategy** (Access + Refresh + Room), because it provides the best security model while maintaining good user experience and meeting access control.

### Token Types

1. **Access Token**
   - Purpose: General API authentication
   - Lifetime: 15 minutes
   - Claims: `{ sub: userId, email: string }`
   - Stored: Client memory (not localStorage)

2. **Refresh Token**
   - Purpose: Get new access tokens without re-login
   - Lifetime: 30 days
   - Claims: `{ sub: userId, tokenId: string }`
   - Stored: HTTP-only cookie or secure client storage
   - Database: Hash stored in `refresh_tokens` table

3. **Room Token**
   - Purpose: Join specific meeting room
   - Lifetime: 2 minutes
   - Claims: `{ sub: participantId, meetingId, role, perms[], exp }`
   - Stored: Client memory (short-lived)
   - Used once: To establish WebSocket connection

### Positive Consequences

- **Security**: Short-lived access tokens limit exposure
- **Revocability**: Refresh tokens can be invalidated in database
- **User Experience**: 30-day sessions, no frequent login
- **Meeting Security**: Room tokens expire quickly, preventing unauthorized access
- **Flexible Permissions**: Room tokens carry role and permissions
- **Audit Trail**: Refresh tokens tracked in database
- **Token Rotation**: Refresh tokens can be rotated on use
- **Separation**: Different secrets for different token types

### Negative Consequences

- **Complexity**: More complex than single-token approach
- **Storage**: Need to store refresh token hashes in database
- **Coordination**: Client needs to manage token refresh flow
- **Extra Endpoint**: Need refresh token endpoint
- **Database Queries**: Refresh validation requires database lookup

## Pros and Cons of the Options

### Three-Token Strategy (Access + Refresh + Room)

- ✅ **Good**: Short-lived access tokens are secure
- ✅ **Good**: Long-lived refresh enables good UX
- ✅ **Good**: Room tokens provide meeting-specific access control
- ✅ **Good**: Can revoke refresh tokens immediately
- ✅ **Good**: Different secrets provide defense in depth
- ✅ **Good**: Room tokens prevent unauthorized meeting access
- ✅ **Good**: Follows OAuth 2.0 best practices
- ❌ **Bad**: More complex to implement
- ❌ **Bad**: Client must handle token refresh
- ❌ **Bad**: Additional database table needed

### Single Token

- ✅ **Good**: Simple to implement
- ✅ **Good**: No token refresh logic needed
- ✅ **Good**: No additional endpoints
- ❌ **Bad**: Long-lived tokens are security risk
- ❌ **Bad**: Short-lived tokens cause frequent re-login
- ❌ **Bad**: Cannot revoke tokens (unless using blacklist)
- ❌ **Bad**: No granular meeting access control
- ❌ **Bad**: Same token for all purposes (poor separation)

### Two-Token Strategy (Access + Refresh)

- ✅ **Good**: Balanced security and UX
- ✅ **Good**: Can revoke refresh tokens
- ✅ **Good**: Standard OAuth 2.0 pattern
- ❌ **Bad**: No meeting-specific access control
- ❌ **Bad**: Access tokens can join any meeting user has access to
- ❌ **Bad**: Harder to implement time-limited meeting access
- ⚠️ **Neutral**: Simpler than three-token but less granular

### Session-Based Auth

- ✅ **Good**: Easy to revoke immediately
- ✅ **Good**: Simpler to implement
- ✅ **Good**: Familiar pattern
- ❌ **Bad**: Requires session storage (Redis/database)
- ❌ **Bad**: Not stateless (complicates scaling)
- ❌ **Bad**: Session lookup on every request
- ❌ **Bad**: Doesn't work well with WebSocket across servers
- ❌ **Bad**: No meeting-specific tokens

## Implementation Details

### Token Lifecycle

#### Access Token

```
User Login → Issue Access Token → Use for API calls → Expires in 15min → Refresh
```

#### Refresh Token

```
User Login → Issue Refresh Token → Store hash in DB → Use to get new Access Token
→ Optionally rotate → Expires in 30 days or logout
```

#### Room Token

```
User requests to join meeting → Verify access → Create participant → Issue Room Token
→ User joins WebSocket → Verify Room Token → Expires in 2 minutes
```

### Token Secrets

- **Access**: `JWT_ACCESS_SECRET` (16+ characters)
- **Refresh**: `JWT_REFRESH_SECRET` (16+ characters, different from access)
- **Room**: `ROOM_TOKEN_SECRET` (16+ characters, different from both)

Using different secrets ensures that compromise of one doesn't compromise others.

### Token Refresh Flow

```
1. Client makes API request with expired access token
2. Server returns 401 with "token expired" error
3. Client sends refresh token to /auth/refresh
4. Server validates refresh token:
   a. Verify JWT signature
   b. Check database for token hash
   c. Verify not expired
5. Server issues new access token
6. Client retries original request with new access token
```

### Room Token Flow

```
1. User requests to join meeting via REST API
2. Server validates user can join:
   a. Check if host, participant, or invited
   b. Create participant record if needed
3. Server issues room token with:
   - participantId (as subject)
   - meetingId
   - role (host/cohost/guest)
   - permissions array
   - 2-minute expiration
4. Client connects to WebSocket
5. Client sends room token in join message
6. Server verifies room token and grants access
```

### Security Considerations

#### Token Storage

- **Access Token**: Memory only (React state, not localStorage)
- **Refresh Token**: HTTP-only cookie or encrypted localStorage
- **Room Token**: Memory only (very short-lived)

#### Token Rotation

Optional: Rotate refresh tokens on use

```typescript
async refresh(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string; // New one
}> {
  // Verify old token
  // Issue new access token
  // Issue new refresh token
  // Invalidate old refresh token
  return { accessToken, refreshToken };
}
```

#### Token Revocation

```typescript
async logout(userId: string, refreshToken: string): Promise<void> {
  // Delete refresh token from database
  await db.delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hash(refreshToken)));
}
```

### Token Expiration Tuning

Current values are opinionated defaults. Adjust based on:

- **Access (15min)**: Balance between security and UX
  - Shorter: More secure, more frequent refreshes
  - Longer: Better UX, higher risk if leaked

- **Refresh (30 days)**: Based on typical user behavior
  - Shorter: More secure, users re-login more often
  - Longer: Better UX, harder to revoke compromised tokens

- **Room (2 minutes)**: Time to establish WebSocket
  - Shorter: More secure, may cause issues with slow networks
  - Longer: Less secure, allows delayed joins

## Edge Cases

### What if access token expires during a long operation?

Client should implement retry logic with token refresh.

### What if user changes password?

Invalidate all refresh tokens for that user.

### What if room token expires before WebSocket connects?

Client requests new room token and retries. Short expiration is intentional.

### What if user joins meeting, gets room token, but takes 5 minutes to connect?

Room token expires. User must request new room token. This prevents sharing room tokens.

## Risk Mitigation

- **Token Leakage**: Short-lived access tokens limit damage
- **XSS**: HTTP-only cookies for refresh tokens
- **CSRF**: SameSite cookie attribute + CSRF tokens
- **Token Theft**: Refresh token rotation detects theft
- **Replay Attacks**: Nonce in room tokens (future enhancement)

## Related Decisions

- [ADR-001](001-bun-and-elysiajs.md) - Use Bun Runtime and ElysiaJS Framework
- [ADR-003](003-redis-pubsub-websocket-scaling.md) - Use Redis Pub/Sub for WebSocket Scaling

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT Best Practices RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
