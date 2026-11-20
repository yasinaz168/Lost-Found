-- Jalankan sekali pada project Supabase yang sudah memakai supabase_schema.sql.
-- Aktifkan Anonymous Sign-Ins di Authentication > Sign In / Providers sebelum memakai app.
-- Jika index klaim aktif gagal karena data ganda yang lama, selesaikan klaim tersebut lalu jalankan ulang.

ALTER TABLE public.profiles ALTER COLUMN email SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengunjung'),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Profil sendiri dapat dibaca; hanya petugas dapat membaca profil lain.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Kolom role/email tidak boleh diubah dari klien biasa.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, email, full_name, phone, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Anyone can view found items" ON public.lost_items;
DROP POLICY IF EXISTS "Anyone can view active lost and found items" ON public.lost_items;
CREATE POLICY "Anyone can view active lost and found items" ON public.lost_items
  FOR SELECT USING (status IN ('lost', 'found', 'claimed') OR reporter_id = auth.uid());
DROP POLICY IF EXISTS "Reporters can view own items" ON public.lost_items;
CREATE POLICY "Reporters can view own items" ON public.lost_items FOR SELECT USING (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all items" ON public.lost_items;
CREATE POLICY "Admins can view all items" ON public.lost_items FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
DROP POLICY IF EXISTS "Users can create items" ON public.lost_items;
CREATE POLICY "Users can create items" ON public.lost_items FOR INSERT WITH CHECK (reporter_id = auth.uid() AND status IN ('lost', 'found'));
DROP POLICY IF EXISTS "Reporters can update own items" ON public.lost_items;
CREATE POLICY "Reporters can update own items" ON public.lost_items FOR UPDATE USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Admins/Staff can update any item" ON public.lost_items;
CREATE POLICY "Admins/Staff can update any item" ON public.lost_items FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'staff'))
  WITH CHECK (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Claimants can view own claims" ON public.claims;
CREATE POLICY "Claimants can view own claims" ON public.claims FOR SELECT USING (claimant_id = auth.uid());
DROP POLICY IF EXISTS "Reporters can view claims on their items" ON public.claims;
CREATE POLICY "Reporters can view claims on their items" ON public.claims FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lost_items WHERE id = claims.item_id AND reporter_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins/Staff can view all claims" ON public.claims;
CREATE POLICY "Admins/Staff can view all claims" ON public.claims FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (
  claimant_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.lost_items
    WHERE id = claims.item_id AND status = 'found' AND reporter_id <> auth.uid()
  )
);
DROP POLICY IF EXISTS "Claimants can cancel own pending claims" ON public.claims;
CREATE POLICY "Claimants can cancel own pending claims" ON public.claims FOR UPDATE
  USING (claimant_id = auth.uid() AND status = 'pending')
  WITH CHECK (claimant_id = auth.uid() AND status IN ('pending', 'cancelled'));
DROP POLICY IF EXISTS "Claimants can confirm approved pickup" ON public.claims;
CREATE POLICY "Claimants can confirm approved pickup" ON public.claims FOR UPDATE
  USING (claimant_id = auth.uid() AND status = 'approved')
  WITH CHECK (claimant_id = auth.uid() AND status = 'picked_up');
DROP POLICY IF EXISTS "Admins/Staff can update any claim" ON public.claims;
CREATE POLICY "Admins/Staff can update any claim" ON public.claims FOR UPDATE
  USING (public.current_user_role() IN ('admin', 'staff'))
  WITH CHECK (public.current_user_role() IN ('admin', 'staff'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_active_per_item
  ON public.claims(item_id) WHERE status IN ('pending', 'approved');

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Admins can manage locations" ON public.pickup_locations;
CREATE POLICY "Admins can manage locations" ON public.pickup_locations FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Object paths begin with the authenticated user's UUID, e.g. <uid>/<item-id>/photo.jpg.
DROP POLICY IF EXISTS "Users can upload item images" ON storage.objects;
CREATE POLICY "Users can upload item images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Claim proofs are accessible to claimant and admin" ON storage.objects;
CREATE POLICY "Claim proofs are accessible to claimant and admin" ON storage.objects FOR SELECT USING (
  bucket_id = 'claim-proofs' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR public.current_user_role() IN ('admin', 'staff')
  )
);
DROP POLICY IF EXISTS "Users can upload claim proofs" ON storage.objects;
CREATE POLICY "Users can upload claim proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'claim-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.sync_item_status_after_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.lost_items
        SET status = 'claimed', claim_code = NEW.pickup_code, updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.status = 'picked_up' THEN
      UPDATE public.lost_items
        SET status = 'returned', updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.lost_items
        SET status = 'found', updated_at = NOW()
        WHERE id = NEW.item_id AND status = 'claimed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_item_status_after_claim ON public.claims;
CREATE TRIGGER sync_item_status_after_claim
  AFTER UPDATE OF status ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_item_status_after_claim();
