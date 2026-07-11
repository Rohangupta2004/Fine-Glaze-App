import { supabase } from './supabase';

export type UploadMediaKind = 'photo' | 'video';

export interface LocalMediaFile {
  uri: string;
  type: UploadMediaKind;
  durationS?: number | null;
  mimeType?: string | null;
  fileName?: string | null;
}

function extensionFor(file: LocalMediaFile): string {
  const fromName = file.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.mimeType?.includes('/')) return file.mimeType.split('/')[1].replace('jpeg', 'jpg');
  return file.type === 'video' ? 'mp4' : 'jpg';
}

function contentTypeFor(file: LocalMediaFile): string {
  return file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg');
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not read selected media (${response.status})`);
  return response.arrayBuffer();
}

export async function uploadLocalMedia(
  bucket: 'attendance-selfies' | 'dpr-media' | 'documents' | 'chat-attachments',
  pathWithoutExtension: string,
  file: LocalMediaFile,
): Promise<string> {
  const path = `${pathWithoutExtension}.${extensionFor(file)}`;
  const body = await uriToArrayBuffer(file.uri);
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: contentTypeFor(file),
    upsert: true,
    cacheControl: '31536000',
  });
  if (error) throw error;
  return path;
}

export async function createSignedMediaUrl(
  bucket: 'attendance-selfies' | 'dpr-media' | 'documents' | 'chat-attachments',
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
