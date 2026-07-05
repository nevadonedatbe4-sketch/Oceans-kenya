import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UploadRequest {
  bucket: string;
  path: string;
  fileBase64: string;
  contentType: string;
}

function getBucketForFileType(contentType: string, bucketHint: string): string {
  if (bucketHint && bucketHint !== 'auto') return bucketHint;
  
  if (contentType.startsWith('image/')) {
    return 'property-images';
  }
  if (contentType === 'application/pdf') {
    return 'property-documents';
  }
  if (contentType.includes('word') || contentType.includes('excel') || contentType.includes('sheet')) {
    return 'property-documents';
  }
  return 'media-library';
}

async function ensureBucket(supabase: any, bucket: string) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b: any) => b.name === bucket);
  if (!bucketExists) {
    const { error: createBucketError } = await supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 52428800,
    });
    if (createBucketError && !createBucketError.message.toLowerCase().includes('already exists')) {
      throw new Error(`Failed to create bucket: ${createBucketError.message}`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as UploadRequest;
    const { bucket: bucketHint, path, fileBase64, contentType } = body;

    if (!fileBase64 || !path || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields: fileBase64, path, contentType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine bucket
    const bucket = getBucketForFileType(contentType, bucketHint);

    // Validate file size (max 50MB)
    const fileBuffer = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large. Max 50MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure bucket exists
    await ensureBucket(supabase, bucket);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        path: uploadData.path,
        bucket,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
