-- Enable Supabase Storage for media files (voice messages + images)
-- Bucket: "media" — stores audio and image files permanently

-- Create the media bucket (public=false for security, access via signed URLs or API)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  20971520, -- 20 MB max file size
  ARRAY['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/aac',
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for the media bucket
-- Allow service role to insert (server-side upload during message processing)
CREATE POLICY "Service role can upload media"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'media');

-- Allow service role to read (for serving via API)
CREATE POLICY "Service role can read media"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'media');

-- Allow authenticated users to read their own media (path starts with their user_id)
CREATE POLICY "Users can read own media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
