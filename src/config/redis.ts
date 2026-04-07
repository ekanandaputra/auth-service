import Redis from 'ioredis';
import { env } from './env';

export let redisClient: Redis | null = null;

// if (env.REDIS_URL) {
//   redisClient = new Redis(env.REDIS_URL);
//   redisClient.on('connect', () => console.log('Redis connected'));
//   redisClient.on('error', (err) => console.error('Redis error', err));
// }
