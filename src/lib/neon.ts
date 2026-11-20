/**
 * Direct PostgreSQL access from the mobile/web client is intentionally disabled.
 * Use the Supabase Data API in ./supabase so Row Level Security is applied and
 * database credentials never need to be included in an Expo client bundle.
 */
export type NeonRow = Record<string, unknown>;

export async function neonQuery<T = NeonRow>(_text: string, _params: unknown[] = []): Promise<T[]> {
  throw new Error('Direct Neon queries are disabled in this client. Use the Supabase Data API.');
}
