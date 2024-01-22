import { Cluster, Redis, RedisOptions } from 'ioredis';
import { SentinelAddress } from 'ioredis/built/connectors/SentinelConnector/types';

const REDIS_SENTINEL = process.env.REDIS_SENTINEL || false;
const REDIS_SENTINEL_MASTER = process.env.REDIS_SENTINEL_MASTER || 'mymaster';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const REDIS_PASS = process.env.REDIS_PASS || '';
const REDIS_USER = process.env.REDIS_USER || undefined;
const REDIS_DB = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0;

type BullRedis = Redis | Cluster;
type RedisOptionsType = RedisOptions | {
  sentinels: Partial<SentinelAddress>[];
  name: string;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
};

function parseRedisSentinel(str: string): Partial<SentinelAddress>[] {
  return str
    .split(',')
    .map((sentinelString) => sentinelString.trim())
    .map((sentinelString) => sentinelString.split(':'))
    .map(([host, port]) => ({ host, port: port ? Number(port) : 26379 }));
}

const redis:RedisOptionsType = REDIS_SENTINEL
  ? {
    sentinels: parseRedisSentinel(REDIS_SENTINEL),
    name: REDIS_SENTINEL_MASTER,
    password: REDIS_PASS,
    db: REDIS_DB,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
  : {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    username: REDIS_USER,
    password: REDIS_PASS,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

let client: null | BullRedis = null;
let subscriber: null | BullRedis = null;
const createClient: ((type: 'client' | 'subscriber' | 'bclient') => BullRedis) = (type) => {
  switch (type) {
    case 'client':
      if (!client) {
        client = new Redis(redis as RedisOptions) as unknown as BullRedis;
      }
      return client;
    case 'subscriber':
      if (!subscriber) {
        subscriber = new Redis(redis as RedisOptions) as unknown as BullRedis;
      }
      return subscriber;
    case 'bclient':
      return new Redis(redis as RedisOptions) as unknown as BullRedis;
    default:
      throw new Error('Unexpected connection type: ', type);
  }
};

export default createClient;
