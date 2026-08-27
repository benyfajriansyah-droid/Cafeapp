import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Koneksi database.
 *
 * Driver-nya dipilih dari bentuk `DATABASE_URL`, bukan dipaku ke satu penyedia:
 *
 * - **Neon** diakses lewat HTTP. Di lingkungan serverless seperti Vercel, setiap permintaan
 *   bisa mendarat di instance berbeda dan pool koneksi cepat kehabisan slot; HTTP tidak punya
 *   masalah itu sama sekali.
 * - **Postgres lain** — lokal, Docker, Supabase, RDS, atau server sendiri — lewat koneksi TCP
 *   biasa. Tanpa jalur ini, pengembangan offline mustahil dan aplikasinya terkunci ke satu
 *   penyedia lagi, persis masalah yang membuat kami pindah dari hosting sebelumnya.
 */
type Database = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

let cached: Database | null = null;

export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function create(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example ke .env.local untuk pengembangan, " +
      "atau isi di Project Settings → Environment Variables kalau berjalan di Vercel.",
    );
  }

  if (isNeonUrl(url)) return drizzleNeon(neon(url), { schema });
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

export function getDb(): Database {
  // Dibuat sekali per instance. Membuat klien di setiap permintaan tidak salah, tapi menambah
  // pekerjaan yang tidak perlu di jalur terpanas aplikasi.
  cached ??= create();
  return cached;
}
