# Use Redis Pub/Sub for WebSocket Scaling

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

We need to scale our WebSocket server horizontally to handle many concurrent video conference participants. When multiple server instances are running, they need to synchronize WebSocket messages so that participants connected to different servers can communicate in the same meeting room.

## Decision Drivers

- **Horizontal Scalability**: Support multiple server instances
- **Real-time Performance**: Low latency message delivery (<100ms)
- **Reliability**: Message delivery guarantees
- **Operational Complexity**: Easy to deploy and maintain
- **Cost**: Infrastructure and operational costs
- **Developer Experience**: Simple to implement and debug
- **Message Ordering**: Preserve message order within a room
- **Single Node Support**: Work efficiently on single node during development

## Considered Options

1. **Redis Pub/Sub** - Lightweight publish/subscribe messaging
2. **RabbitMQ** - Full-featured message broker
3. **Apache Kafka** - Distributed streaming platform
4. **PostgreSQL LISTEN/NOTIFY** - Database-native pub/sub
5. **Sticky Sessions** - Route users to same server

## Decision Outcome

Chosen option: **Redis Pub/Sub**, because it provides the best balance of performance, simplicity, and operational ease for real-time WebSocket message broadcasting.

### Positive Consequences

- **Low latency** - typically <10ms message propagation
- **Simple setup** - Redis is lightweight and easy to deploy
- **Minimal overhead** - pub/sub is a native Redis feature
- **Already needed** - We use Redis for caching anyway
- **Good developer experience** - Simple API, easy to debug
- **Works on single node** - Fallback to in-memory when only one instance
- **Cost-effective** - No additional infrastructure needed
- **Message fanout** - Efficient one-to-many broadcasting
- **Channel isolation** - Each meeting has its own channel (`meeting:{id}`)

### Negative Consequences

- **No persistence** - Messages are not stored (fire-and-forget)
- **No message replay** - Late joiners don't see previous messages
- **No guaranteed delivery** - If subscriber is down, messages are lost
- **Limited queuing** - Not suitable for complex message processing
- **Pattern matching overhead** - Channel pattern subscriptions can be slow
- **Network dependency** - Redis must be highly available

## Pros and Cons of the Options

### Redis Pub/Sub

- ✅ **Good**: Sub-10ms latency for message propagation
- ✅ **Good**: Simple to implement and operate
- ✅ **Good**: Lightweight, minimal resource usage
- ✅ **Good**: Already using Redis for other features
- ✅ **Good**: Perfect for ephemeral real-time messages
- ✅ **Good**: Channel-based isolation
- ✅ **Good**: Works with any number of subscribers
- ❌ **Bad**: No message persistence
- ❌ **Bad**: No delivery guarantees
- ❌ **Bad**: Not suitable for critical business events

### RabbitMQ

- ✅ **Good**: Message persistence and durability
- ✅ **Good**: Delivery acknowledgments
- ✅ **Good**: Complex routing capabilities
- ✅ **Good**: Dead letter queues
- ❌ **Bad**: Higher latency (~20-50ms)
- ❌ **Bad**: More complex to deploy and manage
- ❌ **Bad**: Heavier resource usage
- ❌ **Bad**: Overkill for real-time chat/signaling
- ❌ **Bad**: Additional infrastructure dependency

### Apache Kafka

- ✅ **Good**: High throughput
- ✅ **Good**: Message persistence
- ✅ **Good**: Message replay capability
- ✅ **Good**: Scalable to millions of messages/sec
- ❌ **Bad**: High latency for our use case (~50-100ms)
- ❌ **Bad**: Complex setup and operation
- ❌ **Bad**: Heavy resource requirements
- ❌ **Bad**: Overkill for real-time video conferencing
- ❌ **Bad**: Significant operational overhead

### PostgreSQL LISTEN/NOTIFY

- ✅ **Good**: No additional infrastructure
- ✅ **Good**: Transactional guarantees
- ✅ **Good**: Built into PostgreSQL
- ❌ **Bad**: Limited throughput
- ❌ **Bad**: Not designed for high-frequency messaging
- ❌ **Bad**: Connection overhead
- ❌ **Bad**: Payload size limits (8KB)
- ❌ **Bad**: Not optimized for fan-out

