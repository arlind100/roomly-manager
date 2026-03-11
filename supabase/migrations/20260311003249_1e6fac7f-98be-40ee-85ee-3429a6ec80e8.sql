
CREATE POLICY "Anyone can read hotels"
ON public.hotels
FOR SELECT
TO public
USING (true);
