import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let r2ClientInstance: S3Client | null = null;

export function isR2Configured(): boolean {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  if (!r2ClientInstance) {
    const accountId = process.env.R2_ACCOUNT_ID!.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!.trim();

    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2ClientInstance;
}

export function getR2PublicUrlPrefix(): string {
  const custom = process.env.R2_PUBLIC_URL?.trim();
  if (custom) {
    return custom.replace(/\/$/, '');
  }
  return 'https://pub-a89b1c48c94f4548bb1ae2e59dc57973.r2.dev';
}

/**
 * Upload an avatar buffer to Cloudflare R2 and return the public CDN URL
 */
export async function uploadAvatarToR2(
  address: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const client = getR2Client();
  if (!client) {
    return { success: false, error: 'Cloudflare R2 is not configured on server' };
  }

  const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'hemi-profile-storage';
  const cleanAddress = (address || 'guest').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  let extension = 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
  else if (contentType.includes('webp')) extension = 'webp';
  else if (contentType.includes('gif')) extension = 'gif';
  else if (contentType.includes('svg')) extension = 'svg';

  // Use timestamp suffix for cache busting on updates
  const key = `avatars/${cleanAddress}_${Date.now()}.${extension}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);

    const publicUrl = `${getR2PublicUrlPrefix()}/${key}`;
    console.log(`[R2] Successfully uploaded avatar for ${address}: ${publicUrl}`);
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error(`[R2] Failed to upload avatar for ${address}:`, err);
    return { success: false, error: err.message || 'R2 upload failed' };
  }
}
