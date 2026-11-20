import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { claimApi } from '../../src/lib/supabase';
import { Button, Card, Divider } from '../../src/components/UI';
import { ErrorNotice, LoadingState, PageIntro } from '../../src/components/AppBlocks';
import { formatDate, formatTime, PICKUP_LOCATIONS } from '../../src/constants';
import { BorderRadius, Colors, Spacing, Typography } from '../../src/constants/theme';
import type { Claim } from '../../src/types';

export default function PickupScreen() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const loadClaim = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setClaim(await claimApi.getById(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data pengambilan belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => { void loadClaim(); }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, loadClaim]);

  const confirmPickup = async () => {
    if (!claim || claim.claimant_id !== user?.id || claim.status !== 'approved') {
      Alert.alert('Tidak dapat dikonfirmasi', 'Klaim ini bukan milik Anda atau belum disetujui.');
      return;
    }
    if (!checked) {
      Alert.alert('Konfirmasi diperlukan', 'Centang pernyataan setelah petugas menyerahkan barang.');
      return;
    }
    setConfirming(true);
    try {
      const updated = await claimApi.confirmPickup(claim.id);
      if (!updated) throw new Error('Status pengambilan belum dapat diperbarui.');
      setConfirmed(true);
      setClaim(updated);
      Alert.alert('Selesai', 'Pengambilan berhasil dikonfirmasi. Terima kasih telah menggunakan layanan ini.');
    } catch (confirmError) {
      Alert.alert('Belum tersimpan', confirmError instanceof Error ? confirmError.message : 'Coba lagi sebentar.');
    } finally {
      setConfirming(false);
    }
  };

  if (authLoading || loading) return <View style={{ flex: 1, backgroundColor: Colors.background }}><LoadingState label="Memuat informasi pengambilan…" /></View>;
  if (error) return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadClaim(); }} /></View>;
  if (!claim) return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice title="Klaim tidak ditemukan" detail="Kembali ke aktivitas dan buka klaim yang benar." /></View>;
  if (claim.claimant_id !== user?.id) return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice title="Akses tidak tersedia" detail="Halaman pengambilan hanya dapat dibuka oleh pemilik klaim." /></View>;
  if (claim.status !== 'approved' && claim.status !== 'picked_up') return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice title="Belum siap diambil" detail="Pengambilan dapat dilakukan setelah petugas menyetujui klaim." /></View>;

  const location = PICKUP_LOCATIONS.find((entry) => entry.id === claim.pickup_location) ?? PICKUP_LOCATIONS[0];
  const item = claim.item;
  const done = claim.status === 'picked_up' || confirmed;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}><Text onPress={() => router.back()} style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', paddingVertical: Spacing.sm }}>‹  Kembali</Text></View>
      <PageIntro eyebrow="SERAH TERIMA" title={done ? 'Pengambilan selesai' : 'Barang siap diambil'} subtitle={item?.title ?? 'Tunjukkan kode ini kepada petugas.'} />

      <View style={{ paddingHorizontal: Spacing.md }}>
        <Card style={{ alignItems: 'center', backgroundColor: done ? Colors.successLight : Colors.primaryLight, borderColor: done ? '#BFE7D8' : '#D8E3FF', paddingVertical: Spacing.xl }}>
          <Text style={{ ...Typography.caption, color: done ? Colors.success : Colors.primary, fontWeight: '700', letterSpacing: 1 }}>KODE PENGAMBILAN</Text>
          <Text style={{ ...Typography.h1, color: done ? Colors.success : Colors.primary, marginTop: Spacing.sm, letterSpacing: 2 }}>{claim.pickup_code ?? '—'}</Text>
          <Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm }}>{claim.approved_at ? `Disetujui ${formatDate(claim.approved_at)}` : 'Tunjukkan kode kepada petugas'}</Text>
        </Card>
      </View>

      {item ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}><Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ width: 56, height: 56, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
          {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={{ width: 56, height: 56 }} resizeMode="cover" /> : <Text style={{ color: Colors.primary, fontSize: 22 }}>□</Text>}
        </View>
        <View style={{ flex: 1 }}><Text style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '700' }}>{item.title}</Text><Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: 2 }}>Klaim atas nama {user?.full_name || 'Pengunjung'}</Text></View>
      </Card></View> : null}

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card>
          <Text style={{ ...Typography.h4, color: Colors.textPrimary }}>Lokasi pengambilan</Text>
          <Text style={{ ...Typography.body1, color: Colors.primary, fontWeight: '700', marginTop: Spacing.md }}>{location.name}</Text>
          <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: 3 }}>{location.address}</Text>
          <Divider />
          <Text style={{ ...Typography.caption, color: Colors.textTertiary }}>WAKTU YANG DISETUJUI</Text>
          {claim.pickup_time_start && claim.pickup_time_end ? <Text style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '600', marginTop: 4 }}>{formatDate(claim.pickup_time_start)} · {formatTime(claim.pickup_time_start)}–{formatTime(claim.pickup_time_end)}</Text> : <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: 4 }}>Hubungi petugas untuk memastikan jadwal.</Text>}
          <Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.md }}>Bawa identitas diri dan tunjukkan bukti kepemilikan kepada petugas.</Text>
        </Card>
      </View>

      {!done ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card>
          <TouchableOpacity onPress={() => setChecked((value) => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }} accessibilityRole="checkbox" accessibilityState={{ checked }}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked ? <Text style={{ color: Colors.textInverse, fontWeight: '700' }}>✓</Text> : null}</View>
            <Text style={{ ...Typography.body2, color: Colors.textPrimary, flex: 1 }}>Barang telah saya terima dan cocok dengan laporan.</Text>
          </TouchableOpacity>
          <Button title="Konfirmasi barang diterima" onPress={confirmPickup} loading={confirming} disabled={!checked} fullWidth style={{ marginTop: Spacing.md }} />
        </Card>
      </View> : <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}><Card style={{ backgroundColor: Colors.successLight }}><Text style={{ ...Typography.body2, color: Colors.success, fontWeight: '700' }}>Serah terima telah dicatat pada aplikasi.</Text></Card></View>}
    </ScrollView>
  );
}

const styles = {
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: Colors.surface },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
};
