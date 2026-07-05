import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload a file via the upload-image Edge Function.
 * Bypasses client-side storage RLS/CORS issues by using the service role server-side.
 * Defaults to property-images bucket.
 */
export async function uploadImageViaEdgeFunction(
  file: File,
  path: string,
  bucket?: string,
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  if (bucket) {
    formData.append('bucket', bucket);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch(`${supabaseUrl}/functions/v1/upload-image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: supabaseKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errorData.error || `Upload failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Upload a file to a specific bucket via the upload-file Edge Function.
 * Supports property-images, property-documents, media-library, agent-avatars.
 */
export async function uploadFileViaEdgeFunction(
  file: File,
  path: string,
  bucket?: string,
): Promise<{ url: string; path: string; bucket: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch(`${supabaseUrl}/functions/v1/upload-file`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket: bucket || 'auto',
      path,
      fileBase64: base64,
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errorData.error || `Upload failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Ensure the 'images' storage bucket exists.
 * Tries to list a file from it; if it works, bucket exists.
 * Returns true if bucket is available.
 */
export async function ensureStorageBucket(): Promise<boolean> {
  try {
    const { error: listError } = await supabase.storage.from('images').list('', { limit: 1 });
    if (listError) {
      if (listError.message.toLowerCase().includes('not found') || listError.message.toLowerCase().includes('does not exist')) {
        const { error: createError } = await supabase.storage.createBucket('images', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 10485760,
        });
        if (createError) {
          console.error('Failed to create images bucket:', createError);
          return false;
        }
        return true;
      }
      console.error('Storage list error:', listError);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Storage bucket check failed:', err);
    return false;
  }
}

/**
 * Ensure a specific storage bucket exists.
 */
export async function ensureBucket(bucketName: string, options?: { public?: boolean; allowedMimeTypes?: string[]; fileSizeLimit?: number }): Promise<boolean> {
  try {
    const { error: listError } = await supabase.storage.from(bucketName).list('', { limit: 1 });
    if (listError) {
      if (listError.message.toLowerCase().includes('not found') || listError.message.toLowerCase().includes('does not exist')) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: options?.public ?? true,
          allowedMimeTypes: options?.allowedMimeTypes ?? ['image/*'],
          fileSizeLimit: options?.fileSizeLimit ?? 10485760,
        });
        if (createError) {
          console.error(`Failed to create ${bucketName} bucket:`, createError);
          return false;
        }
        return true;
      }
      console.error(`Storage list error for ${bucketName}:`, listError);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Storage bucket check failed for ${bucketName}:`, err);
    return false;
  }
}