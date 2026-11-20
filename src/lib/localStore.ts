import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Claim, LostItem, Notification, Profile } from '../types';

const STORE_KEY = 'lost-found:demo-store:v1';
let writeQueue: Promise<void> = Promise.resolve();

interface DemoStore {
  items: LostItem[];
  claims: Claim[];
  profiles: Profile[];
  notifications: Notification[];
}

const makeId = () => {
  const random = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return random.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
};

const dateDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const createInitialStore = (): DemoStore => {
  const now = new Date().toISOString();
  const demoProfile: Profile = {
    id: 'demo-security-desk',
    email: '',
    full_name: 'Pos keamanan',
    phone: null,
    avatar_url: null,
    role: 'staff',
    created_at: now,
    updated_at: now,
  };

  return {
    profiles: [demoProfile],
    claims: [],
    notifications: [],
    items: [
      {
        id: 'demo-found-bottle',
        reporter_id: demoProfile.id,
        title: 'Botol minum stainless',
        description: 'Botol warna biru tua ditemukan di area lobi. Silakan cocokkan ciri khususnya saat mengambil.',
        category: 'accessories',
        status: 'found',
        location_lost: 'Lobi Gedung A',
        date_lost: dateDaysAgo(1).slice(0, 10),
        images: [],
        contact_info: 'Pos Keamanan A · 08.00–20.00',
        reward: null,
        claim_code: null,
        created_at: dateDaysAgo(1),
        updated_at: dateDaysAgo(1),
      },
      {
        id: 'demo-lost-card',
        reporter_id: demoProfile.id,
        title: 'Kartu mahasiswa',
        description: 'Contoh laporan barang hilang. Gunakan formulir untuk menambahkan laporan Anda sendiri.',
        category: 'documents',
        status: 'lost',
        location_lost: 'Perpustakaan lantai 2',
        date_lost: dateDaysAgo(2).slice(0, 10),
        images: [],
        contact_info: 'Pos Keamanan A · 08.00–20.00',
        reward: null,
        claim_code: null,
        created_at: dateDaysAgo(2),
        updated_at: dateDaysAgo(2),
      },
    ],
  };
};

async function loadStoreUnsafe(): Promise<DemoStore> {
  const serialized = await AsyncStorage.getItem(STORE_KEY);
  if (!serialized) {
    const initialStore = createInitialStore();
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(initialStore));
    return initialStore;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<DemoStore>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch {
    const initialStore = createInitialStore();
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(initialStore));
    return initialStore;
  }
}

async function readStore(): Promise<DemoStore> {
  await writeQueue;
  return loadStoreUnsafe();
}

