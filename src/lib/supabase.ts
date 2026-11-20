import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { DEMO_MODE, SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';
import type { Claim, LostItem, Notification, Profile } from '../types';
import { localStore } from './localStore';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const authApi = {
  async ensureGuestSession() {
    if (DEMO_MODE) return null;
    const { data: current, error: sessionError } = await supabase.auth.getSession();
    throwIfError(sessionError);
    if (current.session) return current.session;

    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: 'Pengunjung' } },
    });
    throwIfError(error);
    return data.session;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
};

export const profileApi = {
  async get(userId: string): Promise<Profile | null> {
    if (DEMO_MODE) return localStore.getProfile(userId);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    throwIfError(error);
    return (data as Profile | null) ?? null;
  },

  async upsert(profile: Partial<Profile> & { id: string }): Promise<Profile | null> {
    if (DEMO_MODE) return localStore.upsertProfile(profile);
    const updates: { full_name?: string | null; phone?: string | null; avatar_url?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if ('full_name' in profile) updates.full_name = profile.full_name ?? null;
    if ('phone' in profile) updates.phone = profile.phone ?? null;
    if ('avatar_url' in profile) updates.avatar_url = profile.avatar_url ?? null;
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', profile.id).select('*').maybeSingle();
    throwIfError(error);
    if (data) return data as Profile;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    throwIfError(authError);
    if (authData.user?.id !== profile.id) throw new Error('Tidak dapat membuat profil untuk sesi yang berbeda.');
    const { data: created, error: insertError } = await supabase.from('profiles').insert({
      id: profile.id,
      email: profile.email ?? authData.user.email ?? '',
      full_name: profile.full_name ?? 'Pengunjung',
      phone: profile.phone ?? null,
      avatar_url: profile.avatar_url ?? null,
    }).select('*').single();
    throwIfError(insertError);
    return (created as Profile | null) ?? null;
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<Profile | null> {
    if (DEMO_MODE) return localStore.updateAvatar(userId, avatarUrl);
    const { data, error } = await supabase.from('profiles').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('id', userId).select('*').maybeSingle();
    throwIfError(error);
    return (data as Profile | null) ?? null;
  },
};

export const itemApi = {
  async create(item: Omit<LostItem, 'id' | 'created_at' | 'updated_at' | 'reporter' | 'claim'>): Promise<LostItem | null> {
    if (DEMO_MODE) return localStore.createItem(item);
    const { data, error } = await supabase.from('lost_items').insert({ ...item, images: item.images ?? [] }).select('*').single();
    throwIfError(error);
    return (data as LostItem | null) ?? null;
  },

  async getAll(filters?: { status?: string; statuses?: string[]; category?: string; search?: string }): Promise<LostItem[]> {
    if (DEMO_MODE) return localStore.getAllItems(filters);
    let query = supabase.from('lost_items').select('*').order('created_at', { ascending: false }).limit(200);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.statuses?.length) query = query.in('status', filters.statuses);
    if (filters?.category) query = query.eq('category', filters.category);
    const { data, error } = await query;
    throwIfError(error);
    let rows = (data ?? []) as LostItem[];
    const search = filters?.search?.trim().toLocaleLowerCase('id-ID');
    if (search) {
      rows = rows.filter((item) => `${item.title} ${item.description ?? ''} ${item.location_lost}`.toLocaleLowerCase('id-ID').includes(search));
    }
    return rows;
  },

  async getById(id: string): Promise<LostItem | null> {
    if (DEMO_MODE) return localStore.getItemById(id);
    const { data, error } = await supabase.from('lost_items').select('*').eq('id', id).maybeSingle();
    throwIfError(error);
    const item = (data as LostItem | null) ?? null;
    if (!item) return null;
    const [reporter, claim] = await Promise.all([
      profileApi.get(item.reporter_id).catch(() => null),
      claimApi.getByItem(id).catch(() => null),
    ]);
    item.reporter = reporter ?? undefined;
    item.claim = claim ?? undefined;
    return item;
  },

  async getByReporter(reporterId: string): Promise<LostItem[]> {
    if (DEMO_MODE) return localStore.getItemsByReporter(reporterId);
    const { data, error } = await supabase.from('lost_items').select('*').eq('reporter_id', reporterId).order('created_at', { ascending: false });
    throwIfError(error);
    const items = (data ?? []) as LostItem[];
    return Promise.all(items.map(async (item) => ({ ...item, claim: (await claimApi.getByItem(item.id).catch(() => null)) ?? undefined })));
  },

  async update(id: string, updates: Partial<LostItem>): Promise<LostItem | null> {
    if (DEMO_MODE) return localStore.updateItem(id, updates);
    const { data, error } = await supabase.from('lost_items').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
    throwIfError(error);
    return (data as LostItem | null) ?? null;
  },

  async delete(id: string): Promise<void> {
    if (DEMO_MODE) return localStore.deleteItem(id);
    const { error } = await supabase.from('lost_items').delete().eq('id', id);
    throwIfError(error);
  },
};

export const claimApi = {
  async create(claim: Omit<Claim, 'id' | 'created_at' | 'updated_at' | 'item' | 'claimant'>): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.createClaim(claim);
    const { data, error } = await supabase.from('claims').insert({
      item_id: claim.item_id,
      claimant_id: claim.claimant_id,
      status: claim.status || 'pending',
      proof_description: claim.proof_description || '',
      proof_images: claim.proof_images || [],
    }).select('*').single();
    throwIfError(error);
    return (data as Claim | null) ?? null;
  },

  async getById(id: string): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.getClaimById(id);
    const { data, error } = await supabase.from('claims').select('*').eq('id', id).maybeSingle();
    throwIfError(error);
    const claim = (data as Claim | null) ?? null;
    if (!claim) return null;
    const [itemResult, claimant] = await Promise.all([
      supabase.from('lost_items').select('*').eq('id', claim.item_id).maybeSingle(),
      profileApi.get(claim.claimant_id).catch(() => null),
    ]);
    throwIfError(itemResult.error);
    return { ...claim, item: (itemResult.data as LostItem | null) ?? undefined, claimant: claimant ?? undefined };
  },

  async getByItem(itemId: string): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.getClaimByItem(itemId);
    const { data, error } = await supabase.from('claims').select('*').eq('item_id', itemId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    throwIfError(error);
    const claim = (data as Claim | null) ?? null;
    if (!claim) return null;
    const claimant = await profileApi.get(claim.claimant_id).catch(() => null);
    return { ...claim, claimant: claimant ?? undefined };
  },

  async getByClaimant(claimantId: string): Promise<Claim[]> {
    if (DEMO_MODE) return localStore.getClaimsByClaimant(claimantId);
    const { data, error } = await supabase.from('claims').select('*').eq('claimant_id', claimantId).order('created_at', { ascending: false });
    throwIfError(error);
    const claims = (data ?? []) as Claim[];
    return Promise.all(claims.map(async (claim) => {
      const { data: item, error: itemError } = await supabase.from('lost_items').select('*').eq('id', claim.item_id).maybeSingle();
      throwIfError(itemError);
      return { ...claim, item: (item as LostItem | null) ?? undefined };
    }));
  },

  async getPendingForAdmin(): Promise<Claim[]> {
    if (DEMO_MODE) return localStore.getPendingClaims();
    const { data, error } = await supabase.from('claims').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    throwIfError(error);
    const claims = (data ?? []) as Claim[];
    return Promise.all(claims.map(async (claim) => {
      const [{ data: item, error: itemError }, claimant] = await Promise.all([
        supabase.from('lost_items').select('*').eq('id', claim.item_id).maybeSingle(),
        profileApi.get(claim.claimant_id).catch(() => null),
      ]);
      throwIfError(itemError);
      return { ...claim, item: (item as LostItem | null) ?? undefined, claimant: claimant ?? undefined };
    }));
  },

  async update(id: string, updates: Partial<Claim>): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.updateClaim(id, updates);
    const { data, error } = await supabase.from('claims').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
    throwIfError(error);
    return (data as Claim | null) ?? null;
  },

  async approve(claimId: string, _adminId: string, pickupLocationId: string, pickupTimeStart: string, pickupTimeEnd: string): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.approveClaim(claimId, pickupLocationId, pickupTimeStart, pickupTimeEnd);
    return this.update(claimId, {
      status: 'approved',
      admin_notes: 'Disetujui oleh petugas.',
      pickup_location: pickupLocationId,
      pickup_time_start: pickupTimeStart,
      pickup_time_end: pickupTimeEnd,
      pickup_code: `PK-${Math.floor(100000 + Math.random() * 900000)}`,
      approved_at: new Date().toISOString(),
    });
  },

  async confirmPickup(claimId: string): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.confirmPickup(claimId);
    return this.update(claimId, { status: 'picked_up', picked_up_at: new Date().toISOString() });
  },

  async reject(claimId: string, reason: string): Promise<Claim | null> {
    if (DEMO_MODE) return localStore.rejectClaim(claimId, reason);
    return this.update(claimId, { status: 'rejected', admin_notes: reason });
  },
};

