import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';
import { StorageException } from '../../core/exceptions/database.exception.js';

export interface IStorageProvider {
  upload(filePath: string, fileBuffer: Buffer, mimeType: string): Promise<string>;
  download(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  generateSignedUrl(filePath: string, expiresInSeconds?: number): Promise<string>;
  exists(filePath: string): Promise<boolean>;
}

export class SupabaseStorageProvider implements IStorageProvider {
  private readonly bucketName = 'recordings';

  /**
   * Uploads file buffer directly to private Supabase Storage bucket.
   */
  public async upload(filePath: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const startTime = Date.now();
    logger.info({ bucket: this.bucketName, filePath, sizeBytes: fileBuffer.length }, 'Uploading file to Supabase Storage...');

    try {
      const { data, error } = await supabaseAdminClient.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        logger.error({ error, bucket: this.bucketName, filePath }, 'Storage upload operation failed');
        throw new StorageException(`Storage upload failed: ${error.message}`);
      }

      const durationMs = Date.now() - startTime;
      logger.info({ bucket: this.bucketName, filePath, path: data.path, durationMs }, 'Storage upload operation succeeded');
      return data.path;
    } catch (err: unknown) {
      if (err instanceof StorageException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown storage upload error';
      logger.error({ err, bucket: this.bucketName, filePath }, 'Storage upload exception');
      throw new StorageException(`Storage upload exception: ${message}`);
    }
  }

  /**
   * Downloads file object from private Supabase Storage bucket as a Buffer.
   */
  public async download(filePath: string): Promise<Buffer> {
    const startTime = Date.now();
    logger.info({ bucket: this.bucketName, filePath }, 'Downloading file from Supabase Storage...');

    try {
      const { data, error } = await supabaseAdminClient.storage
        .from(this.bucketName)
        .download(filePath);

      if (error || !data) {
        logger.error({ error, bucket: this.bucketName, filePath }, 'Storage download operation failed');
        throw new StorageException(`Storage download failed: ${error?.message || 'Empty response'}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const durationMs = Date.now() - startTime;

      logger.info({ bucket: this.bucketName, filePath, sizeBytes: buffer.length, durationMs }, 'Storage download operation succeeded');
      return buffer;
    } catch (err: unknown) {
      if (err instanceof StorageException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown storage download error';
      logger.error({ err, bucket: this.bucketName, filePath }, 'Storage download exception');
      throw new StorageException(`Storage download exception: ${message}`);
    }
  }

  /**
   * Deletes file object from private Supabase Storage bucket.
   */
  public async delete(filePath: string): Promise<void> {
    logger.info({ bucket: this.bucketName, filePath }, 'Deleting file from Supabase Storage...');

    try {
      const { error } = await supabaseAdminClient.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        logger.error({ error, bucket: this.bucketName, filePath }, 'Storage delete operation failed');
        throw new StorageException(`Storage delete failed: ${error.message}`);
      }

      logger.info({ bucket: this.bucketName, filePath }, 'Storage delete operation succeeded');
    } catch (err: unknown) {
      if (err instanceof StorageException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown storage delete error';
      logger.error({ err, bucket: this.bucketName, filePath }, 'Storage delete exception');
      throw new StorageException(`Storage delete exception: ${message}`);
    }
  }

  /**
   * Generates short-lived Signed URL for secure audio playback (default: 15 mins / 900s).
   */
  public async generateSignedUrl(filePath: string, expiresInSeconds = 900): Promise<string> {
    logger.debug({ bucket: this.bucketName, filePath, expiresInSeconds }, 'Generating signed URL for storage object...');

    try {
      const { data, error } = await supabaseAdminClient.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        logger.error({ error, bucket: this.bucketName, filePath }, 'Signed URL generation failed');
        throw new StorageException(`Signed URL generation failed: ${error?.message || 'Empty response'}`);
      }

      return data.signedUrl;
    } catch (err: unknown) {
      if (err instanceof StorageException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error generating signed URL';
      logger.error({ err, bucket: this.bucketName, filePath }, 'Signed URL generation exception');
      throw new StorageException(`Signed URL generation exception: ${message}`);
    }
  }

  /**
   * Checks if file exists in storage bucket.
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      if (!fileName) return false;

      const { data, error } = await supabaseAdminClient.storage
        .from(this.bucketName)
        .list(folderPath, { search: fileName });

      if (error || !data) return false;
      return data.some((item) => item.name === fileName);
    } catch (err: unknown) {
      logger.warn({ err, bucket: this.bucketName, filePath }, 'Storage file existence check exception');
      return false;
    }
  }

  // Alias methods for backward compatibility
  public async uploadRecording(filePath: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    return this.upload(filePath, fileBuffer, mimeType);
  }

  public async deleteRecording(filePath: string): Promise<void> {
    return this.delete(filePath);
  }

  public async checkFileExists(filePath: string): Promise<boolean> {
    return this.exists(filePath);
  }
}

export const supabaseStorageProvider = new SupabaseStorageProvider();
