import { createHash, randomBytes } from 'crypto';
import { env } from '../../config/env';
import { redisService } from '../../config/redis';

/**
 * Refresh-token persistence foundation (Redis).
 *
 * Stores hashed refresh tokens only — never plaintext.
 * HTTP refresh/logout/session APIs are deferred to Feature Implementation;
 * those modules must use this store rather than inventing ad-hoc Redis keys.
 */

export type RefreshTokenRecord = {
  userId: string;
  role: string;
  email: string;
  familyId: string;
  createdAt: string;
};

function parseDurationToSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 1);
}

export class RefreshTokenStore {
  private readonly keyPrefix = 'auth:refresh:';
  private readonly ttlSeconds: number;

  constructor(ttlSeconds?: number) {
    this.ttlSeconds =
      ttlSeconds ?? parseDurationToSeconds(env.jwt.refreshExpiresIn, 7 * 24 * 60 * 60);
  }

  /** Create an opaque refresh token string for the caller to return to clients. */
  issueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private keyForHash(tokenHash: string): string {
    return `${this.keyPrefix}${tokenHash}`;
  }

  async save(token: string, record: Omit<RefreshTokenRecord, 'createdAt'>): Promise<void> {
    const payload: RefreshTokenRecord = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    await redisService.set(
      this.keyForHash(this.hashToken(token)),
      JSON.stringify(payload),
      this.ttlSeconds,
    );
  }

  async find(token: string): Promise<RefreshTokenRecord | null> {
    const raw = await redisService.get(this.keyForHash(this.hashToken(token)));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RefreshTokenRecord;
    } catch {
      return null;
    }
  }

  async revoke(token: string): Promise<void> {
    await redisService.del(this.keyForHash(this.hashToken(token)));
  }

  async exists(token: string): Promise<boolean> {
    return redisService.exists(this.keyForHash(this.hashToken(token)));
  }

  /**
   * Rotate: revoke previous token and persist a new one in the same family.
   * Returns the new opaque token (caller signs/returns it).
   */
  async rotate(
    previousToken: string,
    record: Omit<RefreshTokenRecord, 'createdAt'>,
  ): Promise<string | null> {
    const existing = await this.find(previousToken);
    if (!existing) return null;

    await this.revoke(previousToken);
    const next = this.issueToken();
    await this.save(next, {
      ...record,
      familyId: existing.familyId,
    });
    return next;
  }
}

export const refreshTokenStore = new RefreshTokenStore();
