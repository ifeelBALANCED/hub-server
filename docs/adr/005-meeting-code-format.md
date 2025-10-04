# Human-Readable Meeting Code Format

- Status: accepted
- Deciders: Development Team
- Date: 2025-10-03

## Context and Problem Statement

Users need a way to share and join meetings easily. We need a meeting identifier that is:

- Easy to share verbally (phone, in-person)
- Easy to type and remember
- Unique across all meetings
- Reasonably short
- Resistant to typos

## Decision Drivers

- **User Experience**: Easy to share and communicate
- **Verbal Communication**: Can be spoken over phone
- **Visual Clarity**: Avoid confusing characters (0/O, 1/I/l)
- **Length**: Short enough to remember and type
- **Uniqueness**: Low collision probability
- **Typing Ease**: Simple to type on any keyboard
- **Aesthetics**: Pleasant visual appearance

## Considered Options

1. **Three-Group Dash Format** - `abc-defg-hij` (3-4-3 lowercase letters)
2. **UUID** - Standard UUID format
3. **Short Code** - 6-8 random characters
4. **Numeric Code** - Phone-like numeric codes
5. **Words Combination** - Three random words

## Decision Outcome

Chosen option: **Three-Group Dash Format** (`abc-defg-hij`), because it balances memorability, uniqueness, verbal shareability, and typing ease.

### Format Specification

- **Pattern**: `[a-z]{3}-[a-z]{4}-[a-z]{3}`
- **Example**: `abc-defg-hij`
- **Character Set**: Lowercase letters a-z only (26 characters)
- **Total Length**: 12 characters (10 letters + 2 dashes)
- **Possible Combinations**: 26^10 = ~141 trillion unique codes

### Positive Consequences

- **Easy to speak**: "ay-bee-cee dash dee-ee-eff-gee dash aitch-eye-jay"
- **Easy to type**: All lowercase, no special characters except dashes
- **Visual grouping**: Dashes make it easier to read and remember
- **No ambiguity**: No numbers means no 0/O or 1/I/l confusion
- **Case insensitive**: Lowercase only, no shift key needed
- **URL-friendly**: Can be used directly in URLs
- **Pleasant appearance**: Looks clean and professional
- **Uniqueness**: ~141 trillion combinations is more than sufficient

### Negative Consequences

- **Longer than numeric**: 12 chars vs 6-8 for numeric codes
- **Need validation**: Must validate format on input
- **Collision handling**: Need retry logic for duplicates (unlikely but possible)
- **Not memorable as words**: Less memorable than word combinations

## Pros and Cons of the Options

### Three-Group Dash Format (abc-defg-hij)

- ✅ **Good**: Easy to speak letter-by-letter
- ✅ **Good**: Visual grouping aids memory
- ✅ **Good**: No confusing characters
- ✅ **Good**: Case insensitive (all lowercase)
- ✅ **Good**: Huge namespace (141 trillion combinations)
- ✅ **Good**: URL and filename safe
- ✅ **Good**: Pleasant visual appearance
- ✅ **Good**: Works in all languages (letters are universal)
- ❌ **Bad**: Longer than some alternatives
- ❌ **Bad**: Requires format validation

### UUID

- ✅ **Good**: Guaranteed unique (practically)
- ✅ **Good**: Standard format
- ✅ **Good**: Large libraries support it
- ❌ **Bad**: Very long (36 characters)
- ❌ **Bad**: Includes numbers and letters (confusion)
- ❌ **Bad**: Hard to communicate verbally
- ❌ **Bad**: Hard to remember
- ❌ **Bad**: Ugly appearance
- ❌ **Bad**: Too technical for end users

Example: `550e8400-e29b-41d4-a716-446655440000`

### Short Code (6-8 alphanumeric)

- ✅ **Good**: Very short
- ✅ **Good**: Easy to type
- ❌ **Bad**: 0/O and 1/I/l confusion
- ❌ **Bad**: Case sensitivity issues (A vs a)
- ❌ **Bad**: Smaller namespace (collision risk)
- ❌ **Bad**: Hard to speak clearly
- ❌ **Bad**: No visual grouping

Example: `xY3kP9` or `abc123`

### Numeric Code

