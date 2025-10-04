import {
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ulid } from 'ulid';

// Enums
export const participantRoleEnum = pgEnum('participant_role', [
  'host',
  'cohost',
  'guest',
]);
export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'declined',
]);

// Users table
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

// Meetings table
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

// Participants table
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

// Invites table
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

// Refresh tokens table
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedMeetings: many(meetings),
  participants: many(participants),
  invites: many(invites), 
  refreshTokens: many(refreshTokens),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  host: one(users, {
    fields: [meetings.hostId],
    references: [users.id],
  }),
  participants: many(participants),
  invites: many(invites),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  meeting: one(meetings, {
    fields: [participants.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [participants.userId],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  meeting: one(meetings, {
    fields: [invites.meetingId],
    references: [meetings.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
