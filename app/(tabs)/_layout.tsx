import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { Colors, Spacing } from '../../src/constants/theme';

function TabGlyph({ children, focused }: { children: string; focused: boolean }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? Colors.primaryLight : 'transparent' }}>
      <Text style={{ color: focused ? Colors.primary : Colors.textTertiary, fontSize: 20, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: Spacing.sm,
          paddingTop: Spacing.xs,
          height: 68,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: ({ focused }) => <TabGlyph focused={focused}>⌂</TabGlyph> }} />
      <Tabs.Screen name="items" options={{ title: 'Jelajahi', tabBarIcon: ({ focused }) => <TabGlyph focused={focused}>⌕</TabGlyph> }} />
      <Tabs.Screen name="reports" options={{ title: 'Aktivitas', tabBarIcon: ({ focused }) => <TabGlyph focused={focused}>≡</TabGlyph> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabGlyph focused={focused}>○</TabGlyph> }} />
    </Tabs>
  );
}
