import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { itemApi } from '../../src/lib/supabase';
import { Button, Card, EmptyState, SectionHeader } from '../../src/components/UI';
import { DemoNotice, ErrorNotice, ItemCard, LoadingState, PageIntro } from '../../src/components/AppBlocks';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import type { LostItem } from '../../src/types';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      const data = await itemApi.getAll({ statuses: ['found', 'lost'] });
      setItems(data);
    } catch (loadError) {
      console.error('Gagal memuat beranda:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Tidak dapat memuat data barang.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => { void loadItems(); }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, loadItems]);

  const foundCount = items.filter((item) => item.status === 'found').length;
  const lostCount = items.filter((item) => item.status === 'lost').length;
  const recentItems = items.slice(0, 4);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadItems(); }} tintColor={Colors.primary} colors={[Colors.primary]} />}
    >
      <PageIntro
        eyebrow="LOST & FOUND"
        title={`Halo, ${(user?.full_name || 'Teman').split(' ')[0]}`}
        subtitle="Mari bantu barang menemukan pemiliknya."
      />
      <DemoNotice />

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <Card style={{ backgroundColor: Colors.primary, borderColor: Colors.primary, padding: Spacing.lg }}>
          <Text style={{ ...Typography.caption, color: '#DDE7FF', fontWeight: '700', letterSpacing: 1 }}>RUANG BANTU KOMUNITAS</Text>
          <Text style={{ ...Typography.h2, color: Colors.textInverse, marginTop: Spacing.xs }}>Barang hilang?{ '\n' }Kita bantu cari.</Text>
          <Text style={{ ...Typography.body2, color: '#E7EDFF', marginTop: Spacing.sm }}>Laporkan kehilangan atau barang yang Anda temukan di sekitar.</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            <Button title="Buat laporan" onPress={() => router.push('/item/new')} variant="secondary" size="sm" />
            <Button title="Jelajahi" onPress={() => router.push('/(tabs)/items')} variant="outline" size="sm" textColor="#FFFFFF" style={{ borderColor: '#DDE7FF' }} />
          </View>
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.md }}>
        <Card style={{ flex: 1, padding: Spacing.md }}>
          <Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Ditemukan</Text>
          <Text style={{ ...Typography.h2, color: Colors.success, marginTop: 2 }}>{foundCount}</Text>
          <Text style={{ ...Typography.caption, color: Colors.textTertiary }}>menunggu pemilik</Text>
        </Card>
        <Card style={{ flex: 1, padding: Spacing.md }}>
          <Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Dilaporkan hilang</Text>
          <Text style={{ ...Typography.h2, color: Colors.warning, marginTop: 2 }}>{lostCount}</Text>
          <Text style={{ ...Typography.caption, color: Colors.textTertiary }}>laporan aktif</Text>
        </Card>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.xl }}>
        <SectionHeader title="Laporan terbaru" action={{ label: 'Lihat semua', onPress: () => router.push('/(tabs)/items') }} />
        {loading ? <LoadingState label="Memuat laporan terbaru…" /> : error ? <ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadItems(); }} /> : recentItems.length === 0 ? (
          <EmptyState icon={<Text style={{ fontSize: 28, color: Colors.primary }}>□</Text>} title="Belum ada laporan" subtitle="Jadilah yang pertama membantu komunitas." action={{ label: 'Buat laporan', onPress: () => router.push('/item/new') }} />
        ) : (
          <View style={{ gap: Spacing.md }}>{recentItems.map((item) => <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />)}</View>
        )}
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.xl }}>
        <Card style={{ backgroundColor: Colors.surfaceVariant, borderColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ width: 42, height: 42, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, color: Colors.primary }}>i</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...Typography.body2, color: Colors.textPrimary, fontWeight: '700' }}>Tips keamanan</Text>
            <Text style={{ ...Typography.caption, color: Colors.textSecondary, marginTop: 2 }}>Cocokkan ciri barang dan lakukan serah terima di lokasi umum.</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
