import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { claimApi, itemApi } from '../../src/lib/supabase';
import { Badge, Button, Card, Divider } from '../../src/components/UI';
import { ErrorNotice, LoadingState, PageIntro } from '../../src/components/AppBlocks';
import { CLAIM_STATUS_LABELS, ITEM_CATEGORIES, ITEM_STATUS_LABELS, formatDate, formatTime } from '../../src/constants';
import { BorderRadius, Colors, Spacing, Typography } from '../../src/constants/theme';
import type { Claim, ItemStatus, LostItem } from '../../src/types';

const statusVariant: Record<ItemStatus, 'primary' | 'success' | 'warning' | 'error' | 'neutral'> = {
  lost: 'warning', found: 'success', claimed: 'primary', returned: 'neutral', archived: 'neutral',
};

export default function ItemDetailScreen() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<LostItem | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [proof, setProof] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await itemApi.getById(id);
      setItem(data);
      setClaim(data?.claim ?? null);
    } catch (loadError) {
      console.error('Gagal memuat detail barang:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Detail barang belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => { void loadItem(); }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, loadItem]);

  const submitClaim = async () => {
    if (!user || !item) return;
    if (proof.trim().length < 8) {
      Alert.alert('Bukti belum cukup', 'Jelaskan ciri khusus barang yang hanya diketahui pemiliknya.');
      return;
    }
    setClaiming(true);
    try {
      const created = await claimApi.create({
        item_id: item.id,
        claimant_id: user.id,
        status: 'pending',
        proof_description: proof.trim(),
        proof_images: [],
        admin_notes: null,
        pickup_location: null,
        pickup_time_start: null,
        pickup_time_end: null,
        pickup_code: null,
        approved_at: null,
        picked_up_at: null,
      });
      if (!created) throw new Error('Klaim belum tersimpan.');
      setClaim(created);
      Alert.alert('Klaim terkirim', 'Petugas akan memeriksa bukti yang Anda berikan.');
    } catch (claimError) {
      console.error('Gagal mengajukan klaim:', claimError);
      Alert.alert('Klaim belum terkirim', claimError instanceof Error ? claimError.message : 'Coba lagi sebentar.');
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading || loading) return <View style={{ flex: 1, backgroundColor: Colors.background }}><LoadingState label="Memuat detail barang…" /></View>;
  if (error) return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadItem(); }} /><Text onPress={() => router.back()} style={{ ...Typography.body2, color: Colors.primary, textAlign: 'center', marginTop: Spacing.md }}>Kembali</Text></View>;
  if (!item) return <View style={{ flex: 1, backgroundColor: Colors.background, padding: Spacing.md, justifyContent: 'center' }}><ErrorNotice title="Barang tidak ditemukan" detail="Laporan mungkin sudah dihapus atau tidak tersedia." /><Button title="Kembali" onPress={() => router.back()} style={{ marginTop: Spacing.md }} /></View>;

  const category = ITEM_CATEGORIES.find((entry) => entry.value === item.category) ?? ITEM_CATEGORIES[ITEM_CATEGORIES.length - 1];
  const isReporter = item.reporter_id === user?.id;
  const isClaimant = claim?.claimant_id === user?.id;
  const canClaim = !claim && !isReporter && item.status === 'found';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}><Text onPress={() => router.back()} style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', paddingVertical: Spacing.sm }}>‹  Kembali</Text></View>
      <PageIntro eyebrow="DETAIL LAPORAN" title={item.title} subtitle={`${category.label} · ${formatDate(item.date_lost)}`} />

      <View style={{ paddingHorizontal: Spacing.md }}>
        <Card>
          {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={{ height: 220, width: '100%', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant }} resizeMode="cover" /> : (
            <View style={{ height: 150, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 42, color: Colors.primary }}>{category.icon}</Text></View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md }}><Badge variant={statusVariant[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge><Text style={{ ...Typography.caption, color: Colors.textSecondary }}>{item.status === 'lost' ? 'Mencari pemilik' : 'Dilaporkan oleh komunitas'}</Text></View>
          <Divider />
          <Text style={{ ...Typography.h4, color: Colors.textPrimary }}>Ciri-ciri</Text>
          <Text style={{ ...Typography.body1, color: Colors.textSecondary, marginTop: Spacing.xs }}>{item.description || 'Belum ada deskripsi tambahan.'}</Text>
          <View style={{ height: Spacing.lg }} />
          <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
            <View style={{ flex: 1 }}><Text style={styles.metaLabel}>{item.status === 'lost' ? 'Lokasi terakhir' : 'Lokasi ditemukan'}</Text><Text style={styles.metaValue}>{item.location_lost}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.metaLabel}>{item.status === 'lost' ? 'Tanggal hilang' : 'Tanggal ditemukan'}</Text><Text style={styles.metaValue}>{formatDate(item.date_lost)}</Text></View>
          </View>
          {item.contact_info ? <><View style={{ height: Spacing.lg }} /><Text style={styles.metaLabel}>Kontak pelapor</Text><Text style={styles.metaValue}>{item.contact_info}</Text></> : null}
          {item.reward && item.reward > 0 ? <View style={{ marginTop: Spacing.md, backgroundColor: Colors.warningLight, padding: Spacing.md, borderRadius: BorderRadius.md }}><Text style={{ ...Typography.body2, color: Colors.warning, fontWeight: '700' }}>Imbalan yang ditawarkan: Rp {item.reward.toLocaleString('id-ID')}</Text></View> : null}
        </Card>
      </View>

      {claim ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card style={{ backgroundColor: claim.status === 'approved' ? Colors.successLight : Colors.surface }}>
          <Text style={{ ...Typography.caption, color: Colors.textSecondary }}>STATUS KLAIM</Text>
          <Text style={{ ...Typography.h4, color: Colors.textPrimary, marginTop: Spacing.xs }}>{CLAIM_STATUS_LABELS[claim.status] ?? claim.status}</Text>
          {isClaimant && claim.proof_description ? <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.sm }}>Bukti yang dikirim: {claim.proof_description}</Text> : null}
          {claim.status === 'pending' ? <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.sm }}>Petugas akan memeriksa kecocokan bukti sebelum menentukan jadwal pengambilan.</Text> : null}
          {claim.status === 'approved' ? <>
            {claim.pickup_code ? <View style={{ marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, alignItems: 'center' }}><Text style={styles.metaLabel}>KODE PENGAMBILAN</Text><Text style={{ ...Typography.h3, color: Colors.primary, fontWeight: '700', marginTop: Spacing.xs }}>{claim.pickup_code}</Text></View> : null}
            {claim.pickup_location ? <Text style={{ ...Typography.body2, color: Colors.textPrimary, marginTop: Spacing.md }}>Lokasi: {claim.pickup_location}</Text> : null}
            {claim.pickup_time_start && claim.pickup_time_end ? <Text style={{ ...Typography.body2, color: Colors.textPrimary, marginTop: Spacing.xs }}>Waktu: {formatTime(claim.pickup_time_start)}–{formatTime(claim.pickup_time_end)}</Text> : null}
            {isClaimant ? <Button title="Lihat instruksi pengambilan" onPress={() => router.push(`/pickup/${claim.id}`)} fullWidth style={{ marginTop: Spacing.md }} /> : null}
          </> : null}
          {claim.status === 'rejected' && claim.admin_notes ? <Text style={{ ...Typography.body2, color: Colors.error, marginTop: Spacing.sm }}>Catatan petugas: {claim.admin_notes}</Text> : null}
        </Card>
      </View> : null}

      {canClaim ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card>
          <Text style={{ ...Typography.h4, color: Colors.textPrimary }}>Kenali barang ini?</Text>
          <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.xs }}>Jelaskan ciri khusus yang dapat membantu petugas memverifikasi kepemilikan.</Text>
          <View style={{ height: Spacing.md }} />
          <Text style={styles.metaLabel}>Bukti kepemilikan *</Text>
          <Text style={{ ...Typography.caption, color: Colors.textTertiary, marginBottom: Spacing.xs }}>Hindari menuliskan semua ciri barang yang sudah terlihat di atas.</Text>
          <TextInput value={proof} onChangeText={setProof} multiline numberOfLines={4} placeholder="Contoh: Ada stiker kecil di bagian bawah dan isi di dalamnya…" placeholderTextColor={Colors.textTertiary} style={styles.proofInput} />
          <Button title="Ajukan klaim" onPress={submitClaim} fullWidth loading={claiming} style={{ marginTop: Spacing.md }} />
        </Card>
      </View> : null}

      {isReporter ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}><Card style={{ backgroundColor: Colors.surfaceVariant }}><Text style={{ ...Typography.body2, color: Colors.textSecondary }}>Ini adalah laporan Anda. Anda dapat menghubungi pihak yang merespons melalui kontak yang dibagikan.</Text></Card></View> : null}
      {item.status === 'lost' && !isReporter ? <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}><Card style={{ backgroundColor: Colors.primaryLight, borderColor: '#D8E3FF' }}><Text style={{ ...Typography.body2, color: Colors.primaryDark, fontWeight: '700' }}>Menemukan barang ini?</Text><Text style={{ ...Typography.body2, color: Colors.primaryDark, marginTop: Spacing.xs }}>Hubungi pelapor melalui kontak di atas. Klaim pengambilan tersedia untuk barang berstatus ditemukan.</Text></Card></View> : null}
    </ScrollView>
  );
}

const styles = {
  metaLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  metaValue: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '600' as const, marginTop: 4 },
  proofInput: { minHeight: 106, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, textAlignVertical: 'top' as const, color: Colors.textPrimary, backgroundColor: Colors.surface, ...Typography.body2 },
};
