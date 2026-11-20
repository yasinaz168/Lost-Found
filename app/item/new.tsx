import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { itemApi, storageApi } from '../../src/lib/supabase';
import { Button, Card, Input } from '../../src/components/UI';
import { DemoNotice, PageIntro } from '../../src/components/AppBlocks';
import { DEMO_MODE, ITEM_CATEGORIES } from '../../src/constants';
import { BorderRadius, Colors, Spacing, Typography } from '../../src/constants/theme';
import type { ItemStatus } from '../../src/types';

const todayLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export default function NewItemScreen() {
  const { user, loading: authLoading } = useAuth();
  const [reportType, setReportType] = useState<ItemStatus>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electronics');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [contact, setContact] = useState('');
  const [reward, setReward] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addImage = async (source: 'library' | 'camera') => {
    if (images.length >= 3) {
      Alert.alert('Batas foto', 'Tambahkan maksimal 3 foto agar laporan tetap ringan.');
      return;
    }
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Izin kamera diperlukan', 'Izinkan akses kamera untuk mengambil foto barang.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.65, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.65, base64: true });
      const asset = result.assets?.[0];
      if (!result.canceled && asset) {
        const uri = DEMO_MODE && asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setImages((current) => [...current, uri].slice(0, 3));
      }
    } catch (error) {
      console.error('Gagal memilih foto:', error);
      Alert.alert('Foto belum dapat dibuka', 'Silakan coba pilih foto lain.');
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = 'Judul minimal 3 karakter.';
    if (description.trim().length < 8) next.description = 'Tambahkan sedikit detail agar barang mudah dikenali.';
    if (!location.trim()) next.location = 'Lokasi wajib diisi.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) next.date = 'Gunakan format tanggal YYYY-MM-DD.';
    if (date > todayLocal()) next.date = 'Tanggal tidak boleh melewati hari ini.';
    if (contact.trim().length < 5) next.contact = 'Masukkan kontak yang dapat dihubungi.';
    if (reward && (!/^\d+$/.test(reward) || Number(reward) < 0)) next.reward = 'Masukkan nominal hadiah dalam angka.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (authLoading || !user || !validate()) return;
    setSubmitting(true);
    let photoWarning = false;
    try {
      const created = await itemApi.create({
        reporter_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: category as 'electronics' | 'accessories' | 'documents' | 'clothing' | 'bags' | 'keys' | 'other',
        status: reportType,
        location_lost: location.trim(),
        date_lost: date,
        images: DEMO_MODE ? images : [],
        contact_info: contact.trim(),
        reward: reward ? Number(reward) : null,
        claim_code: null,
      });
      if (!created) throw new Error('Laporan belum berhasil disimpan.');

      if (!DEMO_MODE && images.length) {
        const uploaded: string[] = [];
        for (let index = 0; index < images.length; index += 1) {
          try {
            const response = await fetch(images[index]);
            const url = await storageApi.uploadItemImage(created.id, await response.blob(), index);
            if (url) uploaded.push(url);
          } catch (error) {
            console.warn('Foto gagal diunggah; laporan utama tetap tersimpan.', error);
            photoWarning = true;
          }
        }
        await itemApi.update(created.id, { images: uploaded });
      }

      Alert.alert(
        reportType === 'lost' ? 'Laporan kehilangan tersimpan' : 'Laporan penemuan tersimpan',
        photoWarning ? 'Laporan berhasil dibuat, tetapi sebagian foto belum dapat diunggah.' : 'Anda dapat melihat dan memperbarui statusnya di Aktivitas saya.',
      );
      router.replace('/(tabs)/reports');
    } catch (error) {
      console.error('Gagal membuat laporan:', error);
      Alert.alert('Laporan belum terkirim', error instanceof Error ? error.message : 'Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}><Text style={{ color: Colors.textSecondary }}>Menyiapkan sesi tamu…</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
          <Text onPress={() => router.back()} style={{ ...Typography.body2, color: Colors.primary, fontWeight: '700', paddingVertical: Spacing.sm }}>‹  Kembali</Text>
        </View>
        <PageIntro eyebrow="LAPORAN BARU" title={reportType === 'lost' ? 'Barang hilang' : 'Barang ditemukan'} subtitle="Isi informasi utama. Anda dapat menambahkan foto bila perlu." />
        <DemoNotice />

        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
          <Card>
            <Text style={styles.label}>Jenis laporan</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {([{ value: 'lost', label: 'Saya kehilangan' }, { value: 'found', label: 'Saya menemukan' }] as const).map((choice) => (
                <TouchableOpacity key={choice.value} onPress={() => setReportType(choice.value)} style={[styles.typeOption, reportType === choice.value && styles.typeOptionActive]}>
                  <Text style={[styles.typeText, reportType === choice.value && styles.typeTextActive]}>{choice.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: Spacing.md }} />
            <Input label="Nama barang *" placeholder="Contoh: Kartu mahasiswa biru" value={title} onChangeText={setTitle} error={errors.title} />
            <View style={{ height: Spacing.md }} />
            <Input label="Ciri-ciri barang *" placeholder="Warna, merek, tanda khusus, atau isi di dalamnya" value={description} onChangeText={setDescription} error={errors.description} multiline numberOfLines={4} />
            <View style={{ height: Spacing.md }} />
            <Text style={styles.label}>Kategori</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {ITEM_CATEGORIES.map((entry) => (
                <TouchableOpacity key={entry.value} onPress={() => setCategory(entry.value)} style={[styles.categoryChip, category === entry.value && styles.categoryChipActive]}>
                  <Text style={[styles.categoryText, category === entry.value && styles.categoryTextActive]}>{entry.icon}  {entry.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: Spacing.md }} />
            <Input label={reportType === 'lost' ? 'Lokasi terakhir terlihat *' : 'Lokasi ditemukan *'} placeholder="Contoh: Lobi Gedung A, dekat lift" value={location} onChangeText={setLocation} error={errors.location} />
            <View style={{ height: Spacing.md }} />
            <Text style={styles.label}>{reportType === 'lost' ? 'Tanggal kehilangan *' : 'Tanggal ditemukan *'}</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} keyboardType="numbers-and-punctuation" maxLength={10} style={[styles.dateInput, errors.date ? styles.inputError : null]} />
            {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : <Text style={styles.hint}>Format tahun-bulan-tanggal, misalnya 2026-11-18.</Text>}
          </Card>
        </View>

        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
          <Card>
            <Text style={styles.label}>Foto (opsional)</Text>
            <Text style={styles.hint}>Tambahkan maksimal 3 foto yang membantu mengenali barang.</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              <Button title="Pilih foto" onPress={() => void addImage('library')} variant="outline" size="sm" />
              <Button title="Ambil foto" onPress={() => void addImage('camera')} variant="outline" size="sm" />
            </View>
            {images.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md }}>
              {images.map((uri, index) => <View key={`${uri.slice(0, 24)}-${index}`} style={{ width: 74, height: 74, borderRadius: BorderRadius.md, overflow: 'hidden' }}>
                <Image source={{ uri }} style={{ width: 74, height: 74 }} resizeMode="cover" />
                <Text onPress={() => setImages((current) => current.filter((_, photoIndex) => photoIndex !== index))} style={styles.removeImage}>×</Text>
              </View>)}
            </View> : null}
          </Card>
        </View>

        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
          <Card>
            <Text style={styles.label}>Cara menghubungi Anda</Text>
            <Text style={styles.hint}>Kontak ini akan tampil pada detail laporan agar pemilik atau penemu dapat menghubungi.</Text>
            <View style={{ height: Spacing.md }} />
            <Input label="Nomor telepon / WhatsApp / email *" placeholder="08xx xxxx xxxx" value={contact} onChangeText={setContact} error={errors.contact} keyboardType="default" />
            <View style={{ height: Spacing.md }} />
            <Input label="Imbalan (opsional)" placeholder="Nominal dalam rupiah" value={reward} onChangeText={setReward} error={errors.reward} keyboardType="numeric" />
          </Card>
        </View>

        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.lg }}>
          <Button title={reportType === 'lost' ? 'Kirim laporan kehilangan' : 'Kirim laporan penemuan'} onPress={submit} fullWidth size="lg" loading={submitting} />
          <Text style={{ ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm }}>Pastikan informasi kontak dan lokasi sudah benar.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  label: { ...Typography.body2, color: Colors.textPrimary, fontWeight: '700' as const, marginBottom: Spacing.sm },
  hint: { ...Typography.caption, color: Colors.textSecondary },
  typeOption: { flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center' as const, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant, borderWidth: 1, borderColor: Colors.border },
  typeOptionActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  typeText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },
  typeTextActive: { color: Colors.primary },
  categoryChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceVariant, borderWidth: 1, borderColor: Colors.border },
  categoryChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  categoryText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' as const },
  categoryTextActive: { color: Colors.primary },
  dateInput: { ...Typography.body1, color: Colors.textPrimary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.md },
  inputError: { borderColor: Colors.error },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.xs },
  removeImage: { position: 'absolute' as const, right: 4, top: 4, width: 22, height: 22, overflow: 'hidden' as const, textAlign: 'center' as const, color: Colors.textInverse, backgroundColor: 'rgba(24,34,48,0.72)', borderRadius: 11, fontSize: 18, lineHeight: 20 },
};
