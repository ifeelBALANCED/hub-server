import Redis from 'ioredis';
import { env } from '../env';

// Create Redis connections lazily to avoid connection errors during app startup
let redisInstance: Redis | null = null;
let redisPubInstance: Redis | null = null;
let redisSubInstance: Redis | null = null;

const getRedis = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL);
  }
  return redisInstance;
};

const getRedisPub = (): Redis => {
  if (!redisPubInstance) {
    redisPubInstance = new Redis(env.REDIS_URL);
  }
  return redisPubInstance;
};

const getRedisSub = (): Redis => {
  if (!redisSubInstance) {
    redisSubInstance = new Redis(env.REDIS_URL);
  }
  return redisSubInstance;
};

// Export getters for lazy initialization
export const redis = getRedis();
export const redisPub = getRedisPub();
export const redisSub = getRedisSub();

export const publishToMeeting = async (meetingId: string, message: any) => {
  await redisPub.publish(`meeting:${meetingId}`, JSON.stringify(message));
};

export const subscribeToMeeting = (
  meetingId: string,
  callback: (message: any) => void
) => {
  const channel = `meeting:${meetingId}`;

  redisSub.subscribe(channel, err => {
    if (err) {
      console.error('Failed to subscribe to meeting channel:', err);
    }
  });

  const messageHandler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        callback(JSON.parse(message));
      } catch (err) {
        console.error('Failed to parse Redis message:', err);
      }
    }
  };

  redisSub.on('message', messageHandler);

  return () => {
    redisSub.off('message', messageHandler);
    redisSub.unsubscribe(channel);
  };
};
