import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../constants';
import { authApi, profileApi } from '../lib/supabase';
import type { Profile } from '../types';

const GUEST_ID_KEY = 'lost-found:guest-id:v1';
const GUEST_PROFILE_KEY = 'lost-found:guest-profile:v1';

interface AuthContextType {
  user: Profile | null;
  session: unknown | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SavedGuestProfile {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function makeGuestId() {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateGuest = async (preferredId?: string, activeSession?: unknown | null) => {
    const [storedId, storedDetails] = await Promise.all([
      AsyncStorage.getItem(GUEST_ID_KEY),
      AsyncStorage.getItem(GUEST_PROFILE_KEY),
    ]);
    const saved = storedDetails ? (JSON.parse(storedDetails) as SavedGuestProfile) : {};
    const id = preferredId || storedId || makeGuestId();
    await AsyncStorage.setItem(GUEST_ID_KEY, id);

    let profile: Profile | null = null;
    try {
      profile = await profileApi.get(id);
    } catch (error) {
      console.warn('Profil remote belum dapat dimuat; memakai profil tamu lokal.', error);
    }

    if (!profile) {
      const fallback: Partial<Profile> & { id: string } = {
        id,
        email: '',
        full_name: saved.full_name || 'Pengunjung',
        phone: saved.phone ?? null,
        avatar_url: saved.avatar_url ?? null,
        role: 'user',
      };
      try {
        profile = await profileApi.upsert(fallback);
      } catch (error) {
        console.warn('Profil tamu disimpan hanya di perangkat ini.', error);
        profile = {
          ...fallback,
          email: '',
          full_name: fallback.full_name ?? 'Pengunjung',
          phone: fallback.phone ?? null,
          avatar_url: fallback.avatar_url ?? null,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    if (profile && saved.full_name && (!profile.full_name || profile.full_name === 'Pengunjung')) {
      profile = { ...profile, full_name: saved.full_name, phone: saved.phone ?? profile.phone, avatar_url: saved.avatar_url ?? profile.avatar_url };
    }
    setSession(activeSession ?? null);
    setUser(profile);
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      let sessionValue: unknown | null = null;
      let preferredId: string | undefined;
      if (!DEMO_MODE) {
        try {
          const guestSession = await authApi.ensureGuestSession();
          sessionValue = guestSession;
          preferredId = guestSession?.user?.id;
        } catch (error) {
          console.warn('Sesi anonim belum tersedia; aplikasi dibuka dengan profil lokal.', error);
        }
      }
      try {
        await hydrateGuest(preferredId, sessionValue);
      } catch (error) {
        console.error('Gagal memuat profil tamu:', error);
        const id = preferredId || await AsyncStorage.getItem(GUEST_ID_KEY) || makeGuestId();
        await AsyncStorage.setItem(GUEST_ID_KEY, id);
        if (active) {
          const now = new Date().toISOString();
          setUser({ id, email: '', full_name: 'Pengunjung', phone: null, avatar_url: null, role: 'user', created_at: now, updated_at: now });
          setSession(sessionValue);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    initialize();
    return () => { active = false; };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profile = await profileApi.get(user.id);
      if (profile) setUser(profile);
    } catch (error) {
      console.warn('Profil remote belum dapat diperbarui.', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await import('../lib/supabase').then(({ supabase }) => supabase.auth.signInWithPassword({ email, password }));
    if (error) return { error: new Error(error.message) };
    const { data } = await import('../lib/supabase').then(({ supabase }) => supabase.auth.getSession());
    await hydrateGuest(data.session?.user?.id, data.session);
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await authApi.signOut();
    if (error) throw new Error(error.message);
    setSession(null);
    await hydrateGuest(undefined, null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemoMode: DEMO_MODE, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
