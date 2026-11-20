import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { claimApi } from '../src/lib/supabase';
import { Button, Card, EmptyState } from '../src/components/UI';
import { DemoNotice, ErrorNotice, LoadingState, PageIntro } from '../src/components/AppBlocks';
import { PICKUP_LOCATIONS, formatDateTime } from '../src/constants';
import { Colors, Spacing, Typography, BorderRadius } from '../src/constants/theme';
import type { Claim } from '../src/types';

function makeDefaultPickupWindow() {
  const start = new Date(Date.now() + 60 * 60_000);
  start.setMinutes(0, 0, 0);
  return { start, end: new Date(start.getTime() + 60 * 60_000) };
}

export default function StaffScreen() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStaff = isDemoMode || user?.role === 'admin' || user?.role === 'staff';

  const loadClaims = useCallback(async () => {
    if (!isStaff) { setLoading(false); return; }
    setError(null);
    try {
      setClaims(await claimApi.getPendingForAdmin());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Klaim belum dapat dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => { void loadClaims(); }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, loadClaims]);

  const approve = async (claim: Claim) => {
    setBusyId(claim.id);
    try {
      const { start, end } = makeDefaultPickupWindow();
      const approved = await claimApi.approve(claim.id, user?.id ?? 'demo-staff', PICKUP_LOCATIONS[0].id, start.toISOString(), end.toISOString());
      if (!approved) throw new Error('Klaim tidak ditemukan atau sudah diproses.');
      Alert.alert('Klaim disetujui', 'Kode dan jadwal pengambilan sudah dibuat.');
      await loadClaims();
    } catch (approveError) {
      Alert.alert('Belum dapat disetujui', approveError instanceof Error ? approveError.message : 'Coba lagi sebentar.');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) return <View style={{ flex: 1, backgroundColor: Colors.background }}><LoadingState /></View>;
  if (!isStaff) return <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: Spacing.md }}><Card><Text style={{ ...Typography.h4, color: Colors.textPrimary }}>Akses petugas diperlukan</Text><Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.sm }}>Gunakan akun petugas yang sudah diberi peran admin atau staff pada Supabase.</Text><Button title="Kembali ke profil" onPress={() => router.replace('/(tabs)/profile')} style={{ marginTop: Spacing.md }} /></Card></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.xl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadClaims(); }} colors={[Colors.primary]} />}>
      <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}><Text onPress={() => router.back()} style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', paddingVertical: Spacing.sm }}>‹  Kembali</Text></View>
      <PageIntro eyebrow="PANEL PETUGAS" title="Tinjau klaim" subtitle="Periksa bukti sebelum membuat jadwal serah terima." />
      <DemoNotice isDemoMode={isDemoMode} />
      {isDemoMode ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.sm }}><Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Persetujuan di mode demo hanya simulasi pada perangkat ini.</Text></View> : null}
      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        {loading ? <LoadingState label="Memuat klaim menunggu…" /> : error ? <ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadClaims(); }} /> : claims.length === 0 ? <EmptyState icon={<Text style={{ color: Colors.primary, fontSize: 25 }}>✓</Text>} title="Tidak ada klaim menunggu" subtitle="Klaim baru akan tampil di sini setelah dikirim pengguna." /> : <View style={{ gap: Spacing.md }}>
          {claims.map((claim) => <Card key={claim.id}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
              <View style={{ flex: 1 }}><Text style={{ ...Typography.h4, color: Colors.textPrimary }}>{claim.item?.title ?? 'Barang'}</Text><Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: 3 }}>Diajukan {formatDateTime(claim.created_at)}</Text></View>
              <View style={{ backgroundColor: Colors.warningLight, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 }}><Text style={{ ...Typography.caption, color: Colors.warning, fontWeight: '700' }}>Menunggu</Text></View>
            </View>
            <View style={{ height: Spacing.md }} />
            <Text style={{ ...Typography.caption, color: Colors.textTertiary, fontWeight: '700' }}>BUKTI KEPEMILIKAN</Text>
            <Text style={{ ...Typography.body2, color: Colors.textPrimary, marginTop: Spacing.xs }}>{claim.proof_description || 'Belum ada keterangan.'}</Text>
            <Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.md }}>Lokasi jadwal simulasi: {PICKUP_LOCATIONS[0].name}</Text>
            <Button title="Setujui & buat jadwal" onPress={() => void approve(claim)} loading={busyId === claim.id} fullWidth style={{ marginTop: Spacing.md }} />
          </Card>)}
        </View>}
      </View>
    </ScrollView>
  );
}
