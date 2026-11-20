import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { DEMO_MODE, ITEM_CATEGORIES, ITEM_STATUS_LABELS, formatDate } from '../constants';
import type { ItemStatus, LostItem } from '../types';
import { Badge, Card } from './UI';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

const itemBadgeVariant: Record<ItemStatus, 'primary' | 'success' | 'warning' | 'error' | 'neutral'> = {
  lost: 'warning',
  found: 'success',
  claimed: 'primary',
  returned: 'neutral',
  archived: 'neutral',
};

export function PageIntro({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.xs }}>
      {eyebrow ? <Text style={{ ...Typography.caption, color: Colors.primary, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>{eyebrow}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Typography.h2, color: Colors.textPrimary }}>{title}</Text>
          {subtitle ? <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: 3 }}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function DemoNotice({ isDemoMode = DEMO_MODE }: { isDemoMode?: boolean }) {
  if (!isDemoMode) return null;
  return (
    <View style={{ marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: '#D8E3FF', padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.textInverse, fontSize: 12, fontWeight: '700' }}>i</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...Typography.body2, color: Colors.primaryDark, fontWeight: '700' }}>Mode demo lokal</Text>
        <Text style={{ ...Typography.caption, color: Colors.primaryDark }}>Data demo tersimpan di perangkat ini. Backend NeonDB belum dihubungkan, jadi data belum dibagikan antarperangkat.</Text>
      </View>
    </View>
  );
}

export function ItemCard({ item, onPress }: { item: LostItem; onPress: () => void }) {
  const category = ITEM_CATEGORIES.find((entry) => entry.value === item.category) ?? ITEM_CATEGORIES[ITEM_CATEGORIES.length - 1];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Detail ${item.title}`} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      <Card style={{ padding: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ width: 68, height: 68, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
            {item.images?.[0] ? (
              <Image source={{ uri: item.images[0] }} style={{ width: 68, height: 68 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 25, color: Colors.primary, fontWeight: '600' }}>{category.icon}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
              <Text numberOfLines={2} style={{ ...Typography.body1, color: Colors.textPrimary, fontWeight: '700', flex: 1 }}>{item.title}</Text>
              <Badge variant={itemBadgeVariant[item.status]} size="sm">{ITEM_STATUS_LABELS[item.status] ?? item.status}</Badge>
            </View>
            <Text numberOfLines={1} style={{ ...Typography.body2, color: Colors.textSecondary }}>{item.location_lost}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={{ ...Typography.caption, color: Colors.textTertiary }}>{formatDate(item.date_lost)}</Text>
              <Text style={{ color: Colors.border }}>·</Text>
              <Text style={{ ...Typography.caption, color: Colors.textTertiary }}>{category.label}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 22, color: Colors.textTertiary }}>›</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <View style={{ padding: Spacing.xl, alignItems: 'center', gap: Spacing.md }}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={{ ...Typography.body2, color: Colors.textSecondary }}>{label}</Text>
    </View>
  );
}

export function ErrorNotice({ title = 'Data belum dapat dimuat', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: Colors.error, backgroundColor: Colors.errorLight }}>
      <Text style={{ ...Typography.body1, color: Colors.error, fontWeight: '700' }}>{title}</Text>
      <Text style={{ ...Typography.body2, color: Colors.textSecondary, marginTop: Spacing.xs }}>{detail ?? 'Periksa koneksi atau konfigurasi backend, lalu coba lagi.'}</Text>
      {onRetry ? <Text onPress={onRetry} accessibilityRole="button" style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', marginTop: Spacing.md }}>Coba lagi</Text> : null}
    </Card>
  );
}
