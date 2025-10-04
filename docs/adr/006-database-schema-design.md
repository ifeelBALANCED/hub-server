# Database Schema Design with ULID

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

We need to design a database schema for a video conferencing platform that supports users, meetings, participants, and invites. Key considerations:

- Primary key format and generation
- Relationships between entities
- Indexes for common queries
- Support for anonymous participants
- Soft deletes vs hard deletes
- Audit trails

## Decision Drivers

- **Performance**: Fast queries and joins
- **Scalability**: Support distributed systems
- **Sortability**: IDs should be time-sortable
- **Security**: Non-guessable IDs
- **Developer Experience**: Easy to debug and inspect
- **Standards**: Follow PostgreSQL best practices
- **Future-proof**: Easy to add columns/tables

## Considered Options

1. **ULID for Primary Keys** - Universally Unique Lexicographically Sortable Identifier
2. **UUID v4** - Random UUIDs
3. **UUID v7** - Time-based UUIDs
4. **Auto-increment Integers** - Traditional serial IDs
5. **Snowflake IDs** - Twitter's distributed ID generation

## Decision Outcome

Chosen option: **ULID for Primary Keys**, because it provides the best balance of sortability, uniqueness, and readability while being URL-safe and compact.

### Schema Design

#### Core Tables

1. **users** - User accounts
2. **meetings** - Video conference meetings
3. **participants** - Join records (who is in which meeting)
4. **invites** - Meeting invitations
5. **refresh_tokens** - JWT refresh token storage

#### Key Design Decisions

- **ULID Primary Keys**: All tables use 26-character ULID strings
- **Soft References**: Nullable userId in participants (anonymous support)
- **Cascade Deletes**: Meetings cascade to participants/invites
- **Enums**: PostgreSQL enums for role and status
- **Indexes**: On foreign keys and frequently queried columns
- **No Soft Deletes**: Use hard deletes (can add audit table if needed)

### Positive Consequences

- **Time-sortable**: ULIDs encode timestamp, can sort by creation
- **URL-safe**: Can be used in URLs without encoding
- **Compact**: 26 chars vs 36 for UUIDs
- **Readable**: Base32 encoding is more human-friendly
- **Fast generation**: Generated in application, no DB round-trip
- **Distributed-safe**: No coordination needed across servers
- **Indexed efficiently**: String-based but sorts well
- **Anonymous support**: Nullable userId allows guest participants

### Negative Consequences

- **String storage**: Slightly larger than bigint
- **No auto-increment**: Can't easily count "total users" from ID
- **Timestamp leakage**: Creation time is visible in ID
- **Requires library**: Need ULID generation library

## Pros and Cons of the Options

### ULID (Chosen)

- ✅ **Good**: Lexicographically sortable (time-ordered)
- ✅ **Good**: Compact (26 characters)
- ✅ **Good**: URL-safe (Base32 encoding)
- ✅ **Good**: More readable than UUIDs
- ✅ **Good**: Fast generation (no database round-trip)
- ✅ **Good**: Distributed-safe (no coordination)
- ✅ **Good**: Monotonic sort order within same millisecond
- ❌ **Bad**: Slightly larger storage than UUIDs (26 vs 16 bytes)
- ❌ **Bad**: Reveals creation timestamp
- ❌ **Bad**: Requires external library

Example: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

### UUID v4

- ✅ **Good**: Standard and well-supported
- ✅ **Good**: Large entropy (122 random bits)
- ✅ **Good**: Built-in PostgreSQL support
- ❌ **Bad**: Not sortable (random)
- ❌ **Bad**: Longer (36 characters with dashes)
- ❌ **Bad**: Less readable
- ❌ **Bad**: Not URL-friendly (needs encoding or dash removal)

Example: `550e8400-e29b-41d4-a716-446655440000`

### UUID v7

- ✅ **Good**: Time-sortable like ULID
- ✅ **Good**: Standard UUID format
- ✅ **Good**: Distributed-safe
- ✅ **Good**: Better database support than ULID
- ❌ **Bad**: Longer than ULID (36 chars)
- ❌ **Bad**: Still less readable
- ❌ **Bad**: Newer standard (less tooling)

Example: `017f22e2-79b0-7cc3-98c4-dc0c0c07398f`

### Auto-increment Integers

- ✅ **Good**: Smallest storage (4-8 bytes)
- ✅ **Good**: Fastest queries and joins
- ✅ **Good**: Easy to read (1, 2, 3...)
- ✅ **Good**: Built-in PostgreSQL support
- ❌ **Bad**: Reveals number of records
- ❌ **Bad**: Sequential = guessable (security risk)
- ❌ **Bad**: Not distributed-safe (requires coordination)
- ❌ **Bad**: Database-dependent

### Snowflake IDs

- ✅ **Good**: Time-sortable
- ✅ **Good**: Distributed-safe
- ✅ **Good**: Compact (64-bit integer)
- ✅ **Good**: Very fast generation
- ❌ **Bad**: Requires centralized worker ID assignment
- ❌ **Bad**: Clock synchronization required
- ❌ **Bad**: Complex to implement correctly
- ❌ **Bad**: 64-bit = smaller namespace than ULID/UUID

## Schema Implementation

### Users Table

