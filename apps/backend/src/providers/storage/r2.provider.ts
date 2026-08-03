import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type {
  IStorageProvider,
  StorageDeleteParams,
  StorageUploadParams,
  StorageUploadResult,
} from './storage.interface';

/**
 * Cloudflare R2 storage provider (S3-compatible API).
 * Does not implement feature-level upload flows.
 */
export class R2StorageProvider implements IStorageProvider {
  public readonly name = 'cloudflare-r2';
  private client: S3Client | null = null;

  isConfigured(): boolean {
    return Boolean(
      env.r2.accessKeyId && env.r2.secretAccessKey && (env.r2.endpoint || env.r2.accountId),
    );
  }

  private getEndpoint(): string {
    if (env.r2.endpoint) return env.r2.endpoint;
    return `https://${env.r2.accountId}.r2.cloudflarestorage.com`;
  }

  private getClient(): S3Client {
    if (!this.isConfigured()) {
      throw new AppError('R2 storage provider is not configured.', 503);
    }
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.getEndpoint(),
        credentials: {
          accessKeyId: env.r2.accessKeyId,
          secretAccessKey: env.r2.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const client = this.getClient();
    const result = await client.send(
      new PutObjectCommand({
        Bucket: env.r2.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      }),
    );

    return {
      key: params.key,
      bucket: env.r2.bucketName,
      url: this.getPublicUrl(params.key),
      etag: result.ETag,
    };
  }

  async delete(params: StorageDeleteParams): Promise<void> {
    const client = this.getClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.r2.bucketName,
        Key: params.key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    if (env.r2.publicUrl) {
      return `${env.r2.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `${this.getEndpoint()}/${env.r2.bucketName}/${key}`;
  }
}
