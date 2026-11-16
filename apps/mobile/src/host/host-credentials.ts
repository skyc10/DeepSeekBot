import { MethodRefused } from './client';
import type { HostClient } from './host-settings';

/**
 * Client-safe view of one credential. The full secret is never returned by the
 * Host: only these configuration facts and an optional provider-masked preview.
 */
export type CredentialInfo = {
  configured: boolean;
  source?: string;
  writable: boolean;
  masked?: string;
};

export type CredentialWriteResult =
  | { kind: 'saved' }
  | { kind: 'removed' }
  | { kind: 'rejected'; message: string }
  | { kind: 'refused' }
  | { kind: 'error' };

/** A credential reference is a POSIX-style environment-variable name. */
const REF = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validCredentialRef(ref: string): boolean {
  return REF.test(ref);
}

export async function describeCredentials(
  client: HostClient,
  refs: readonly string[],
): Promise<Record<string, CredentialInfo>> {
  const value = await client.call<unknown>('credentials/describe', { refs: [...refs] });
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Record<string, CredentialInfo>;
}

function writeFailure(error: unknown): CredentialWriteResult {
  if (error instanceof MethodRefused) {
    if (error.code === 'secret-route-refused') return { kind: 'refused' };
    return { kind: 'rejected', message: error.message };
  }
  return { kind: 'error' };
}

/** Write a secret value. The value is sent once and never stored or read back. */
export async function setCredential(
  client: HostClient,
  ref: string,
  value: string,
): Promise<CredentialWriteResult> {
  try {
    await client.call('credentials/set', { ref, value });
    return { kind: 'saved' };
  } catch (error) {
    return writeFailure(error);
  }
}

/** Remove a stored credential. Takes a reference, never a value. */
export async function unsetCredential(
  client: HostClient,
  ref: string,
): Promise<CredentialWriteResult> {
  try {
    await client.call('credentials/unset', { ref });
    return { kind: 'removed' };
  } catch (error) {
    return writeFailure(error);
  }
}
