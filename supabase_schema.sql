-- Lost & Found schema for Supabase.
-- Run this file in SQL Editor for a new project, then enable Anonymous Sign-Ins.
-- For an existing installation, run supabase_guest_setup.sql instead.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('electronics', 'accessories', 'documents', 'clothing', 'bags', 'keys', 'other')),
  status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found', 'claimed', 'returned', 'archived')),
  location_lost TEXT NOT NULL,
  date_lost DATE NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  contact_info TEXT NOT NULL,
  reward INTEGER CHECK (reward IS NULL OR reward >= 0),
  claim_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'picked_up')),
  proof_description TEXT NOT NULL DEFAULT '',
  proof_images TEXT[] NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  pickup_location TEXT,
  pickup_time_start TIMESTAMPTZ,
  pickup_time_end TIMESTAMPTZ,
  pickup_code TEXT,
  approved_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, claimant_id)
);

-- One item must never have two concurrent pending/approved claimants.
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_active_per_item
  ON public.claims(item_id) WHERE status IN ('pending', 'approved');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('claim_update', 'item_found', 'pickup_reminder', 'system')),
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pickup_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  hours_start TIME NOT NULL,
  hours_end TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.pickup_locations (id, name, address, description, hours_start, hours_end, is_active) VALUES
  ('pos-a', 'Pos Keamanan A', 'Lobi Gedung A, dekat resepsionis', 'Loket utama di gedung A', '08:00', '20:00', TRUE),
  ('pos-b', 'Pos Keamanan B', 'Lobi Gedung B, dekat pintu utama', 'Loket dekat pintu utama gedung B', '08:00', '17:00', TRUE),
  ('pos-c', 'Pos Keamanan C', 'Parkir Basement, dekat lift', 'Loket di area parkir basement', '07:00', '22:00', TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER avoids recursive profile-table reads from role-checking policies.
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
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- A user can edit contact details, but cannot grant themselves staff/admin privileges.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, email, full_name, phone, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_items, public.claims, public.notifications TO authenticated;
GRANT SELECT ON public.pickup_locations TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view found items" ON public.lost_items;
DROP POLICY IF EXISTS "Anyone can view active lost and found items" ON public.lost_items;
CREATE POLICY "Anyone can view active lost and found items" ON public.lost_items
  FOR SELECT USING (status IN ('lost', 'found', 'claimed') OR reporter_id = auth.uid());
DROP POLICY IF EXISTS "Reporters can view own items" ON public.lost_items;
CREATE POLICY "Reporters can view own items" ON public.lost_items FOR SELECT USING (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all items" ON public.lost_items;
CREATE POLICY "Admins can view all items" ON public.lost_items FOR SELECT USING (public.current_user_role() IN ('admin', 'staff'));
DROP POLICY IF EXISTS "Users can create items" ON public.lost_items;
CREATE POLICY "Users can create items" ON public.lost_items FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND status IN ('lost', 'found'));
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

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Anyone can view active locations" ON public.pickup_locations;
CREATE POLICY "Anyone can view active locations" ON public.pickup_locations FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Admins can manage locations" ON public.pickup_locations;
CREATE POLICY "Admins can manage locations" ON public.pickup_locations FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', TRUE),
  ('item-images', 'item-images', TRUE),
  ('claim-proofs', 'claim-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Item images are publicly accessible" ON storage.objects;
CREATE POLICY "Item images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
DROP POLICY IF EXISTS "Users can upload item images" ON storage.objects;
CREATE POLICY "Users can upload item images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Claim proofs are accessible to claimant and admin" ON storage.objects;
CREATE POLICY "Claim proofs are accessible to claimant and admin" ON storage.objects FOR SELECT USING (
  bucket_id = 'claim-proofs' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR public.current_user_role() IN ('admin', 'staff')
  )
);
DROP POLICY IF EXISTS "Users can upload claim proofs" ON storage.objects;
CREATE POLICY "Users can upload claim proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengunjung'), 'user')
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_lost_items_updated_at ON public.lost_items;
CREATE TRIGGER update_lost_items_updated_at BEFORE UPDATE ON public.lost_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_claims_updated_at ON public.claims;
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_item_status_after_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.lost_items SET status = 'claimed', claim_code = NEW.pickup_code, updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.status = 'picked_up' THEN
      UPDATE public.lost_items SET status = 'returned', updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.lost_items SET status = 'found', updated_at = NOW() WHERE id = NEW.item_id AND status = 'claimed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_item_status_after_claim ON public.claims;
CREATE TRIGGER sync_item_status_after_claim AFTER UPDATE OF status ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.sync_item_status_after_claim();

CREATE INDEX IF NOT EXISTS idx_lost_items_status ON public.lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_reporter ON public.lost_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON public.lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_items_date_lost ON public.lost_items(date_lost);
CREATE INDEX IF NOT EXISTS idx_claims_item ON public.claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
