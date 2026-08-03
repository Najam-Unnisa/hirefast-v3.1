import { R2StorageProvider } from './r2.provider';
import type {
  IStorageProvider,
  StorageDeleteParams,
  StorageUploadParams,
  StorageUploadResult,
} from './storage.interface';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * StorageService — reusable file storage facade.
 * Feature upload endpoints are not part of initialization.
 */
export class StorageService {
  constructor(private readonly provider: IStorageProvider = new R2StorageProvider()) {}

  isReady(): boolean {
    return this.provider.isConfigured();
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    if (!this.provider.isConfigured()) {
      throw new AppError('Storage provider is not configured.', 503);
    }
    logger.info('Storage upload requested', { key: params.key, provider: this.provider.name });
    return this.provider.upload(params);
  }

  async delete(params: StorageDeleteParams): Promise<void> {
    if (!this.provider.isConfigured()) {
      throw new AppError('Storage provider is not configured.', 503);
    }
    logger.info('Storage delete requested', { key: params.key, provider: this.provider.name });
    return this.provider.delete(params);
  }

  getPublicUrl(key: string): string {
    return this.provider.getPublicUrl(key);
  }
}

export const storageService = new StorageService();

export * from './storage.interface';
export * from './r2.provider';
