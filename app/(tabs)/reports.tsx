import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { itemApi, claimApi } from '../../src/lib/supabase';
import { Badge, Button, EmptyState, SectionHeader } from '../../src/components/UI';
import { DemoNotice, ErrorNotice, ItemCard, LoadingState, PageIntro } from '../../src/components/AppBlocks';
import { CLAIM_STATUS_LABELS } from '../../src/constants';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import type { Claim, LostItem } from '../../src/types';

export default function ReportsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [reportedItems, setReportedItems] = useState<LostItem[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reported' | 'claimed'>('reported');

  const loadData = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [items, claims] = await Promise.all([itemApi.getByReporter(user.id), claimApi.getByClaimant(user.id)]);
      setReportedItems(items);
      setMyClaims(claims);
    } catch (loadError) {
      console.error('Gagal memuat aktivitas:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Aktivitas belum dapat dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const timer = setTimeout(() => { void loadData(); }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, loadData]);

  const currentItems = useMemo(() => activeTab === 'reported' ? reportedItems : myClaims.map((claim) => claim.item).filter((item): item is LostItem => Boolean(item)), [activeTab, reportedItems, myClaims]);
  const claimStatusVariant = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' => {
    if (status === 'pending') return 'warning';
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'error';
    if (status === 'picked_up') return 'primary';
    return 'neutral';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData(); }} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      <PageIntro eyebrow="RUANG PRIBADI" title="Aktivitas saya" subtitle="Pantau laporan dan proses pengambilan barang." action={<Button title="+ Lapor" onPress={() => router.push('/item/new')} size="sm" />} />
      <DemoNotice />

      <View style={{ marginHorizontal: Spacing.md, marginTop: Spacing.md, flexDirection: 'row', padding: 4, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant }}>
        {([
          { key: 'reported', label: 'Laporan', count: reportedItems.length },
          { key: 'claimed', label: 'Klaim', count: myClaims.length },
        ] as const).map((tab) => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label} <Text style={{ fontWeight: '700' }}>{tab.count}</Text></Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.lg }}>
        <SectionHeader title={activeTab === 'reported' ? 'Laporan saya' : 'Klaim saya'} />
        {authLoading || loading ? <LoadingState label="Memuat aktivitas…" /> : error ? <ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadData(); }} /> : currentItems.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 26, color: Colors.primary }}>{activeTab === 'reported' ? '≡' : '⌑'}</Text>}
            title={activeTab === 'reported' ? 'Belum ada laporan' : 'Belum ada klaim'}
            subtitle={activeTab === 'reported' ? 'Laporan barang hilang maupun temuan akan muncul di sini.' : 'Ajukan klaim pada barang yang Anda kenali.'}
            action={activeTab === 'reported' ? { label: 'Buat laporan', onPress: () => router.push('/item/new') } : { label: 'Jelajahi barang', onPress: () => router.push('/(tabs)/items') }}
          />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {activeTab === 'reported' ? reportedItems.map((item) => (
              <View key={item.id} style={{ gap: Spacing.xs }}>
                <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
                {item.claim ? <View style={{ marginLeft: Spacing.md, alignSelf: 'flex-start' }}><Badge variant={claimStatusVariant(item.claim.status)} size="sm">{CLAIM_STATUS_LABELS[item.claim.status] ?? item.claim.status}</Badge></View> : null}
              </View>
            )) : myClaims.map((claim) => {
              const item = claim.item;
              if (!item) return null;
              return (
                <View key={claim.id} style={{ gap: Spacing.xs }}>
                  <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
                  <View style={{ marginLeft: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Badge variant={claimStatusVariant(claim.status)} size="sm">{CLAIM_STATUS_LABELS[claim.status] ?? claim.status}</Badge>
                    {claim.pickup_code ? <Text style={{ ...Typography.caption, color: Colors.primary, fontWeight: '700' }}>{claim.pickup_code}</Text> : null}
                    {claim.status === 'approved' ? <Text onPress={() => router.push(`/pickup/${claim.id}`)} style={{ ...Typography.caption, color: Colors.primary, fontWeight: '700' }}>Detail pengambilan ›</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = {
  tab: { flex: 1, minHeight: 42, borderRadius: BorderRadius.sm, alignItems: 'center' as const, justifyContent: 'center' as const },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { ...Typography.body2, color: Colors.textSecondary, fontWeight: '600' as const },
  tabTextActive: { color: Colors.textPrimary },
};
