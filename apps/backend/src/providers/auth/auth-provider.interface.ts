/**
 * Authentication / OAuth provider abstraction.
 * Feature modules (login routes, session APIs) must depend on this interface —
 * never on Google HTTP details directly.
 *
 * Login / refresh / logout HTTP APIs are intentionally deferred to Feature Implementation.
 */

export interface OAuthAuthorizationParams {
  state: string;
  /** Optional PKCE code challenge when Feature Implementation enables it */
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export interface OAuthUserProfile {
  provider: string;
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
}

export interface IOAuthProvider {
  readonly name: string;
  isConfigured(): boolean;
  buildAuthorizationUrl(params: OAuthAuthorizationParams): string;
  exchangeAuthorizationCode(code: string): Promise<OAuthTokenSet>;
  fetchUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