```typescript
export const users = pgTable('users', {
  id: varchar('id', { length: 26 })
    .primaryKey()
    .$defaultFn(() => ulid()),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Design choices:**

- `passwordHash` is nullable (OAuth users don't have passwords)
- `email` is unique (primary identifier)
- `avatarUrl` is text (URL can be long)

### Meetings Table

```typescript
export const meetings = pgTable(
  'meetings',
  {
    id: varchar('id', { length: 26 })
      .primaryKey()
      .$defaultFn(() => ulid()),
    code: varchar('code', { length: 20 }).unique().notNull(),
    title: varchar('title', { length: 255 }),
    hostId: varchar('host_id', { length: 26 })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    scheduledAt: timestamp('scheduled_at'),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    codeIdx: index('meetings_code_idx').on(table.code),
  })
);
```

**Design choices:**

- `code` has separate index (frequently queried)
- `hostId` cascade deletes (if host deleted, delete meetings)
- `scheduledAt` nullable (instant meetings have no schedule)
- `endedAt` nullable (active meetings haven't ended)

### Participants Table

```typescript
export const participants = pgTable(
  'participants',
  {
    id: varchar('id', { length: 26 })
      .primaryKey()
      .$defaultFn(() => ulid()),
    meetingId: varchar('meeting_id', { length: 26 })
      .references(() => meetings.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id', { length: 26 }).references(() => users.id, {
      onDelete: 'cascade',
    }),
    role: participantRoleEnum('role').notNull().default('guest'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
  },
  table => ({
    meetingIdx: index('participants_meeting_idx').on(table.meetingId),
    userIdx: index('participants_user_idx').on(table.userId),
  })
);
```

**Design choices:**

- `userId` is **nullable** (anonymous guests don't have accounts)
- Indexes on both foreign keys (frequent joins)
- `leftAt` nullable (null = still in meeting)
- No unique constraint on (userId, meetingId) - users can rejoin

### Invites Table

```typescript
export const invites = pgTable('invites', {
  id: varchar('id', { length: 26 })
    .primaryKey()
    .$defaultFn(() => ulid()),
  meetingId: varchar('meeting_id', { length: 26 })
    .references(() => meetings.id, { onDelete: 'cascade' })
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: participantRoleEnum('role').notNull().default('guest'),
  status: inviteStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Design choices:**

- Email-based (invite before signup)
- Cascade delete with meeting
- Status enum for tracking

### Refresh Tokens Table

```typescript
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: varchar('id', { length: 26 })
      .primaryKey()
      .$defaultFn(() => ulid()),
    userId: varchar('user_id', { length: 26 })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    userIdx: index('refresh_tokens_user_idx').on(table.userId),
  })
);
```

**Design choices:**

- Store hash, not raw token (security)
- Index on userId (lookup on refresh)
- Cascade delete (logout when user deleted)

## Relationships

```
users (1) ─< (many) meetings (host relationship)
users (1) ─< (many) participants
meetings (1) ─< (many) participants
meetings (1) ─< (many) invites
users (1) ─< (many) refreshTokens
```

## Indexes Strategy

- **Primary keys**: Automatic index
- **Foreign keys**: Explicit indexes for joins
- **Unique constraints**: Automatic unique indexes
- **Query-specific**: `meetings.code` for lookups

## Migration Strategy

```bash
# Generate migration from schema
bun run drizzle-kit generate

# Review generated SQL
cat drizzle/0000_*.sql

# Apply migration
bun run migrate
```

## Performance Characteristics

### ULID vs UUID vs Integer

| Metric           | ULID     | UUID v4  | Integer     |
| ---------------- | -------- | -------- | ----------- |
| Storage          | 26 bytes | 16 bytes | 4-8 bytes   |
| Index size       | Medium   | Small    | Smallest    |
| Generation speed | Fast     | Fast     | Requires DB |
| Sortability      | Yes      | No       | Yes         |
| Readability      | Good     | Poor     | Excellent   |

### Query Performance

ULIDs in varchar(26) perform well in PostgreSQL:

- B-tree indexes work efficiently
- String comparison is optimized
- Sorting by ULID = sorting by creation time

## Security Considerations

### ID Exposure

- **ULID reveals timestamp**: Consider this acceptable for most use cases
- **Mitigation**: If timestamp privacy is critical, use UUID v4 instead
- **Not guessable**: Despite timestamp, still 80 bits of randomness

### Enumeration Prevention

- Meeting codes are separate from IDs
- IDs are not sequential
- Can't enumerate users/meetings by ID

## Future Enhancements

### Audit Table

Add audit table for compliance:

```typescript
export const auditLog = pgTable('audit_log', {
  id: varchar('id', { length: 26 })
    .primaryKey()
    .$defaultFn(() => ulid()),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 26 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(), // created, updated, deleted
  userId: varchar('user_id', { length: 26 }),
  changes: jsonb('changes'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
```

### Soft Deletes

If needed, add `deletedAt` column:

```typescript
deletedAt: timestamp('deleted_at'),
```

And filter queries: `where(isNull(table.deletedAt))`

## Related Decisions

- [ADR-002](002-drizzle-orm.md) - Use Drizzle ORM for Database Management
- [ADR-005](005-meeting-code-format.md) - Human-Readable Meeting Code Format

## References

- [ULID Specification](https://github.com/ulid/spec)
- [UUID v7 Draft](https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Database ID Design](https://blog.kowalczyk.info/article/JyRZ/generating-good-unique-ids-in-go.html)
