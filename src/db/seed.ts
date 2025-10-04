import { db } from './client';
import { users, meetings, participants, invites } from './schema';
import { authService } from '../auth/service';
import { generateMeetingCode } from '../meetings/code';
import 'dotenv/config';

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Create a demo user
    const passwordHash = await authService.hashPassword('password123');
    const [user] = await db
      .insert(users)
      .values({
        email: 'demo@hub.com',
        passwordHash,
        displayName: 'Demo User',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      })
      .returning();

    console.log('✅ Created user:', user.email);

    // Create a demo meeting
    const code = generateMeetingCode();
    const [meeting] = await db
      .insert(meetings)
      .values({
        code,
        title: 'Welcome to Hub!',
        hostId: user.id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      })
      .returning();

    console.log('✅ Created meeting:', meeting.code);

    // Create host participant
    await db.insert(participants).values({
      meetingId: meeting.id,
      userId: user.id,
      role: 'host',
    });

    console.log('✅ Added host participant');

    // Create a guest invite
    await db.insert(invites).values({
      meetingId: meeting.id,
      email: 'guest@example.com',
      role: 'guest',
      status: 'pending',
    });

    console.log('✅ Created guest invite');

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🎉 Seeding completed successfully!   ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('Demo Credentials:');
    console.log('  Email:    demo@hub.com');
    console.log('  Password: password123');
    console.log('  Meeting:  ' + meeting.code);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
