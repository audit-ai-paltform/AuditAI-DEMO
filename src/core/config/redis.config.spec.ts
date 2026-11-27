import { describe, it, expect } from 'vitest';
import { buildRedisOptions } from './redis.config.js';

describe('buildRedisOptions', () => {
  it('should use default 127.0.0.1:6379 for local development when no env vars are set', () => {
    const opts = buildRedisOptions({});
    expect(opts.host).toBe('127.0.0.1');
    expect(opts.port).toBe(6379);
    expect(opts.password).toBeUndefined();
    expect(opts.tls).toBeUndefined();
    expect(opts.maxRetriesPerRequest).toBeNull();
  });

  it('should respect custom REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD for local development', () => {
    const opts = buildRedisOptions({
      REDIS_HOST: '192.168.1.100',
      REDIS_PORT: '6385',
      REDIS_PASSWORD: 'local_dev_password',
    });
    expect(opts.host).toBe('192.168.1.100');
    expect(opts.port).toBe(6385);
    expect(opts.password).toBe('local_dev_password');
    expect(opts.tls).toBeUndefined();
  });

  it('should prefer REDIS_URL over host/port when provided', () => {
    const opts = buildRedisOptions({
      REDIS_URL: 'redis://default:cloud_pass@redis-server.render.com:6379',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6380',
    });
    expect(opts.host).toBe('redis-server.render.com');
    expect(opts.port).toBe(6379);
    expect(opts.username).toBe('default');
    expect(opts.password).toBe('cloud_pass');
    expect(opts.tls).toBeUndefined();
  });

  it('should enable TLS with rejectUnauthorized: false when protocol is rediss://', () => {
    const opts = buildRedisOptions({
      REDIS_URL: 'rediss://red-c1234:pass123@oregon-redis.render.com:6379',
    });
    expect(opts.host).toBe('oregon-redis.render.com');
    expect(opts.port).toBe(6379);
    expect(opts.username).toBe('red-c1234');
    expect(opts.password).toBe('pass123');
    expect(opts.tls).toEqual({ rejectUnauthorized: false });
  });

  it('should throw sanitized error when REDIS_URL has invalid protocol', () => {
    expect(() => {
      buildRedisOptions({ REDIS_URL: 'http://localhost:6379' });
    }).toThrow('Invalid REDIS_URL protocol: must start with redis:// or rediss://');
  });

  it('should throw sanitized error when REDIS_PORT is not a valid number', () => {
    expect(() => {
      buildRedisOptions({ REDIS_PORT: 'invalid_port' });
    }).toThrow('Invalid REDIS_PORT configuration');
  });

  it('should throw sanitized error when REDIS_PORT is out of range', () => {
    expect(() => {
      buildRedisOptions({ REDIS_PORT: '70000' });
    }).toThrow('Invalid REDIS_PORT configuration');
  });
});
