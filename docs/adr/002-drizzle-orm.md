# Use Drizzle ORM for Database Management

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

We need an ORM or query builder to manage our PostgreSQL database. The solution should provide type safety, good developer experience, and not compromise on performance. We need support for migrations, relations, and complex queries.

## Decision Drivers

- **Type Safety**: Full TypeScript type inference from schema to queries
- **Performance**: Minimal overhead compared to raw SQL
- **Developer Experience**: Intuitive API and good documentation
- **SQL Transparency**: Easy to see and optimize generated SQL
- **Migration Support**: Robust migration generation and management
- **Bundle Size**: Lightweight runtime footprint
- **Bun Compatibility**: Works well with Bun runtime
- **Learning Curve**: Team can become productive quickly

## Considered Options

1. **Drizzle ORM** - Lightweight, type-safe SQL ORM
2. **Prisma** - Popular ORM with strong type safety
3. **TypeORM** - Mature ORM with decorator-based approach
4. **Kysely** - Type-safe SQL query builder

## Decision Outcome

Chosen option: **Drizzle ORM**, because it provides the best balance of type safety, performance, and developer experience while being lightweight and SQL-transparent.

### Positive Consequences

- **Zero runtime overhead** - generates plain SQL, no query builder overhead
- **Full type safety** - end-to-end type inference from schema to query results
- **SQL-like syntax** - easy to understand and optimize
- **Excellent DX** - auto-completion and type checking in IDE
- **Lightweight** - minimal bundle size (~15KB)
- **Fast migrations** - generate and apply migrations quickly
- **Drizzle Studio** - visual database browser included
- **Relations API** - clean, intuitive way to query related data
- **Works perfectly with Bun** - no compatibility issues
- **Schema as code** - TypeScript schema is the source of truth

### Negative Consequences

- **Newer ecosystem** - fewer community resources than Prisma
- **Fewer integrations** - some third-party tools don't support Drizzle yet
- **Manual migration review** - need to check generated SQL (though this is also a benefit)
- **Limited documentation** - some advanced features lack detailed docs
- **No GUI client** (besides Drizzle Studio)

## Pros and Cons of the Options

### Drizzle ORM

- ✅ **Good**: Zero runtime overhead, generates optimal SQL
- ✅ **Good**: SQL-like syntax, easy to understand generated queries
- ✅ **Good**: Excellent type inference and autocompletion
- ✅ **Good**: Lightweight (~15KB)
- ✅ **Good**: Drizzle Studio for visual database management
- ✅ **Good**: Push and generate migration strategies
- ✅ **Good**: Works perfectly with Bun
- ✅ **Good**: Supports indexes, constraints, and advanced PostgreSQL features
- ❌ **Bad**: Smaller ecosystem than Prisma
- ❌ **Bad**: Some features still in development

### Prisma

- ✅ **Good**: Excellent type safety and autocompletion
- ✅ **Good**: Great documentation and large community
- ✅ **Good**: Prisma Studio for database management
- ✅ **Good**: Strong migration system
- ✅ **Good**: Many integrations and tools
- ❌ **Bad**: Heavy runtime overhead (query builder layer)
- ❌ **Bad**: Large bundle size (~50KB+)
- ❌ **Bad**: Generated client adds to codebase
- ❌ **Bad**: SQL is abstracted away, harder to optimize
- ❌ **Bad**: Slower query execution than Drizzle
- ❌ **Bad**: Limited Bun support (works but not optimized)
- ❌ **Bad**: Schema in separate file format (not TypeScript)

### TypeORM

- ✅ **Good**: Mature and battle-tested
- ✅ **Good**: Active Record and Data Mapper patterns
- ✅ **Good**: Supports many databases
- ✅ **Good**: Large community
- ❌ **Bad**: Decorator-based approach (uses experimental TS features)
- ❌ **Bad**: Runtime overhead
- ❌ **Bad**: Type safety not as strong as Drizzle/Prisma
- ❌ **Bad**: Verbose boilerplate
- ❌ **Bad**: Migration generation is less reliable
- ❌ **Bad**: Heavier bundle size

### Kysely

- ✅ **Good**: Excellent type safety
- ✅ **Good**: SQL-like syntax
- ✅ **Good**: Zero runtime overhead
- ✅ **Good**: Lightweight
- ❌ **Bad**: No built-in migration system
- ❌ **Bad**: No schema definition (just a query builder)
- ❌ **Bad**: More verbose than Drizzle
- ❌ **Bad**: No visual database tool
- ❌ **Bad**: Requires separate migration solution

## Implementation Notes

### Schema Example

```typescript
export const users = pgTable('users', {
  id: varchar('id', { length: 26 })
    .primaryKey()
    .$defaultFn(() => ulid()),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Query Example

```typescript
// Type-safe query with full autocompletion
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
  with: {
    hostedMeetings: true,
  },
});
```

### Performance Comparison

Based on benchmarks:

- **Drizzle**: ~1ms query overhead
- **Prisma**: ~5-10ms query overhead
- **TypeORM**: ~3-7ms query overhead
- **Kysely**: ~1ms query overhead

For a real-time application handling many WebSocket messages, this overhead matters.

### Migration Workflow

```bash
# 1. Modify schema in schema.ts
# 2. Generate migration
bun run drizzle-kit generate

# 3. Review generated SQL
# 4. Apply migration
bun run migrate
```

### Relations

Drizzle's relations API is clean and intuitive:

```typescript
export const usersRelations = relations(users, ({ many }) => ({
  hostedMeetings: many(meetings),
  participants: many(participants),
}));
```

## Alternatives Considered But Ruled Out

- **Raw SQL**: Too verbose, no type safety
- **pg**: Query builder only, no migrations or relations
- **Sequelize**: Heavy, older patterns, poor TypeScript support

## Risk Mitigation

- **Ecosystem maturity**: Monitor Drizzle development, be prepared to contribute
- **Migration issues**: Always review generated SQL before applying
- **Documentation gaps**: Refer to Drizzle Discord for community support
- **Exit strategy**: If needed, can migrate to Kysely (similar SQL-like syntax)

## Related Decisions

- [ADR-001](001-bun-and-elysiajs.md) - Use Bun Runtime and ElysiaJS Framework
- [ADR-006](006-database-schema-design.md) - Database Schema Design with ULID

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Drizzle vs Prisma Comparison](https://orm.drizzle.team/docs/comparison)
- [Drizzle Performance Benchmarks](https://github.com/drizzle-team/drizzle-orm-benchmarks)
- [Why Drizzle](https://orm.drizzle.team/docs/overview#why-drizzle)
