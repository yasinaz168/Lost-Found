-- Lost & Found Database Schema for Neon (Postgres)
-- Apply with: node scripts/apply-schema.mjs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('electronics', 'accessories', 'documents', 'clothing', 'bags', 'keys', 'other')),
  status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found', 'claimed', 'returned', 'archived')),
  location_lost TEXT NOT NULL,
  date_lost DATE NOT NULL,
  images TEXT[] DEFAULT '{}',
  contact_info TEXT NOT NULL,
  reward INTEGER,
  claim_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'picked_up')),
  proof_description TEXT DEFAULT '',
  proof_images TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  pickup_location TEXT,
  pickup_time_start TIMESTAMPTZ,
  pickup_time_end TIMESTAMPTZ,
  pickup_code TEXT,
  approved_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, claimant_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('claim_update', 'item_found', 'pickup_reminder', 'system')),
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  hours_start TIME NOT NULL,
  hours_end TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO pickup_locations (id, name, address, description, hours_start, hours_end, is_active) VALUES
('pos-a', 'Pos Keamanan A', 'Lobi Gedung A, dekat resepsionis', 'Loket utama di gedung A', '08:00', '20:00', TRUE),
('pos-b', 'Pos Keamanan B', 'Lobi Gedung B, dekat pintu utama', 'Loket dekat pintu utama gedung B', '08:00', '17:00', TRUE),
('pos-c', 'Pos Keamanan C', 'Parkir Basement, dekat lift', 'Loket di area parkir basement', '07:00', '22:00', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_reporter ON lost_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_items_date_lost ON lost_items(date_lost);
CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
