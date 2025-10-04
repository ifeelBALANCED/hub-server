import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { participants } from '../db/schema';

export class ParticipantsService {
  async findByMeeting(meetingId: string) {
    return db.query.participants.findMany({
      where: eq(participants.meetingId, meetingId),
      with: {
        user: true,
      },
    });
  }

  async findById(participantId: string) {
    return db.query.participants.findFirst({
      where: eq(participants.id, participantId),
      with: {
        user: true,
        meeting: true,
      },
    });
  }

  async updateLeftAt(participantId: string) {
    const [participant] = await db
      .update(participants)
      .set({ leftAt: new Date() })
      .where(eq(participants.id, participantId))
      .returning();

    return participant;
  }
}

export const participantsService = new ParticipantsService();
