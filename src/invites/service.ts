import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { invites, participants } from '../db/schema';
import { errors } from '../common/errors';
import type { ParticipantRole } from '../common/types';

export class InvitesService {
  async create(
    meetingId: string,
    email: string,
    role: ParticipantRole = 'guest'
  ) {
    const [invite] = await db
      .insert(invites)
      .values({
        meetingId,
        email,
        role,
      })
      .returning();

    return invite;
  }

  async findByMeeting(meetingId: string) {
    return db.query.invites.findMany({
      where: eq(invites.meetingId, meetingId),
    });
  }

  async findById(inviteId: string) {
    const invite = await db.query.invites.findFirst({
      where: eq(invites.id, inviteId),
      with: {
        meeting: true,
      },
    });

    if (!invite) {
      throw errors.invite.notFound();
    }

    return invite;
  }

  async accept(inviteId: string, userId: string) {
    const invite = await this.findById(inviteId);

    if (invite.status !== 'pending') {
      throw errors.invite.alreadyProcessed();
    }

    // Update invite status
    await db
      .update(invites)
      .set({ status: 'accepted' })
      .where(eq(invites.id, inviteId));

    // Create participant
    const [participant] = await db
      .insert(participants)
      .values({
        meetingId: invite.meetingId,
        userId,
        role: invite.role,
      })
      .returning();

    return participant;
  }

  async decline(inviteId: string) {
    const invite = await this.findById(inviteId);

    if (invite.status !== 'pending') {
      throw errors.invite.alreadyProcessed();
    }

    await db
      .update(invites)
      .set({ status: 'declined' })
      .where(eq(invites.id, inviteId));
  }
}

export const invitesService = new InvitesService();
