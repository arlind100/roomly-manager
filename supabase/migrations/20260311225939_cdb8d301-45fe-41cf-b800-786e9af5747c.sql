-- Create storage bucket for room type images
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload room images
CREATE POLICY "Authenticated users can upload room images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'room-images');

-- Allow authenticated users to update room images
CREATE POLICY "Authenticated users can update room images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'room-images');

-- Allow authenticated users to delete room images
CREATE POLICY "Authenticated users can delete room images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'room-images');

-- Allow anyone to read room images (public)
CREATE POLICY "Anyone can read room images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'room-images');