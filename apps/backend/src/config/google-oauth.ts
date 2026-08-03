/**
 * Google OAuth configuration helpers.
 * Login flows are intentionally not implemented in project initialization.
 */
import { env } from '../config/env';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  return {
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    callbackUrl: env.google.callbackUrl,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
  };
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const config = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${config.authorizationUrl}?${params.toString()}`;
}
