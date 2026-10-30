-- Private bucket: clients cannot list or overwrite other users' objects.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-images', 'app-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg', 'image/png', 'image/webp'];
-- No anon/authenticated policies are added. The Node backend authorizes each upload/read.
