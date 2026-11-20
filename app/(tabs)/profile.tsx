import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { profileApi, storageApi } from '../../src/lib/supabase';
import { Avatar, Button, Card, Divider, Input } from '../../src/components/UI';
import { DemoNotice, PageIntro } from '../../src/components/AppBlocks';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, loading, isDemoMode, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayedAvatar = editing ? avatarUri : (user?.avatar_url ?? null);

  const beginEditing = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setAvatarUri(user?.avatar_url || null);
    setEditing(true);
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      if (isDemoMode) {
        setAvatarUri(uri);
        return;
      }
      if (!user) return;
      const response = await fetch(uri);
      const publicUrl = await storageApi.uploadAvatar(user.id, await response.blob());
      if (!publicUrl) throw new Error('Foto belum dapat diunggah.');
      setAvatarUri(publicUrl);
    } catch (error) {
      console.error('Gagal memilih foto profil:', error);
      Alert.alert('Foto belum tersimpan', error instanceof Error ? error.message : 'Silakan coba lagi.');
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (fullName.trim().length < 2) {
      Alert.alert('Nama belum lengkap', 'Masukkan nama minimal 2 karakter agar petugas dapat mengenali Anda.');
      return;
    }
    setSaving(true);
    try {
      await profileApi.upsert({ id: user.id, full_name: fullName.trim(), phone: phone.trim() || null, avatar_url: avatarUri });
      await refreshProfile();
      setEditing(false);
      Alert.alert('Tersimpan', 'Profil Anda berhasil diperbarui.');
    } catch (error) {
      console.error('Gagal menyimpan profil:', error);
      Alert.alert('Belum tersimpan', error instanceof Error ? error.message : 'Coba lagi sebentar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}><Text style={{ color: Colors.textSecondary }}>Memuat profil…</Text></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <PageIntro eyebrow="AKUN" title="Profil tamu" subtitle="Gunakan aplikasi tanpa membuat akun." />
      <DemoNotice isDemoMode={isDemoMode} />

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <TouchableOpacity onPress={editing ? pickAvatar : undefined} accessibilityLabel="Pilih foto profil">
            {displayedAvatar ? <Image source={{ uri: displayedAvatar }} style={{ width: 84, height: 84, borderRadius: 42 }} /> : <Avatar name={user?.full_name || 'Pengunjung'} size="xl" />}
          </TouchableOpacity>
          <Text style={{ ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.md }}>{user?.full_name || 'Pengunjung'}</Text>
          <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: 3 }}>{isDemoMode ? 'Data tamu tersimpan di perangkat ini' : 'Sesi anonim aman'}</Text>
          {user?.role && user.role !== 'user' ? <Text style={{ ...Typography.caption, color: Colors.primary, fontWeight: '700', marginTop: Spacing.sm }}>Petugas</Text> : null}
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ ...Typography.h4, color: Colors.textPrimary }}>Informasi kontak</Text>
              <Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: 2 }}>Kontak hanya digunakan untuk urusan barang.</Text>
            </View>
            <Text onPress={() => editing ? setEditing(false) : beginEditing()} style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', padding: Spacing.xs }}>{editing ? 'Batal' : 'Edit'}</Text>
          </View>
          <Divider />
          {editing ? (
            <View style={{ gap: Spacing.md }}>
              <Input label="Nama" placeholder="Nama yang mudah dikenali" value={fullName} onChangeText={setFullName} />
              <Input label="Nomor telepon (opsional)" placeholder="08xx xxxx xxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Button title="Simpan perubahan" onPress={saveProfile} loading={saving} fullWidth />
            </View>
          ) : (
            <View style={{ gap: Spacing.md }}>
              <View><Text style={{ ...Typography.caption, color: Colors.textTertiary }}>Nama</Text><Text style={{ ...Typography.body1, color: Colors.textPrimary, marginTop: 2 }}>{user?.full_name || 'Belum diisi'}</Text></View>
              <View><Text style={{ ...Typography.caption, color: Colors.textTertiary }}>Nomor telepon</Text><Text style={{ ...Typography.body1, color: Colors.textPrimary, marginTop: 2 }}>{user?.phone || 'Belum diisi'}</Text></View>
            </View>
          )}
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/reports')} style={styles.menuRow}>
            <View style={styles.menuGlyph}><Text style={{ color: Colors.primary, fontSize: 18 }}>≡</Text></View>
            <View style={{ flex: 1 }}><Text style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '600' }}>Laporan & klaim</Text><Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Lihat progres aktivitas Anda</Text></View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <Divider style={{ marginVertical: 0 }} />
          <TouchableOpacity onPress={() => router.push('/item/new')} style={styles.menuRow}>
            <View style={styles.menuGlyph}><Text style={{ color: Colors.primary, fontSize: 18 }}>＋</Text></View>
            <View style={{ flex: 1 }}><Text style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '600' }}>Buat laporan</Text><Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Barang hilang atau ditemukan</Text></View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          {(isDemoMode || user?.role === 'admin' || user?.role === 'staff') ? <>
            <Divider style={{ marginVertical: 0 }} />
            <TouchableOpacity onPress={() => router.push('/staff' as never)} style={styles.menuRow}>
              <View style={styles.menuGlyph}><Text style={{ color: Colors.primary, fontSize: 17 }}>✓</Text></View>
              <View style={{ flex: 1 }}><Text style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '600' }}>Panel petugas</Text><Text style={{ ...Typography.caption, color: Colors.textSecondary }}>{isDemoMode ? 'Simulasikan proses klaim' : 'Tinjau klaim pengguna'}</Text></View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </> : null}
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.lg }}>
        <Text style={{ ...Typography.caption, color: Colors.textTertiary, textAlign: 'center' }}>Lost & Found · bantuan sederhana untuk komunitas</Text>
      </View>
    </ScrollView>
  );
}

const styles = {
  menuRow: { minHeight: 72, flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  menuGlyph: { width: 38, height: 38, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, alignItems: 'center' as const, justifyContent: 'center' as const },
  arrow: { color: Colors.textTertiary, fontSize: 24, paddingHorizontal: Spacing.xs },
};
