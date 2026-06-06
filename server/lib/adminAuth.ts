import crypto from 'crypto';
import { AdminRole } from '../../src/types';

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.HASH_SECRET || 'mw-adventure-park-secret-salt-2026';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

interface AdminTokenPayload {
  username: string;
  role: AdminRole;
  exp: number;
}

export interface AdminSession {
  username: string;
  role: AdminRole;
}

function getAdminAccounts(): Array<{ username: string; password: string; role: AdminRole }> {
  return [
    {
      username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
      password: process.env.ADMIN_PASSWORD || 'AdminPassword55!',
      role: 'super',
    },
    {
      username: (process.env.STAFF_USERNAME || 'staff').toLowerCase(),
      password: process.env.STAFF_PASSWORD || 'StaffPassword55!',
      role: 'staff',
    },
  ];
}

export function authenticateAdmin(username: string, password: string): AdminSession | null {
  const normalized = username.trim().toLowerCase();
  const account = getAdminAccounts().find((entry) => entry.username === normalized);
  if (!account || account.password !== password) return null;
  return { username: account.username, role: account.role };
}

export function signAdminToken(session: AdminSession): string {
  const payload: AdminTokenPayload = {
    username: session.username,
    role: session.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSession | null {
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (!payload.username || !payload.role || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
