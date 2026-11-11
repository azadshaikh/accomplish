import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SecureStorage } from '../../../src/internal/classes/SecureStorage.js';

/**
 * Regression tests for the multi-writer lost-update problem.
 *
 * `secure-storage.json` is one JSON document and each writer used to persist
 * its whole cached snapshot, so a second daemon on the same profile could drop
 * entries written by the first one. That is how a custom provider's API key
 * disappeared while the provider still showed as connected.
 */
describe('SecureStorage multi-writer sync', () => {
  let testDir: string;

  const create = (): SecureStorage =>
    new SecureStorage({ storagePath: testDir, appId: 'test.app.id' });

  const readFileValues = (): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(testDir, 'secure-storage.json'), 'utf-8')).values;

  beforeEach(() => {
    testDir = path.join(
      os.tmpdir(),
      `secure-storage-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('keeps entries written by another instance instead of clobbering them', () => {
    const writerA = create();
    const writerB = create();

    // Both instances load the (empty) file before either writes.
    expect(writerA.getApiKey('custom')).toBeNull();
    expect(writerB.getApiKey('openai')).toBeNull();

    writerA.storeApiKey('custom', 'sk-custom-key');
    writerB.storeApiKey('openai', 'sk-openai-key');

    const values = readFileValues();
    expect(values['apiKey:custom']).toBeDefined();
    expect(values['apiKey:openai']).toBeDefined();
  });

  it('reads keys written by another instance after it loaded', () => {
    const reader = create();
    const writer = create();

    expect(reader.getApiKey('custom')).toBeNull();
    writer.storeApiKey('custom', 'sk-custom-key');

    expect(reader.getApiKey('custom')).toBe('sk-custom-key');
  });

  it('deletes through a stale instance without resurrecting other keys', () => {
    const writerA = create();
    const writerB = create();

    writerA.storeApiKey('custom', 'sk-custom-key');
    writerB.storeApiKey('openai', 'sk-openai-key');

    expect(writerA.deleteApiKey('openai')).toBe(true);
    expect(writerA.getApiKey('custom')).toBe('sk-custom-key');
    expect(readFileValues()['apiKey:openai']).toBeUndefined();
  });

  it('honours a replaced file (new salt) instead of writing stale data', () => {
    const writer = create();
    writer.storeApiKey('custom', 'sk-custom-key');

    // Simulate a reset by another process: a fresh document with a new salt.
    fs.writeFileSync(
      path.join(testDir, 'secure-storage.json'),
      JSON.stringify({
        values: {},
        salt: Buffer.from('a-different-salt-of-32-bytes!!!!').toString('base64'),
      }),
    );

    expect(writer.getApiKey('custom')).toBeNull();
    writer.storeApiKey('openai', 'sk-openai-key');

    const values = readFileValues();
    expect(values['apiKey:custom']).toBeUndefined();
    expect(values['apiKey:openai']).toBeDefined();
  });
});
