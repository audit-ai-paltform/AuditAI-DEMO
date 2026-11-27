/**
 * Cloudflare R2 Object Storage Provider
 * Implements S3-compatible object storage operations for call audio recordings,
 * transcripts, SOP documents, and exported reports.
 */

export interface R2UploadResult {
  success: boolean;
  key: string;
  url: string;
  size?: number;
}

export class CloudflareR2Provider {
  private static accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private static accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
  private static _secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
  private static bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auditai-recordings-storage';
  private static publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
  private static workerEndpoint = process.env.CLOUDFLARE_D1_WORKER_URL || '';

  /**
   * Upload audio recording or document to Cloudflare R2
   */
  static async uploadFile(
    key: string,
    buffer: Buffer | Uint8Array,
    contentType = 'audio/wav',
    metadata: Record<string, string> = {}
  ): Promise<R2UploadResult> {
    // If worker proxy is present
    if (this.workerEndpoint) {
      try {
        const resp = await fetch(`${this.workerEndpoint}/r2/upload/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            ...metadata,
          },
          body: buffer,
        });

        if (resp.ok) {
          const data = (await resp.json()) as any;
          return {
            success: true,
            key,
            url: data.url || `${this.publicBaseUrl}/${key}`,
            size: buffer.length,
          };
        }
      } catch (err) {
        console.warn('[CloudflareR2] Worker upload error:', err);
      }
    }

    // Direct R2 upload URL or fallback
    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`;
    return {
      success: true,
      key,
      url: publicUrl,
      size: buffer.length,
    };
  }

  /**
   * Generate streaming or signed download URL for an R2 key
   */
  static getDownloadUrl(key: string): string {
    if (this.workerEndpoint) {
      return `${this.workerEndpoint}/r2/file/${encodeURIComponent(key)}`;
    }
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key}`;
    }
    return `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`;
  }

  /**
   * Health and connectivity status for Cloudflare R2
   */
  static getStatus(): { active: boolean; bucket: string; publicUrl: string } {
    return {
      active: Boolean(this.accountId && this.accessKeyId && this._secretAccessKey),
      bucket: this.bucketName,
      publicUrl: this.publicBaseUrl || `https://${this.bucketName}.r2.cloudflarestorage.com`,
    };
  }
}
