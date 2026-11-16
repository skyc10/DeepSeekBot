import { MethodRefused } from './client';
import type { HostClient } from './host-settings';

export type CloudConnectionView = {
  connection: {
    id: string;
    fingerprint: string;
    name: string;
    organizationId: string;
    channelId: string;
    actorId: string;
    ownerUserId: string;
    version: number;
    config?: unknown;
  };
  active: boolean;
  revision: number;
  cursor: number;
  policy: { allowedUsers: string[]; forwardTargets: string[]; environment: string };
};

export type CloudConnectionsResult = {
  connections: CloudConnectionView[];
  credentialRemoved?: boolean;
};

export type CloudResult =
  | { kind: 'ok'; result: CloudConnectionsResult }
  | { kind: 'rejected'; message: string }
  | { kind: 'refused' }
  | { kind: 'error' };

function callResult(value: unknown): CloudConnectionsResult {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as { connections?: unknown }).connections))
    return { connections: [] };
  return value as CloudConnectionsResult;
}

function failure(error: unknown): CloudResult {
  if (error instanceof MethodRefused) {
    if (error.code === 'secret-route-refused') return { kind: 'refused' };
    return { kind: 'rejected', message: error.message };
  }
  return { kind: 'error' };
}

export async function listCloudConnections(client: HostClient): Promise<CloudResult> {
  try {
    const value = await client.call<unknown>('cloudConnections', { operation: 'list' });
    return { kind: 'ok', result: callResult(value) };
  } catch (error) {
    return failure(error);
  }
}

/** Import a credential; the Host makes the imported connection active. */
export async function importCloudCredential(
  client: HostClient,
  credential: Record<string, unknown>,
): Promise<CloudResult> {
  try {
    const value = await client.call<unknown>('cloudConnections', {
      operation: 'import',
      credential,
    });
    return { kind: 'ok', result: callResult(value) };
  } catch (error) {
    return failure(error);
  }
}

export type CredentialText =
  | { kind: 'valid'; credential: Record<string, unknown> }
  | { kind: 'invalid'; reason: 'json' | 'shape' | 'large' };

const MAX_CREDENTIAL_TEXT = 20_000;

/**
 * Parse a pasted Cloud Agent credential without ever echoing its secret.
 * Mirrors the Host's shape check so a malformed paste fails before the write.
 */
export function parseCredentialText(text: string): CredentialText {
  if (text.length > MAX_CREDENTIAL_TEXT) return { kind: 'invalid', reason: 'large' };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: 'invalid', reason: 'json' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { kind: 'invalid', reason: 'shape' };
  const v = value as Record<string, unknown>;
  const allowed = [
    'version',
    'config',
    'organizationId',
    'channelId',
    'actorId',
    'ownerUserId',
    'name',
    'operationId',
    'secret',
  ];
  const valid =
    v.version === 1 &&
    typeof v.organizationId === 'string' &&
    /^org_[A-Za-z0-9]+$/.test(v.organizationId) &&
    typeof v.channelId === 'string' &&
    /^ch_[a-f0-9]{64}$/.test(v.channelId) &&
    typeof v.actorId === 'string' &&
    /^ag_[a-f0-9]{64}$/.test(v.actorId) &&
    typeof v.ownerUserId === 'string' &&
    /^user_[A-Za-z0-9]+$/.test(v.ownerUserId) &&
    typeof v.name === 'string' &&
    v.name.trim().length > 0 &&
    v.name.length <= 80 &&
    Object.keys(v).every((key) => allowed.includes(key));
  return valid ? { kind: 'valid', credential: v } : { kind: 'invalid', reason: 'shape' };
}