export const notificationApi = {
  async getForUser(userId: string): Promise<Notification[]> {
    if (DEMO_MODE) return localStore.getNotifications(userId);
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    throwIfError(error);
    return (data ?? []) as Notification[];
  },

  async markAsRead(id: string): Promise<void> {
    if (DEMO_MODE) return localStore.markNotificationRead(id);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    throwIfError(error);
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (DEMO_MODE) return localStore.markAllNotificationsRead(userId);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    throwIfError(error);
  },

  async create(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification | null> {
    if (DEMO_MODE) return localStore.createNotification(notification);
    const { data, error } = await supabase.from('notifications').insert({ ...notification, read: false }).select('*').single();
    throwIfError(error);
    return (data as Notification | null) ?? null;
  },
};

export const storageApi = {
  async uploadAvatar(userId: string, file: Blob): Promise<string | null> {
    if (DEMO_MODE) return null;
    const authenticatedUserId = await getAuthenticatedUserId();
    if (authenticatedUserId !== userId) throw new Error('Foto hanya dapat diunggah ke profil sesi aktif.');
    const path = `${userId}/${Date.now()}`;
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    throwIfError(error);
    if (!data) return null;
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(data.path);
    return publicData.publicUrl;
  },

  async uploadItemImage(itemId: string, file: Blob, index: number): Promise<string | null> {
    if (DEMO_MODE) return null;
    const userId = await getAuthenticatedUserId();
    const path = `${userId}/${itemId}/${index}_${Date.now()}`;
    const { data, error } = await supabase.storage.from('item-images').upload(path, file, { upsert: false });
    throwIfError(error);
    if (!data) return null;
    const { data: publicData } = supabase.storage.from('item-images').getPublicUrl(data.path);
    return publicData.publicUrl;
  },

  async uploadClaimProof(claimId: string, file: Blob, index: number): Promise<string | null> {
    if (DEMO_MODE) return null;
    const userId = await getAuthenticatedUserId();
    const path = `${userId}/${claimId}/${index}_${Date.now()}`;
    const { data, error } = await supabase.storage.from('claim-proofs').upload(path, file, { upsert: false });
    throwIfError(error);
    if (!data) return null;
    return data.path;
  },
};

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  if (!data.user) throw new Error('Sesi pengguna tidak aktif.');
  return data.user.id;
}
