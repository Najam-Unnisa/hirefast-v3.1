/**
 * Google OAuth provider — infrastructure only.
 * Does not expose Express routes or session/login business workflows.
 */
import { getGoogleOAuthConfig, isGoogleOAuthConfigured } from '../../config/google-oauth';
import { AppError } from '../../utils/errors';
import type {
  IOAuthProvider,
  OAuthAuthorizationParams,
  OAuthTokenSet,
  OAuthUserProfile,
} from './auth-provider.interface';

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

type GoogleUserInfoResponse = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = 'google';

  isConfigured(): boolean {
    return isGoogleOAuthConfigured();
  }

  buildAuthorizationUrl(params: OAuthAuthorizationParams): string {
    this.assertConfigured();
    const config = getGoogleOAuthConfig();
    const query = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: params.state,
    });

    if (params.codeChallenge) {
      query.set('code_challenge', params.codeChallenge);
      query.set('code_challenge_method', params.codeChallengeMethod ?? 'S256');
    }

    return `${config.authorizationUrl}?${query.toString()}`;
  }

  async exchangeAuthorizationCode(code: string): Promise<OAuthTokenSet> {
    this.assertConfigured();
    const config = getGoogleOAuthConfig();

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new AppError('Google OAuth token exchange failed.', 502);
    }

    const payload = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      idToken: payload.id_token,
      expiresIn: payload.expires_in,
      tokenType: payload.token_type,
      scope: payload.scope,
    };
  }

  async fetchUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    this.assertConfigured();
    const config = getGoogleOAuthConfig();

    const response = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new AppError('Google OAuth userinfo request failed.', 502);
    }

    const profile = (await response.json()) as GoogleUserInfoResponse;
    return {
      provider: this.name,
      providerSubject: profile.sub,
      email: profile.email,
      emailVerified: Boolean(profile.email_verified),
      name: profile.name,
      givenName: profile.given_name,
      familyName: profile.family_name,
      pictureUrl: profile.picture,
    };
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new AppError('Google OAuth provider is not configured.', 503);
    }
  }
}
