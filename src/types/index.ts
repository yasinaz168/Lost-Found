export type UserRole = 'user' | 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ItemStatus = 'lost' | 'found' | 'claimed' | 'returned' | 'archived';
export type ItemCategory = 'electronics' | 'accessories' | 'documents' | 'clothing' | 'bags' | 'keys' | 'other';

export interface LostItem {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: ItemCategory;
  status: ItemStatus;
  location_lost: string;
  date_lost: string;
  images: string[];
  contact_info: string;
  reward: number | null;
  claim_code: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
  claim?: Claim;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'picked_up';

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  status: ClaimStatus;
  proof_description: string;
  proof_images: string[];
  admin_notes: string | null;
  pickup_location: string | null;
  pickup_time_start: string | null;
  pickup_time_end: string | null;
  pickup_code: string | null;
  approved_at: string | null;
  picked_up_at: string | null;
  created_at: string;
  updated_at: string;
  item?: LostItem;
  claimant?: Profile;
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  description: string | null;
  hours_start: string;
  hours_end: string;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'claim_update' | 'item_found' | 'pickup_reminder' | 'system';
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface AuthState {
  user: Profile | null;
  session: unknown | null;
  loading: boolean;
}
