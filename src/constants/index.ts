const environmentValue = (value: string | undefined) => (value ?? '').trim();
const isRealValue = (value: string) => Boolean(value) && !/your-project|your-anon-key|placeholder/i.test(value);

export const SUPABASE_URL = environmentValue(process.env.EXPO_PUBLIC_SUPABASE_URL) || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = environmentValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) || 'your-anon-key';
export const SUPABASE_CONFIGURED = isRealValue(SUPABASE_URL) && isRealValue(SUPABASE_ANON_KEY);
export const DEMO_MODE = !SUPABASE_CONFIGURED;

export const ITEM_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'electronics', label: 'Elektronik', icon: '▣' },
  { value: 'accessories', label: 'Aksesori', icon: '◉' },
  { value: 'documents', label: 'Dokumen', icon: '▤' },
  { value: 'clothing', label: 'Pakaian', icon: '◇' },
  { value: 'bags', label: 'Tas & dompet', icon: '▱' },
  { value: 'keys', label: 'Kunci', icon: '⌘' },
  { value: 'other', label: 'Lainnya', icon: '□' },
];

export const ITEM_STATUS_LABELS: Record<string, string> = {
  lost: 'Hilang',
  found: 'Ditemukan',
  claimed: 'Sedang diklaim',
  returned: 'Sudah kembali',
  archived: 'Arsip',
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu petugas',
  approved: 'Siap diambil',
  rejected: 'Tidak disetujui',
  cancelled: 'Dibatalkan',
  picked_up: 'Sudah diambil',
};

export const CLAIM_STATUS_COLORS: Record<string, string> = {
  pending: '#B7791F',
  approved: '#138A68',
  rejected: '#C44545',
  cancelled: '#667085',
  picked_up: '#2857D6',
};

export const PICKUP_LOCATIONS = [
  {
    id: 'pos-a',
    name: 'Pos Keamanan A',
    address: 'Lobi Gedung A, dekat resepsionis',
    hours_start: '08:00',
    hours_end: '20:00',
  },
  {
    id: 'pos-b',
    name: 'Pos Keamanan B',
    address: 'Lobi Gedung B, dekat pintu utama',
    hours_start: '08:00',
    hours_end: '17:00',
  },
  {
    id: 'pos-c',
    name: 'Pos Keamanan C',
    address: 'Parkir basement, dekat lift',
    hours_start: '07:00',
    hours_end: '22:00',
  },
];

export const generateClaimCode = (): string => `LF-${Math.floor(100000 + Math.random() * 900000)}`;
export const generatePickupCode = (): string => `PK-${Math.floor(100000 + Math.random() * 900000)}`;

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatDateTime = (dateString: string): string => `${formatDate(dateString)} · ${formatTime(dateString)}`;
