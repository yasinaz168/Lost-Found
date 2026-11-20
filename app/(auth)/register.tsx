import { Redirect } from 'expo-router';

// Akun pengunjung dibuat otomatis sebagai sesi anonim; registrasi publik tidak diperlukan.
export default function RegisterRedirect() {
  return <Redirect href="/(tabs)" />;
}
