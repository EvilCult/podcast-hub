import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Password hashing (node:crypto scrypt, no new dependencies)
// Format: scrypt$<salt hex>$<hash hex>
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, hashHex] = parts;
    try {
        const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
        const expected = Buffer.from(hashHex, 'hex');
        return hash.length === expected.length && timingSafeEqual(hash, expected);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// JWT (HS256, hand-rolled to avoid new dependencies)
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = 'podcast_hub_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getJwtSecret(): string {
    const fromEnv = process.env.JWT_SECRET?.trim();
    if (fromEnv) return fromEnv;
    // Persist a generated secret so sessions survive restarts without config.
    const file = path.resolve('data/jwt_secret');
    try {
        const saved = fs.readFileSync(file, 'utf8').trim();
        if (saved) return saved;
    } catch {
        /* not created yet */
    }
    const secret = randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
}

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url');
}

export interface SessionPayload {
    uid: number;
    username: string;
}

export function signSession(payload: SessionPayload, maxAgeSec = SESSION_MAX_AGE): string {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + maxAgeSec }));
    const sig = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
    try {
        const [header, body, sig] = token.split('.');
        if (!header || !body || !sig) return null;
        const expected = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
        const a = Buffer.from(sig, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (typeof payload.uid !== 'number' || typeof payload.username !== 'string') return null;
        if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return { uid: payload.uid, username: payload.username };
    } catch {
        return null;
    }
}

export function sessionCookieHeader(token: string): string {
    // httpOnly + Lax; Secure intentionally omitted so plain-http LAN access keeps working.
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookieHeader(): string {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
