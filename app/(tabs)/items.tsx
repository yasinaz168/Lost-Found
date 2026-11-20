import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { itemApi } from '../../src/lib/supabase';
import { Button, EmptyState, SectionHeader } from '../../src/components/UI';
import { DemoNotice, ErrorNotice, ItemCard, LoadingState, PageIntro } from '../../src/components/AppBlocks';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { ITEM_CATEGORIES } from '../../src/constants';
import type { LostItem } from '../../src/types';

type StatusFilter = 'all' | 'lost' | 'found';

export default function ItemsScreen() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      setItems(await itemApi.getAll({ statuses: ['lost', 'found'] }));
    } catch (loadError) {
      console.error('Gagal memuat daftar barang:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Tidak dapat memuat daftar barang.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadItems(); }, 0);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return items.filter((item) =>
      (statusFilter === 'all' || item.status === statusFilter) &&
      (selectedCategory === 'all' || item.category === selectedCategory) &&
      (!query || `${item.title} ${item.description} ${item.location_lost}`.toLocaleLowerCase('id-ID').includes(query))
    );
  }, [items, search, selectedCategory, statusFilter]);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'lost', label: 'Hilang' },
    { value: 'found', label: 'Ditemukan' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadItems(); }} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      <PageIntro eyebrow="PAPAN KOMUNITAS" title="Jelajahi barang" subtitle="Cari barang hilang atau bantu pemiliknya kembali." action={<Button title="+ Lapor" onPress={() => router.push('/item/new')} size="sm" />} />
      <DemoNotice />

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <View style={styles.searchBox}>
          <Text style={{ color: Colors.textTertiary, fontSize: 20, marginRight: Spacing.sm }}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama, detail, atau lokasi"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Cari barang"
          />
          {search ? <Text onPress={() => setSearch('')} style={{ color: Colors.primary, fontWeight: '700', padding: Spacing.xs }}>Hapus</Text> : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {statusOptions.map((option) => (
            <TouchableOpacity key={option.value} onPress={() => setStatusFilter(option.value)} style={[styles.chip, statusFilter === option.value && styles.chipActive]}>
              <Text style={[styles.chipText, statusFilter === option.value && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginTop: Spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}>
          <TouchableOpacity onPress={() => setSelectedCategory('all')} style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}>
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextActive]}>Semua kategori</Text>
          </TouchableOpacity>
          {ITEM_CATEGORIES.map((category) => (
            <TouchableOpacity key={category.value} onPress={() => setSelectedCategory(category.value)} style={[styles.categoryChip, selectedCategory === category.value && styles.categoryChipActive]}>
              <Text style={[styles.chipText, selectedCategory === category.value && styles.chipTextActive]}>{category.icon}  {category.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.lg }}>
        <SectionHeader title="Hasil pencarian" action={{ label: `${filteredItems.length} barang`, onPress: () => {} }} />
        {loading ? <LoadingState label="Memuat barang…" /> : error ? <ErrorNotice detail={error} onRetry={() => { setLoading(true); void loadItems(); }} /> : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Text style={{ color: Colors.primary, fontSize: 28 }}>□</Text>}
            title={search || selectedCategory !== 'all' || statusFilter !== 'all' ? 'Tidak ada hasil yang cocok' : 'Belum ada laporan'}
            subtitle={search || selectedCategory !== 'all' || statusFilter !== 'all' ? 'Coba ubah kata kunci atau filter.' : 'Buat laporan pertama agar komunitas bisa membantu.'}
            action={!search && selectedCategory === 'all' && statusFilter === 'all' ? { label: 'Buat laporan', onPress: () => router.push('/item/new') } : undefined}
          />
        ) : (
          <View style={{ gap: Spacing.md }}>{filteredItems.map((item) => <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />)}</View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = {
  searchBox: {
    height: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, ...Typography.body2 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },
  chipTextActive: { color: Colors.textInverse },
};
