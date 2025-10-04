# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Hub API project.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## ADR Index

- [ADR-001](001-bun-and-elysiajs.md) - Use Bun Runtime and ElysiaJS Framework
- [ADR-002](002-drizzle-orm.md) - Use Drizzle ORM for Database Management
- [ADR-003](003-redis-pubsub-websocket-scaling.md) - Use Redis Pub/Sub for WebSocket Scaling
- [ADR-004](004-jwt-three-token-strategy.md) - Implement Three-Token JWT Strategy
- [ADR-005](005-meeting-code-format.md) - Human-Readable Meeting Code Format
- [ADR-006](006-database-schema-design.md) - Database Schema Design with ULID

## ADR Template

We follow the MADR (Markdown Any Decision Records) format with the following structure:

```markdown
# [short title of solved problem and solution]

- Status: [proposed | rejected | accepted | deprecated | superseded by ADR-XXXX]
- Deciders: [list everyone involved in the decision]
- Date: [YYYY-MM-DD when the decision was last updated]

## Context and Problem Statement

[Describe the context and problem statement]

## Decision Drivers

- [driver 1]
- [driver 2]
- ...

## Considered Options

- [option 1]
- [option 2]
- ...

## Decision Outcome

Chosen option: "[option X]", because [justification].

### Positive Consequences

- [e.g., improvement of quality attribute satisfaction, follow-up decisions required, ...]

### Negative Consequences

- [e.g., compromising quality attribute, follow-up decisions required, ...]

## Pros and Cons of the Options

### [option 1]

- Good, because [argument a]
- Bad, because [argument b]

### [option 2]

- Good, because [argument c]
- Bad, because [argument d]

## Links

- [Link type] [Link to ADR]
```

## Status Definitions

- **Proposed**: The ADR is proposed and under discussion
- **Accepted**: The ADR has been accepted and is currently in use
- **Deprecated**: The decision has been deprecated but not replaced
- **Superseded**: The decision has been replaced by another ADR
- **Rejected**: The proposal was rejected

## Naming Convention

ADRs are numbered sequentially and named using the format:
`NNN-title-with-dashes.md`

Where NNN is a zero-padded number (e.g., 001, 002, 010).

## When to Write an ADR

Write an ADR when you make a decision that:

- Has significant impact on the system architecture
- Is difficult or expensive to reverse
- Affects multiple components or teams
- Involves trade-offs between different quality attributes
- May need to be revisited or questioned in the future

## Contributing

When creating a new ADR:

1. Copy the template above
2. Assign it the next sequential number
3. Fill in all sections
4. Get review from relevant stakeholders
5. Update the index in this README
6. Once accepted, the ADR should not be modified (create a superseding ADR instead)
