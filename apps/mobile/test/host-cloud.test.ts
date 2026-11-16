import { describe, expect, it, vi } from 'vitest';

import { MethodRefused } from '../src/host/client';
import {
  importCloudCredential,
  listCloudConnections,
  parseCredentialText,
  type CloudResult,
} from '../src/host/host-cloud';
import type { HostClient } from '../src/host/host-settings';

const hex = (c: string) => c.repeat(64);
const credential = {
  version: 1,
  organizationId: 'org_abc123',
  channelId: `ch_${hex('a')}`,
  actorId: `ag_${hex('b')}`,
  ownerUserId: 'user_abc123',
  name: 'Work cloud',
  secret: hex('c'),
};

function harness(value: unknown = { connections: [] }) {
  const calls: Array<{ method: string; args: Record<string, unknown> | undefined }> = [];
  let failure: unknown;
  const client = {
    call: vi.fn(async (method: string, args?: Record<string, unknown>) => {
      calls.push({ method, args });
      if (failure !== undefined) throw failure;
      return value;
    }),
  } as unknown as HostClient;
  return {
    client,
    calls,
    fail: (error: unknown) => {
      failure = error;
    },
  };
}

describe('parseCredentialText', () => {
  it('accepts a valid credential and drops nothing from it', () => {
    const parsed = parseCredentialText(JSON.stringify(credential));
    expect(parsed.kind).toBe('valid');
    if (parsed.kind === 'valid') expect(parsed.credential).toEqual(credential);
  });

  it('rejects malformed JSON, wrong shapes and oversized input', () => {
    expect(parseCredentialText('{')).toEqual({ kind: 'invalid', reason: 'json' });
    expect(parseCredentialText('[]')).toEqual({ kind: 'invalid', reason: 'shape' });
    expect(parseCredentialText(JSON.stringify({ ...credential, version: 2 }))).toEqual({
      kind: 'invalid',
      reason: 'shape',
    });
    expect(parseCredentialText(JSON.stringify({ ...credential, extra: 1 }))).toEqual({
      kind: 'invalid',
      reason: 'shape',
    });
    expect(parseCredentialText('x'.repeat(20_001))).toEqual({ kind: 'invalid', reason: 'large' });
  });
});

describe('cloud connections transport', () => {
  it('lists connections through the cloudConnections bridge', async () => {
    const value = { connections: [{ active: true }] };
    const { client, calls } = harness(value);
    await expect(listCloudConnections(client)).resolves.toEqual({ kind: 'ok', result: value });
    expect(calls).toEqual([{ method: 'cloudConnections', args: { operation: 'list' } }]);
  });

  it('imports a credential by operation/credential payload', async () => {
    const { client, calls } = harness();
    await expect(importCloudCredential(client, credential)).resolves.toEqual({
      kind: 'ok',
      result: { connections: [] },
    });
    expect(calls).toEqual([
      { method: 'cloudConnections', args: { operation: 'import', credential } },
    ]);
  });

  it('maps refusals, rejections, unknown errors and malformed results', async () => {
    const { client, fail } = harness('garbage');
    await expect(listCloudConnections(client)).resolves.toEqual({
      kind: 'ok',
      result: { connections: [] },
    });

    fail(new MethodRefused('secret-route-refused', 'no'));
    await expect(importCloudCredential(client, credential)).resolves.toEqual({ kind: 'refused' });
    fail(new MethodRefused('CLOUD_CONNECTION_CHANGED', 'changed'));
    await expect(listCloudConnections(client)).resolves.toEqual({
      kind: 'rejected',
      message: 'changed',
    });
    fail(new Error('network'));
    const result: CloudResult = await listCloudConnections(client);
    expect(result).toEqual({ kind: 'error' });
  });
});