async function updateStore<T>(change: (store: DemoStore) => T | Promise<T>): Promise<T> {
  const operation = writeQueue.then(async () => {
    const store = await loadStoreUnsafe();
    const result = await change(store);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
    return result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

const attachItemRelations = (store: DemoStore, item: LostItem): LostItem => {
  const claim = store.claims
    .filter((entry) => entry.item_id === item.id)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  const reporter = store.profiles.find((profile) => profile.id === item.reporter_id);
  const claimant = claim ? store.profiles.find((profile) => profile.id === claim.claimant_id) : undefined;
  return {
    ...item,
    reporter,
    claim: claim ? { ...claim, item: undefined, claimant } : undefined,
  };
};

export const localStore = {
  async getProfile(userId: string): Promise<Profile | null> {
    const store = await readStore();
    return store.profiles.find((profile) => profile.id === userId) ?? null;
  },

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    return updateStore((store) => {
      const now = new Date().toISOString();
      const existing = store.profiles.find((entry) => entry.id === profile.id);
      const next: Profile = {
        id: profile.id,
        email: profile.email ?? existing?.email ?? '',
        full_name: profile.full_name ?? existing?.full_name ?? 'Pengunjung',
        phone: profile.phone ?? existing?.phone ?? null,
        avatar_url: profile.avatar_url ?? existing?.avatar_url ?? null,
        role: profile.role ?? existing?.role ?? 'user',
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      const index = store.profiles.findIndex((entry) => entry.id === profile.id);
      if (index >= 0) store.profiles[index] = next;
      else store.profiles.push(next);
      return next;
    });
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<Profile | null> {
    return updateStore((store) => {
      const profile = store.profiles.find((entry) => entry.id === userId);
      if (!profile) return null;
      profile.avatar_url = avatarUrl;
      profile.updated_at = new Date().toISOString();
      return profile;
    });
  },

  async getAllItems(filters?: { status?: string; statuses?: string[]; category?: string; search?: string }): Promise<LostItem[]> {
    const store = await readStore();
    const search = filters?.search?.trim().toLocaleLowerCase('id-ID');
    return store.items
      .filter((item) => !filters?.status || item.status === filters.status)
      .filter((item) => !filters?.statuses?.length || filters.statuses.includes(item.status))
      .filter((item) => !filters?.category || item.category === filters.category)
      .filter((item) => !search || `${item.title} ${item.description} ${item.location_lost}`.toLocaleLowerCase('id-ID').includes(search))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((item) => attachItemRelations(store, item));
  },

  async getItemById(id: string): Promise<LostItem | null> {
    const store = await readStore();
    const item = store.items.find((entry) => entry.id === id);
    return item ? attachItemRelations(store, item) : null;
  },

  async getItemsByReporter(reporterId: string): Promise<LostItem[]> {
    const store = await readStore();
    return store.items
      .filter((item) => item.reporter_id === reporterId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((item) => attachItemRelations(store, item));
  },

  async createItem(input: Omit<LostItem, 'id' | 'created_at' | 'updated_at' | 'reporter' | 'claim'>): Promise<LostItem> {
    return updateStore((store) => {
      const now = new Date().toISOString();
      const item: LostItem = {
        ...input,
        id: makeId(),
        images: input.images ?? [],
        created_at: now,
        updated_at: now,
      };
      store.items.unshift(item);
      return item;
    });
  },

  async updateItem(id: string, updates: Partial<LostItem>): Promise<LostItem | null> {
    return updateStore((store) => {
      const item = store.items.find((entry) => entry.id === id);
      if (!item) return null;
      Object.assign(item, updates, { id, updated_at: new Date().toISOString() });
      return item;
    });
  },

  async deleteItem(id: string): Promise<void> {
    await updateStore((store) => {
      store.items = store.items.filter((item) => item.id !== id);
      store.claims = store.claims.filter((claim) => claim.item_id !== id);
    });
  },

  async createClaim(input: Omit<Claim, 'id' | 'created_at' | 'updated_at' | 'item' | 'claimant'>): Promise<Claim> {
    return updateStore((store) => {
      const item = store.items.find((entry) => entry.id === input.item_id);
      if (!item) throw new Error('Barang tidak ditemukan. Muat ulang daftar barang.');
      if (item.status !== 'found') throw new Error('Klaim hanya dapat diajukan untuk barang yang ditemukan.');
      if (item.reporter_id === input.claimant_id) throw new Error('Anda tidak dapat mengklaim laporan sendiri.');
      const activeClaim = store.claims.find((claim) => claim.item_id === item.id && ['pending', 'approved'].includes(claim.status));
      if (activeClaim) throw new Error('Barang ini sudah memiliki klaim yang sedang diproses.');
      const now = new Date().toISOString();
      const claim: Claim = {
        ...input,
        id: makeId(),
        status: input.status || 'pending',
        proof_description: input.proof_description || '',
        proof_images: input.proof_images || [],
        created_at: now,
        updated_at: now,
      };
      store.claims.unshift(claim);
      return claim;
    });
  },

  async getClaimById(id: string): Promise<Claim | null> {
    const store = await readStore();
    const claim = store.claims.find((entry) => entry.id === id);
    if (!claim) return null;
    return {
      ...claim,
      item: store.items.find((item) => item.id === claim.item_id),
      claimant: store.profiles.find((profile) => profile.id === claim.claimant_id),
    };
  },

  async getClaimByItem(itemId: string): Promise<Claim | null> {
    const store = await readStore();
    const claim = store.claims
      .filter((entry) => entry.item_id === itemId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
    if (!claim) return null;
    return { ...claim, claimant: store.profiles.find((profile) => profile.id === claim.claimant_id) };
  },

  async getClaimsByClaimant(claimantId: string): Promise<Claim[]> {
    const store = await readStore();
    return store.claims
      .filter((claim) => claim.claimant_id === claimantId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((claim) => ({ ...claim, item: store.items.find((item) => item.id === claim.item_id) }));
  },

  async getPendingClaims(): Promise<Claim[]> {
    const store = await readStore();
    return store.claims
      .filter((claim) => claim.status === 'pending')
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((claim) => ({
        ...claim,
        item: store.items.find((item) => item.id === claim.item_id),
        claimant: store.profiles.find((profile) => profile.id === claim.claimant_id),
      }));
  },

  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | null> {
    return updateStore((store) => {
      const claim = store.claims.find((entry) => entry.id === id);
      if (!claim) return null;
      Object.assign(claim, updates, { id, updated_at: new Date().toISOString() });
      return claim;
    });
  },

  async approveClaim(id: string, pickupLocation: string, pickupTimeStart: string, pickupTimeEnd: string): Promise<Claim | null> {
    return updateStore((store) => {
      const claim = store.claims.find((entry) => entry.id === id);
      if (!claim || claim.status !== 'pending') return null;
      const now = new Date().toISOString();
      const pickupCode = `PK-${Math.floor(100000 + Math.random() * 900000)}`;
      Object.assign(claim, {
        status: 'approved',
        pickup_location: pickupLocation,
        pickup_time_start: pickupTimeStart,
        pickup_time_end: pickupTimeEnd,
        pickup_code: pickupCode,
        admin_notes: 'Disetujui oleh petugas demo.',
        approved_at: now,
        updated_at: now,
      });
      const item = store.items.find((entry) => entry.id === claim.item_id);
      if (item) {
        item.status = 'claimed';
        item.claim_code = pickupCode;
        item.updated_at = now;
      }
      return claim;
    });
  },

  async rejectClaim(id: string, reason: string): Promise<Claim | null> {
    return updateStore((store) => {
      const claim = store.claims.find((entry) => entry.id === id);
      if (!claim || claim.status !== 'pending') return null;
      const now = new Date().toISOString();
      Object.assign(claim, { status: 'rejected', admin_notes: reason, updated_at: now });
      const item = store.items.find((entry) => entry.id === claim.item_id);
      if (item) {
        item.status = 'found';
        item.updated_at = now;
      }
      return claim;
    });
  },

  async confirmPickup(id: string): Promise<Claim | null> {
    return updateStore((store) => {
      const claim = store.claims.find((entry) => entry.id === id);
      if (!claim || claim.status !== 'approved') return null;
      const now = new Date().toISOString();
      Object.assign(claim, { status: 'picked_up', picked_up_at: now, updated_at: now });
      const item = store.items.find((entry) => entry.id === claim.item_id);
      if (item) {
        item.status = 'returned';
        item.updated_at = now;
      }
      return claim;
    });
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const store = await readStore();
    return store.notifications.filter((notification) => notification.user_id === userId).slice(0, 50);
  },

  async markNotificationRead(id: string): Promise<void> {
    await updateStore((store) => {
      const notification = store.notifications.find((entry) => entry.id === id);
      if (notification) notification.read = true;
    });
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await updateStore((store) => {
      store.notifications.forEach((notification) => {
        if (notification.user_id === userId) notification.read = true;
      });
    });
  },

  async createNotification(input: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification> {
    return updateStore((store) => {
      const notification: Notification = {
        ...input,
        id: makeId(),
        read: false,
        created_at: new Date().toISOString(),
      };
      store.notifications.unshift(notification);
      return notification;
    });
  },

  async clearDemoData(): Promise<void> {
    await AsyncStorage.removeItem(STORE_KEY);
  },
};
