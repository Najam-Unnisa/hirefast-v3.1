/**
 * Object storage abstraction (Cloudflare R2 / S3-compatible).
 * Upload workflows are not implemented in project initialization.
 */

export interface StorageUploadParams {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  key: string;
  bucket: string;
  url?: string;
  etag?: string;
}

export interface StorageDeleteParams {
  key: string;
}

export interface IStorageProvider {
  readonly name: string;
  isConfigured(): boolean;
  upload(params: StorageUploadParams): Promise<StorageUploadResult>;
  delete(params: StorageDeleteParams): Promise<void>;
  getPublicUrl(key: string): string;
}