### Sticky Sessions

- ✅ **Good**: No infrastructure dependency
- ✅ **Good**: Simple to implement
- ✅ **Good**: Lower latency (no network hop)
- ❌ **Bad**: Doesn't solve cross-server communication
- ❌ **Bad**: Uneven load distribution
- ❌ **Bad**: Complicates deployment (session affinity)
- ❌ **Bad**: Server failure disconnects all users
- ❌ **Bad**: Limits scaling effectiveness

## Implementation Details

### Architecture

```
Client A → Server 1 ─┐
Client B → Server 1 ─┤
                     ├→ Redis Pub/Sub (meeting:abc-defg-hij) ─→ All Servers
Client C → Server 2 ─┤
Client D → Server 2 ─┘
```

### Message Flow

1. **Client sends message** via WebSocket to Server 1
2. **Server 1 processes** message and validates
3. **Broadcast locally** to connections on Server 1
4. **Publish to Redis** channel `meeting:{meetingId}`
5. **All servers** subscribed to that channel receive message
6. **Each server** broadcasts to its local WebSocket connections
7. **Clients receive** message regardless of which server they're connected to

### Implementation Example

```typescript
// Publish message to all nodes
export const publishToMeeting = async (meetingId: string, message: any) => {
  await redisPub.publish(`meeting:${meetingId}`, JSON.stringify(message));
};

// Subscribe to messages from other nodes
export const subscribeToMeeting = (
  meetingId: string,
  callback: (message: any) => void
) => {
  const channel = `meeting:${meetingId}`;

  redisSub.subscribe(channel);

  redisSub.on('message', (ch, msg) => {
    if (ch === channel) {
      callback(JSON.parse(msg));
    }
  });
};
```

### Channel Strategy

- **Per-meeting channels**: `meeting:{meetingId}`
- **Isolated communication**: Each meeting has independent channel
- **Efficient unsubscribe**: Leave meeting = unsubscribe from channel
- **No cross-contamination**: Messages only to relevant participants

### Performance Characteristics

- **Latency**: ~5-10ms Redis propagation + network
- **Throughput**: >100K messages/second per Redis instance
- **Scalability**: Tested with 1000+ concurrent meetings
- **Resource usage**: ~1MB memory per 100 channels

## Edge Cases and Limitations

### What happens if Redis is down?

- WebSocket connections still work on same server
- Cross-server broadcasting fails
- Fallback: Log errors, queue messages for retry
- Monitoring: Alert on Redis unavailability

### What about message ordering?

- Redis Pub/Sub preserves order per channel
- Messages from same server arrive in order
- Cross-server messages may arrive out of order
- Mitigation: Add timestamps to messages, client-side ordering if needed

### What about at-least-once delivery?

- Pub/Sub is fire-and-forget
- For critical events (e.g., payment), use persistent queue
- For chat/signaling, ephemeral is acceptable

## Risk Mitigation

- **Redis HA**: Use Redis Sentinel or Cluster in production
- **Circuit breaker**: Degrade gracefully if Redis is down
- **Monitoring**: Track message latency and delivery rates
- **Message limits**: Implement rate limiting per room
- **Fallback**: Can route all WebSocket connections to one server if needed

## Future Considerations

If we need message persistence or guaranteed delivery:

- Use Redis Streams instead of Pub/Sub
- Add RabbitMQ for critical business events
- Implement hybrid: Pub/Sub for real-time, Queue for important events

## Related Decisions

- [ADR-001](001-bun-and-elysiajs.md) - Use Bun Runtime and ElysiaJS Framework
- [ADR-004](004-jwt-three-token-strategy.md) - Implement Three-Token JWT Strategy

## References

- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [Scaling WebSocket with Redis](https://redis.io/topics/pubsub)
- [Redis Pub/Sub Reliability](https://redis.io/docs/manual/pubsub/#reliability)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/) (similar pattern)
