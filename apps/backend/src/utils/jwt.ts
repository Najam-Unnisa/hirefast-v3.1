import jwt, { type JwtPayload as LibJwtPayload, type SignOptions } from 'jsonwebtoken';
import type { AuthTokens, JwtPayload, UserRoleValue } from '@hirefast/shared-types';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

/**
 * Sign / verify JWT access & refresh tokens.
 * Claims are identity-only (`sub`, `email`, `role` ∈ ADMIN|USER|GUEST).
 * Never encode subscription tier as `role`.
 */
export interface TokenUserClaims {
  sub: string;
  email: string;
  role: UserRoleValue;
}

export function signAccessToken(claims: TokenUserClaims): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(claims, env.jwt.accessSecret, options);
}

export function signRefreshToken(claims: TokenUserClaims): string {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(claims, env.jwt.refreshSecret, options);
}

export function createAuthTokens(claims: TokenUserClaims): AuthTokens {
  return {
    accessToken: signAccessToken(claims),
    refreshToken: signRefreshToken(claims),
    expiresIn: env.jwt.accessExpiresIn,
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as LibJwtPayload & JwtPayload;
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token.');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret) as LibJwtPayload & JwtPayload;
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }
}

export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
