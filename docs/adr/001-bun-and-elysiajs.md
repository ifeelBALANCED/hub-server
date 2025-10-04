# Use Bun Runtime and ElysiaJS Framework

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

We need to select a runtime and web framework for building a high-performance, real-time video conferencing backend API. The system needs to handle REST endpoints, WebSocket connections, and real-time message broadcasting with minimal latency.

## Decision Drivers

- **Performance**: High throughput and low latency for real-time features
- **Developer Experience**: Fast development iteration and good TypeScript support
- **Modern Tooling**: Native support for TypeScript, testing, and bundling
- **WebSocket Support**: First-class support for WebSocket connections
- **Ecosystem**: Good plugin ecosystem for common features (JWT, CORS, Swagger)
- **Startup Time**: Fast server startup for development productivity
- **Bundle Size**: Small runtime footprint for deployment efficiency

## Considered Options

1. **Bun + ElysiaJS** - Modern runtime with ElysiaJS framework
2. **Node.js + Express** - Traditional, battle-tested option
3. **Node.js + Fastify** - Performance-focused Node.js framework
4. **Deno + Oak** - Secure-by-default runtime with Oak framework

## Decision Outcome

Chosen option: **Bun + ElysiaJS**, because it provides the best combination of performance, developer experience, and modern features needed for real-time applications.

### Positive Consequences

- **3x-4x faster** than Node.js in benchmarks (especially for WebSocket handling)
- **Built-in TypeScript support** - no compilation step needed
- **Native test runner** - no need for Jest or Vitest configuration
- **Fast package installation** - significantly faster than npm/yarn
- **Excellent DX** - hot reload, bundler, and test runner all included
- **Small binary size** - efficient deployment
- **ElysiaJS provides**:
  - Type-safe routing with inference
  - Excellent plugin ecosystem (@elysiajs/jwt, @elysiajs/swagger, @elysiajs/cors)
  - Built-in validation with Zod integration
  - Auto-generated OpenAPI documentation
  - First-class WebSocket support

### Negative Consequences

- **Newer ecosystem** - fewer third-party packages compared to Node.js
- **Production maturity** - Bun is relatively new (1.0 released in 2023)
- **Community size** - smaller community than Node.js
- **Hosting options** - not all hosting providers support Bun yet (though major ones do)
- **Some npm packages** may have compatibility issues
- **Team familiarity** - team may need to learn Bun-specific patterns

## Pros and Cons of the Options

### Bun + ElysiaJS

- ✅ **Good**: 3-4x faster than Node.js for WebSocket and HTTP
- ✅ **Good**: Native TypeScript support, no build step
- ✅ **Good**: All-in-one tooling (runtime, bundler, test runner, package manager)
- ✅ **Good**: Excellent developer experience with hot reload
- ✅ **Good**: Type-safe routing with ElysiaJS
- ✅ **Good**: Auto-generated OpenAPI docs
- ✅ **Good**: Small memory footprint
- ❌ **Bad**: Newer ecosystem, potential compatibility issues
- ❌ **Bad**: Smaller community and fewer resources
- ❌ **Bad**: Some hosting providers don't support Bun yet

### Node.js + Express

- ✅ **Good**: Battle-tested and mature
- ✅ **Good**: Huge ecosystem and community
- ✅ **Good**: Works everywhere
- ✅ **Good**: Team already familiar
- ❌ **Bad**: Slower performance, especially for WebSockets
- ❌ **Bad**: Requires separate TypeScript compilation
- ❌ **Bad**: Needs additional tooling (bundler, test runner)
- ❌ **Bad**: Verbose boilerplate
- ❌ **Bad**: No built-in OpenAPI generation
- ❌ **Bad**: Manual type safety

### Node.js + Fastify

- ✅ **Good**: Better performance than Express
- ✅ **Good**: Good TypeScript support
- ✅ **Good**: Schema-based validation
- ✅ **Good**: Mature ecosystem
- ❌ **Bad**: Still slower than Bun
- ❌ **Bad**: More boilerplate than ElysiaJS
- ❌ **Bad**: Requires separate compilation
- ❌ **Bad**: WebSocket support requires plugins

### Deno + Oak

- ✅ **Good**: Secure by default
- ✅ **Good**: Native TypeScript support
- ✅ **Good**: Modern standard library
- ❌ **Bad**: Smaller ecosystem than Node.js
- ❌ **Bad**: npm compatibility can be tricky
- ❌ **Bad**: Slower than Bun
- ❌ **Bad**: Oak is less feature-rich than ElysiaJS
- ❌ **Bad**: Less WebSocket optimization

## Implementation Notes

### Performance Benchmarks

Based on official benchmarks and community testing:

- **HTTP Requests**: Bun is ~3x faster than Node.js
- **WebSocket Messages**: Bun is ~4x faster than Node.js
- **Package Installation**: Bun is ~20x faster than npm
- **Startup Time**: Bun starts ~2x faster than Node.js

### Migration Path

If we need to migrate away from Bun in the future:

1. Most code is standard TypeScript and can be reused
2. ElysiaJS patterns are similar to Express/Fastify
3. Database layer (Drizzle) is runtime-agnostic
4. Business logic is pure TypeScript

### Risk Mitigation

- **Production Stability**: Monitor Bun's stability in production; have Node.js fallback plan
- **Package Compatibility**: Test critical npm packages before using
- **Team Training**: Allocate time for team to learn Bun ecosystem
- **Hosting**: Verify hosting provider supports Bun or use Docker

## Related Decisions

- [ADR-002](002-drizzle-orm.md) - Use Drizzle ORM for Database Management
- [ADR-003](003-redis-pubsub-websocket-scaling.md) - Use Redis Pub/Sub for WebSocket Scaling

## References

- [Bun Official Website](https://bun.sh)
- [ElysiaJS Documentation](https://elysiajs.com)
- [Bun Performance Benchmarks](https://bun.sh/docs/benchmarks)
- [Why Bun is Fast](https://bun.sh/blog/bun-v1.0#fast)
