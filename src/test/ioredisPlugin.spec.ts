import { describe, test, expect } from '@jest/globals';
import fastify from 'fastify';
import ioredisMock from 'ioredis-mock';
import ioredisPlugin from '../plugins/ioredis';

describe('ioredisPlugin', () => {
  test('should host', async () => {
    const app = fastify();
    await app.register(ioredisPlugin);

    expect(app.redis).toBeInstanceOf(ioredisMock);
  });

  test('using sentinels', async () => {
    const app = fastify();
    await app.register(ioredisPlugin);

    expect(app.redis).toBeInstanceOf(ioredisMock);
  });

  test('using sentinels', async () => {
    const app = fastify();
    await app.register(ioredisPlugin);

    app.redis.emit('error');

    expect(app.redis).toBeInstanceOf(ioredisMock);
  });
});
