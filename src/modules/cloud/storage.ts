import { File } from "expo-file-system";

/**
 * Backblaze B2 Cloud Storage client for video assets.
 *
 * Fetches demo videos and other assets from Backblaze B2 buckets.
 * Used for wake word demo videos, tutorial videos, and other media assets.
 *
 * B2 is S3-compatible but uses its own REST API for simplicity.
 * Documentation: https://www.backblaze.com/b2/docs/
 */

export interface VideoAsset {
  id: string;
  name: string;
  description: string;
  url: string;
  bucket: string;
  path: string;
  size: number;
  contentType: string;
  updatedAt: string;
}

export interface B2Config {
  /** Backblaze Application Key ID */
  keyId: string;
  /** Backblaze Application Key */
  applicationKey: string;
  /** Bucket name */
  bucketName: string;
  /** Bucket ID (optional, can be fetched from listBuckets) */
  bucketId?: string;
}

/**
 * Response from b2_list_buckets
 */
interface BucketInfo {
  bucketId: string;
  bucketName: string;
  bucketType: string;
  bucketInfo: Record<string, unknown>;
}

/**
 * Backblaze B2 client for video assets.
 *
 * Uses the B2 Native API (not S3-compatible API) for simplicity.
 * All endpoints require an Application Key for authentication.
 */
export class B2Client {
  private keyId: string;
  private applicationKey: string;
  private bucketName: string;
  private bucketId: string | null = null;
  private baseUrl: string = "https://api.backblazeb2.com";
  private downloadUrl: string = "";
  private authToken: string | null = null;
  private authTokenExpiry: number = 0;

  constructor(config: B2Config) {
    this.keyId = config.keyId;
    this.applicationKey = config.applicationKey;
    this.bucketName = config.bucketName;
    this.bucketId = config.bucketId ?? null;
  }

  /**
   * Check if B2 client is configured and available.
   */
  isAvailable(): boolean {
    return Boolean(this.keyId && this.applicationKey && this.bucketName);
  }

