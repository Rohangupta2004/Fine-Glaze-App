import { supabase } from './supabase';

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Get a signed URL for a private Supabase storage object.
 * Returns empty string on error so the UI can show a placeholder.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = SIGNED_URL_EXPIRY
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.warn(`[signedUrl] Failed for ${bucket}/${path}:`, error?.message);
    return '';
  }
  return data.signedUrl;
}
