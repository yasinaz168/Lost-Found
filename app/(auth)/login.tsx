import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Button, Card, Input } from '../../src/components/UI';
import { PageIntro } from '../../src/components/AppBlocks';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

export default function StaffLoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Lengkapi data', 'Masukkan email dan kata sandi akun petugas.');
      return;
    }
    setBusy(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) throw result.error;
      router.replace('/staff' as never);
    } catch (error) {
      Alert.alert('Belum dapat masuk', error instanceof Error ? error.message : 'Periksa data akun dan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: Spacing.xl }}>
        <PageIntro eyebrow="AKSES TERBATAS" title="Masuk petugas" subtitle="Pengunjung dapat memakai aplikasi tanpa akun. Halaman ini hanya untuk petugas yang mengelola klaim." />
        <View style={{ paddingHorizontal: Spacing.md }}><Card>
          <Input label="Email petugas" placeholder="nama@organisasi.id" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <View style={{ height: Spacing.md }} />
          <Input label="Kata sandi" placeholder="Masukkan kata sandi" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title="Masuk ke panel petugas" onPress={submit} loading={busy} fullWidth style={{ marginTop: Spacing.lg }} />
        </Card></View>
        <Text onPress={() => router.replace('/(tabs)')} style={{ ...Typography.body2, color: Colors.primary, textAlign: 'center', fontWeight: '700', padding: Spacing.lg }}>Kembali sebagai pengunjung</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
