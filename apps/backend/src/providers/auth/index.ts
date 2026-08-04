import { GoogleOAuthProvider } from './google-oauth.provider';
import type { IOAuthProvider } from './auth-provider.interface';
import { AppError } from '../../utils/errors';

/**
 * Auth provider registry — foundation infrastructure.
 * Does not implement login/session/feature HTTP APIs.
 */
export class AuthProviderService {
  constructor(private readonly provider: IOAuthProvider = new GoogleOAuthProvider()) {}

  getProvider(): IOAuthProvider {
    return this.provider;
  }

  getProviderName(): string {
    return this.provider.name;
  }

  isReady(): boolean {
    return this.provider.isConfigured();
  }

  /** Convenience guard for Feature Implementation phase consumers */
  requireReady(): IOAuthProvider {
    if (!this.provider.isConfigured()) {
      throw new AppError('Authentication provider is not configured.', 503);
    }
    return this.provider;
  }
}

export const authProviderService = new AuthProviderService();

export * from './auth-provider.interface';
export * from './google-oauth.provider';