- ✅ **Good**: Easy to type on phone keypad
- ✅ **Good**: Language-independent
- ✅ **Good**: Familiar (like phone numbers)
- ❌ **Bad**: Harder to speak (string of numbers)
- ❌ **Bad**: Smaller namespace than letters
- ❌ **Bad**: No visual distinction
- ❌ **Bad**: Collision risk with fewer characters
- ❌ **Bad**: Less memorable

Example: `123-456-789` or `3847261`

### Words Combination

- ✅ **Good**: Very memorable
- ✅ **Good**: Fun and friendly
- ✅ **Good**: Easy to communicate
- ❌ **Bad**: Language dependent (English only)
- ❌ **Bad**: Very long (20+ characters)
- ❌ **Bad**: Spelling issues (colour vs color)
- ❌ **Bad**: Some words may be inappropriate
- ❌ **Bad**: Harder to type

Example: `happy-purple-elephant` or `quick-brown-fox`

## Implementation Details

### Code Generation

```typescript
import { customAlphabet } from 'nanoid';

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 3);

export const generateMeetingCode = (): string => {
  const part1 = nanoid(); // 3 letters
  const part2 = customAlphabet(alphabet, 4)(); // 4 letters
  const part3 = nanoid(); // 3 letters
  return `${part1}-${part2}-${part3}`;
};
```

### Validation

```typescript
export const validateMeetingCode = (code: string): boolean => {
  const regex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  return regex.test(code);
};
```

### Normalization

```typescript
export const normalizeMeetingCode = (code: string): string => {
  return code.toLowerCase().trim();
};
```

### Collision Handling

```typescript
async createMeeting(data: CreateMeetingDto) {
  let code = generateMeetingCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await db.query.meetings.findFirst({
      where: eq(meetings.code, code),
    });

    if (!existing) break;

    code = generateMeetingCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique meeting code');
  }

  // Create meeting with unique code
}
```

### Collision Probability

With 26^10 possible combinations:

- **At 1 million meetings**: ~0.00001% collision chance
- **At 10 million meetings**: ~0.0001% collision chance
- **At 100 million meetings**: ~0.001% collision chance

Even with millions of meetings, collision is extremely unlikely. The retry logic handles the rare cases.

## User Experience

### Sharing Examples

**Verbal (Phone):**

> "The meeting code is ay-bee-cee dash dee-ee-eff-gee dash aitch-eye-jay"

**Written (Email/Chat):**

> Meeting code: `abc-defg-hij`

**URL:**

> `https://hub.example.com/join/abc-defg-hij`

### Input Handling

- Accept both uppercase and lowercase
- Normalize to lowercase before validation
- Allow copy-paste with extra whitespace
- Show format hint: `xxx-xxxx-xxx`
- Auto-insert dashes as user types (UI enhancement)

### Error Prevention

- Real-time validation feedback
- Format hint always visible
- Suggest did-you-mean for typos (future enhancement)
- Clear error messages: "Code must be in format: xxx-xxxx-xxx"

## Alternative Formats Considered

- `abc-defg-hi` (3-4-2): Odd ending feels unbalanced
- `ab-cdef-ghi` (2-4-3): Similar to 3-4-3 but less consistent
- `abcd-efgh-ij` (4-4-2): Unbalanced ending
- `abc-def-ghi` (3-3-3): Too symmetric, less interesting
- `abcd-efgh-ijkl` (4-4-4): Too long

The **3-4-3** format was chosen as the sweet spot for visual balance and length.

## Future Enhancements

### Custom Vanity Codes

Allow premium users to choose custom codes:

```typescript
// User requests: "my-team-mtg"
if (isValidCustomCode(requestedCode) && !exists(requestedCode)) {
  code = requestedCode;
}
```

### Pronunciation Guide

Add phonetic spelling in UI:

```
abc-defg-hij
(ay-bee-see dash dee-ee-eff-gee dash aitch-eye-jay)
```

### QR Code Generation

Generate QR codes for easy mobile joining:

```typescript
const qrCode = generateQR(`https://hub.example.com/join/${code}`);
```

## Related Decisions

- [ADR-006](006-database-schema-design.md) - Database Schema Design with ULID (for internal IDs)

## References

- [nanoid Documentation](https://github.com/ai/nanoid)
- [Human-Friendly IDs](https://zelark.github.io/nano-id-cc/)
- [Collision Calculator](https://alex7kom.github.io/nano-nanoid-cc/)
- [UX Best Practices for Codes](https://ux.stackexchange.com/questions/91948/best-practices-for-short-codes)
