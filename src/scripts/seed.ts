import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      username: 'john_doe',
      hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      status: 'ONLINE',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      username: 'jane_smith',
      hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
      status: 'ONLINE',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob_wilson',
      hashedPassword,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      status: 'AWAY',
    },
  });

  // Create sample rooms
  const room1 = await prisma.room.upsert({
    where: { id: 'room-1' },
    update: {},
    create: {
      id: 'room-1',
      name: 'General Discussion',
      description: 'A room for general discussions and casual conversations',
      hostId: user1.id,
      isPrivate: false,
      maxParticipants: 50,
    },
  });

  const room2 = await prisma.room.upsert({
    where: { id: 'room-2' },
    update: {},
    create: {
      id: 'room-2',
      name: 'Team Meeting',
      description: 'Weekly team standup and planning meetings',
      hostId: user2.id,
      isPrivate: true,
      password: 'team123',
      maxParticipants: 20,
    },
  });

  const room3 = await prisma.room.upsert({
    where: { id: 'room-3' },
    update: {},
    create: {
      id: 'room-3',
      name: 'Project Alpha',
      description: 'Discussion room for Project Alpha development',
      hostId: user3.id,
      isPrivate: false,
      maxParticipants: 30,
    },
  });

  // Create sample participants
  await prisma.participant.upsert({
    where: {
      userId_roomId: {
        userId: user1.id,
        roomId: room1.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      roomId: room1.id,
      isAudioMuted: false,
      isVideoMuted: false,
      isScreenSharing: false,
      hasHandRaised: false,
    },
  });

  await prisma.participant.upsert({
    where: {
      userId_roomId: {
        userId: user2.id,
        roomId: room1.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      roomId: room1.id,
      isAudioMuted: true,
      isVideoMuted: false,
      isScreenSharing: false,
      hasHandRaised: false,
    },
  });

  await prisma.participant.upsert({
    where: {
      userId_roomId: {
        userId: user2.id,
        roomId: room2.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      roomId: room2.id,
      isAudioMuted: false,
      isVideoMuted: false,
      isScreenSharing: false,
      hasHandRaised: false,
    },
  });

  await prisma.participant.upsert({
    where: {
      userId_roomId: {
        userId: user3.id,
        roomId: room3.id,
      },
    },
    update: {},
    create: {
      userId: user3.id,
      roomId: room3.id,
      isAudioMuted: false,
      isVideoMuted: true,
      isScreenSharing: false,
      hasHandRaised: true,
    },
  });

  // Create sample chat messages
  const message1 = await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: user1.id,
      message: 'Welcome to the General Discussion room! 👋',
      type: 'TEXT',
    },
  });

  const message2 = await prisma.chatMessage.create({
    data: {
      roomId: room1.id,
      userId: user2.id,
      message: 'Thanks for having me! Looking forward to great discussions.',
      type: 'TEXT',
    },
  });

  const message3 = await prisma.chatMessage.create({
    data: {
      roomId: room2.id,
      userId: user2.id,
      message: 'Team meeting starting in 5 minutes. Please join!',
      type: 'TEXT',
    },
  });

  // Create sample emoji reactions
  await prisma.emojiReaction.create({
    data: {
      messageId: message1.id,
      userId: user2.id,
      emoji: '👋',
    },
  });

  await prisma.emojiReaction.create({
    data: {
      messageId: message1.id,
      userId: user3.id,
      emoji: '🎉',
    },
  });

  await prisma.emojiReaction.create({
    data: {
      messageId: message2.id,
      userId: user1.id,
      emoji: '👍',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log(`  - ${3} users`);
  console.log(`  - ${3} rooms`);
  console.log(`  - ${4} participants`);
  console.log(`  - ${3} chat messages`);
  console.log(`  - ${3} emoji reactions`);
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