  /**
   * Authenticate with B2 and get authorization token.
   * Token is valid for 24 hours.
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/b2api/v3/b2_authorize_account`,
        {
          method: "GET",
          headers: {
            Authorization:
              "Basic " + btoa(`${this.keyId}:${this.applicationKey}`),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`B2 auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.authorizationToken;
      this.downloadUrl = data.downloadUrl;
      this.authTokenExpiry = Date.now() + 24 * 60 * 60 * 1000 - 60000; // 1 min buffer
    } catch (error) {
      console.error("[B2Client] Auth failed:", error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid auth token.
   */
  private async ensureAuth(): Promise<void> {
    if (!this.authToken || Date.now() >= this.authTokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Get bucket ID from bucket name.
   */
  private async getBucketId(): Promise<string> {
    if (this.bucketId) return this.bucketId;

    await this.ensureAuth();

    const response = await fetch(`${this.baseUrl}/b2api/v3/b2_list_buckets`, {
      method: "POST",
      headers: {
        Authorization: this.authToken!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId: this.keyId,
      }),
    });

    if (!response.ok) {
      throw new Error(`B2 list buckets failed: ${response.status}`);
    }

    const data = await response.json();
    const bucket = data.buckets.find(
      (b: BucketInfo) => b.bucketName === this.bucketName,
    );

    if (!bucket) {
      throw new Error(`Bucket ${this.bucketName} not found`);
    }

    this.bucketId = bucket.bucketId;
    return bucket.bucketId;
  }

  /**
   * List all video assets from the bucket.
   */
  async listVideos(prefix = "videos/"): Promise<VideoAsset[]> {
    if (!this.isAvailable()) {
      throw new Error(
        "B2Client: Not initialized. Provide B2 keyId and applicationKey.",
      );
    }

    await this.ensureAuth();
    await this.getBucketId();

    try {
      const response = await fetch(
        `${this.baseUrl}/b2api/v3/b2_list_file_names`,
        {
          method: "POST",
          headers: {
            Authorization: this.authToken!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucketId: this.bucketId,
            startFileName: prefix,
            maxFileCount: 1000,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`B2 list files failed: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];

      return files.map((file: any) => ({
        id: file.fileName,
        name: file.fileName.split("/").pop() || file.fileName,
        description: "",
        url: `${this.downloadUrl}/file/${this.bucketName}/${file.fileName}`,
        bucket: this.bucketName,
        path: file.fileName,
        size: file.size || 0,
        contentType: file.contentType || "video/mp4",
        updatedAt: file.uploadTimestamp
          ? new Date(parseInt(file.uploadTimestamp)).toISOString()
          : new Date().toISOString(),
      }));
    } catch (error) {
      console.error("[B2Client] Failed to list videos:", error);
      return [];
    }
  }

  /**
   * Get a download URL for a video asset.
   * B2 download URLs are publicly accessible if the bucket is public.
   */
  getPublicUrl(fileName: string): string {
    return `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;
  }

  /**
   * Get authorization token for upload (client-side upload).
   * Returns upload URL and authorization token for direct browser upload.
   */
  async getUploadUrl(fileName: string): Promise<{
    uploadUrl: string;
    authorizationToken: string;
    fileName: string;
  }> {
    await this.ensureAuth();
    await this.getBucketId();

    const response = await fetch(`${this.baseUrl}/b2api/v3/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: this.authToken!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId: this.bucketId,
        fileName,
      }),
    });

    if (!response.ok) {
      throw new Error(`B2 get upload URL failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Upload a video asset to the bucket.
   * Uses B2 native upload URL.
   */
  async uploadVideo(
    fileName: string,
    filePath: string,
    contentType = "video/mp4",
  ): Promise<VideoAsset> {
    if (!this.isAvailable()) {
      throw new Error(
        "B2Client: Not initialized. Provide B2 keyId and applicationKey.",
      );
    }

    try {
      const uploadInfo = await this.getUploadUrl(fileName);

      const response = await fetch(uploadInfo.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: uploadInfo.authorizationToken,
          "X-Bz-File-Name": fileName,
          "Content-Type": contentType,
          "X-Bz-Info-Author": "reem-app",
        },
        body: await new File(filePath).bytes(),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`B2 upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        id: fileName,
        name: fileName.split("/").pop() || fileName,
        description: "",
        url: `${this.downloadUrl}/file/${this.bucketName}/${fileName}`,
        bucket: this.bucketName,
        path: fileName,
        size: data.size || 0,
        contentType,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[B2Client] Failed to upload video ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Upload a video asset from a Blob/File object.
   */
  async uploadVideoFromBlob(
    fileName: string,
    blob: Blob,
    contentType = "video/mp4",
  ): Promise<VideoAsset> {
    if (!this.isAvailable()) {
      throw new Error(
        "B2Client: Not initialized. Provide B2 keyId and applicationKey.",
      );
    }

    try {
      const uploadInfo = await this.getUploadUrl(fileName);

      const response = await fetch(uploadInfo.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: uploadInfo.authorizationToken,
          "X-Bz-File-Name": fileName,
          "Content-Type": contentType,
          "X-Bz-Info-Author": "reem-app",
        },
        body: blob,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`B2 upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        id: fileName,
        name: fileName.split("/").pop() || fileName,
        description: "",
        url: `${this.downloadUrl}/file/${this.bucketName}/${fileName}`,
        bucket: this.bucketName,
        path: fileName,
        size: data.size || 0,
        contentType,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[B2Client] Failed to upload video ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a video asset from the bucket.
   */
  async deleteVideo(fileName: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error(
        "B2Client: Not initialized. Provide B2 keyId and applicationKey.",
      );
    }

    try {
      await this.ensureAuth();
      await this.getBucketId();

      // First get file info to get fileId
      const files = await this.listVideos();
      const file = files.find((f) => f.path === fileName);

      if (!file) {
        throw new Error(`File ${fileName} not found in bucket`);
      }

      // Get file info to get fileId for deletion
      const fileInfoResponse = await fetch(
        `${this.baseUrl}/b2api/v3/b2_get_file_info`,
        {
          method: "POST",
          headers: {
            Authorization: this.authToken!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucketId: this.bucketId,
            fileName,
          }),
        },
      );

      if (!fileInfoResponse.ok) {
        throw new Error(`B2 get file info failed: ${fileInfoResponse.status}`);
      }

      const fileInfo = await fileInfoResponse.json();

      await fetch(`${this.baseUrl}/b2api/v3/b2_delete_file`, {
        method: "POST",
        headers: {
          Authorization: this.authToken!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketId: this.bucketId,
          fileName,
          fileId: fileInfo.fileId,
        }),
      });
    } catch (error) {
      console.error(`[B2Client] Failed to delete video ${fileName}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let b2ClientInstance: B2Client | null = null;

export function getB2Client(config?: B2Config): B2Client {
  if (!b2ClientInstance || config) {
    b2ClientInstance = new B2Client({
      keyId: config?.keyId || process.env.B2_KEY_ID || "",
      applicationKey:
        config?.applicationKey || process.env.B2_APPLICATION_KEY || "",
      bucketName:
        config?.bucketName || process.env.B2_BUCKET_NAME || "reem-ai-assets",
    });
  }
  return b2ClientInstance;
}

export default B2Client;
