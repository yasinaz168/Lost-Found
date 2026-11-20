# Lost & Found

Aplikasi sederhana untuk melaporkan barang hilang atau ditemukan, mengajukan klaim dengan bukti, dan mengatur serah terima melalui petugas.

## Jalankan tanpa akun

Aplikasi langsung membuka Beranda sebagai pengunjung. Tidak ada formulir daftar atau login untuk pengguna umum. Jika nilai Supabase belum diisi, aplikasi memakai **mode demo lokal**: laporan, klaim, dan profil tamu tersimpan di perangkat/browser yang sedang digunakan. Dua contoh laporan akan muncul pada pemakaian pertama. Persetujuan melalui Panel Petugas pada mode ini hanya simulasi lokal dan tidak dibagikan ke perangkat lain.

```bash
cd LostFoundApp
npm install
npm run web
```

Untuk perangkat Android, jalankan `npm run android` ketika emulator atau perangkat Expo Go sudah siap. Aplikasi memakai Expo SDK 58, React Native 0.88, dan React 19.3.

## Supabase untuk data bersama

Salin `.env.example` menjadi `.env`, lalu isi URL project Supabase dan anon/publishable key. Jangan menaruh `service_role` key atau URL/kredensial koneksi PostgreSQL langsung ke `EXPO_PUBLIC_*`; variabel `EXPO_PUBLIC_*` masuk ke bundle klien. Hapus `EXPO_PUBLIC_DATABASE_URL` lama dari `.env`. Jika nilainya pernah memuat kredensial database yang valid, rotasi kredensial tersebut karena konfigurasi klien tidak dapat dianggap rahasia.

Untuk project baru, jalankan `supabase_schema.sql` pada Supabase SQL Editor. Untuk project yang sudah memiliki skema, jalankan `supabase_guest_setup.sql`. Aktifkan **Anonymous Sign-Ins** di Supabase Authentication. Aplikasi akan membuat sesi anonim di belakang layar; pengguna tidak diminta email atau kata sandi. Sesi anonim hanya bertahan pada perangkat yang menyimpannya. Hubungkan identitas login kemudian jika perlu memindahkan kepemilikan data ke perangkat lain.

Akses data menggunakan Supabase Data API dan kebijakan Row Level Security. Status peran `admin`/`staff` perlu diberikan oleh pengelola project; pengguna umum tidak dapat membuat akun petugas melalui aplikasi. Panel Petugas hanya ditampilkan untuk akun berperan atau sebagai simulasi lokal.

Jika Supabase sudah diatur tetapi API, skema, kebijakan, atau anonymous sign-in belum siap, aplikasi menampilkan error backend dan tidak diam-diam menyimpan sebagian data di lokal.

## Perintah pemeriksaan

```bash
npx expo install --check
npx tsc --noEmit
npm run build
```

Build web disimpan ke folder `dist/`.
