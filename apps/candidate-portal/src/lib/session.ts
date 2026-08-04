import {
  SESSION_ACCESS_TOKEN_KEY,
  SESSION_ATTEMPT_ID_KEY,
  SESSION_REFRESH_TOKEN_KEY,
} from '@/constants/app';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SESSION_REFRESH_TOKEN_KEY);
}

export function saveSessionTokens(tokens: SessionTokens): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SESSION_ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(SESSION_REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearSessionTokens(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
}

export function saveAttemptId(attemptId: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SESSION_ATTEMPT_ID_KEY, attemptId);
}

export function getAttemptId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SESSION_ATTEMPT_ID_KEY);
}

export function clearAttemptId(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_ATTEMPT_ID_KEY);
}
