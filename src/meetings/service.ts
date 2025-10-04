import { eq, and, or, desc, gte } from 'drizzle-orm';
import { db } from '../db/client';
import { meetings, participants, users } from '../db/schema';
import { errors } from '../common/errors';
import { generateMeetingCode } from './code';
import type { CreateMeetingDto } from './dto';
import type { ParticipantRole } from '../common/types';

export class MeetingsService {
  async create(hostId: string, data: CreateMeetingDto) {
    // Generate unique code
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
      throw errors.meeting.codeExists();
    }

    // Create meeting
    const [meeting] = await db
      .insert(meetings)
      .values({
        code,
        title: data.title || `Meeting ${code}`,
        hostId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      })
      .returning();

    // Create host participant
    await db.insert(participants).values({
      meetingId: meeting.id,
      userId: hostId,
      role: 'host',
    });

    return {
      id: meeting.id,
      code: meeting.code,
      title: meeting.title,
      hostId: meeting.hostId,
      scheduledAt: meeting.scheduledAt,
      createdAt: meeting.createdAt,
    };
  }

  async findById(meetingId: string, userId?: string) {
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: {
        host: true,
        participants: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!meeting) {
      throw errors.meeting.notFound();
    }

    // Check if user has access
    if (userId) {
      const hasAccess =
        meeting.hostId === userId ||
        meeting.participants.some(p => p.userId === userId);

      if (!hasAccess) {
        throw errors.meeting.forbidden();
      }
    }

    return meeting;
  }

  async findByCode(code: string) {
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.code, code.toLowerCase()),
    });

    if (!meeting) {
      throw errors.meeting.notFound();
    }

    return meeting;
  }

  async findUserMeetings(userId: string, upcoming = false, limit = 10) {
    const conditions = [
      or(eq(meetings.hostId, userId), eq(participants.userId, userId)),
    ];

    if (upcoming) {
      conditions.push(
        or(
          and(
            gte(meetings.scheduledAt, new Date()),
            eq(meetings.endedAt, null)
          ),
          eq(meetings.scheduledAt, null)
        )
      );
    }

    const result = await db
      .select({
        meeting: meetings,
      })
      .from(meetings)
      .leftJoin(participants, eq(participants.meetingId, meetings.id))
      .where(and(...conditions))
      .orderBy(desc(meetings.createdAt))
      .limit(limit);

    return result.map(r => r.meeting);
  }

  async canUserJoin(meetingId: string, userId?: string): Promise<boolean> {
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });

    if (!meeting) return false;
    if (meeting.endedAt) return false;

    // Host can always join
    if (userId && meeting.hostId === userId) return true;

    // Check if user is participant
    if (userId) {
      const participant = await db.query.participants.findFirst({
        where: and(
          eq(participants.meetingId, meetingId),
          eq(participants.userId, userId)
        ),
      });

      if (participant) return true;
    }

    return true; // Allow guests for now
  }

  async getOrCreateParticipant(
    meetingId: string,
    userId: string | null,
    role: ParticipantRole = 'guest'
  ) {
    if (userId) {
      // Try to find existing participant
      const existing = await db.query.participants.findFirst({
        where: and(
          eq(participants.meetingId, meetingId),
          eq(participants.userId, userId)
        ),
      });

      if (existing) return existing;

      // Create new participant
      const [participant] = await db
        .insert(participants)
        .values({
          meetingId,
          userId,
          role,
        })
        .returning();

      return participant;
    } else {
      // Create anonymous participant
      const [participant] = await db
        .insert(participants)
        .values({
          meetingId,
          userId: null,
          role: 'guest',
        })
        .returning();

      return participant;
    }
  }
}

export const meetingsService = new MeetingsService();
