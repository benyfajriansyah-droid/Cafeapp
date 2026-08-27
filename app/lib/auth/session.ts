/**
 * Sesi pengguna.
 *
 * Menggantikan identitas berbasis header yang disuntikkan proxy hosting. Identitas sekarang
 * berasal dari cookie HttpOnly yang isinya token acak, dan token itu dicocokkan ke baris di
 * tabel `sessions`. Aplikasi jadi bisa dipasang di domain mana pun.
 *
 * Nama header lama sengaja tidak ditulis di berkas ini: ada uji yang memastikan string itu
 * benar-benar hilang dari hasil build, sebagai jaminan bahwa header tersebut tidak bisa lagi
 * dibaca dari mana pun.
 */

import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../../../db";
import { sessions, users } from "../../../db/schema";
import {
  SESSION_LIFETIME_MS,
  SESSION_REFRESH_THRESHOLD_MS,
  hashToken,
  isoIn,
  newSessionToken,
} from "./tokens";

export const SESSION_COOKIE = "famz_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  displayName: string;
};

/**
 * Siapa yang sedang masuk, atau `null`.
 *
 * Sesi yang mendekati kedaluwarsa diperpanjang di baris database-nya. Cookie di browser tidak
 * ikut ditulis ulang dari sini — Server Component tidak boleh menyetel cookie — jadi umur cookie
 * baru menyusul saat pengguna masuk lagi. Selisih itu tidak masalah: yang menentukan sesi masih
 * berlaku atau tidak adalah `expires_at` di database, bukan umur cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
  });
  if (!session) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || user.status !== "active") return null;

  const remaining = Date.parse(session.expiresAt) - Date.now();
  if (remaining < SESSION_REFRESH_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: isoIn(SESSION_LIFETIME_MS), lastSeenAt: now })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.name || user.email,
  };
}

export async function requireSessionUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}

/** Membuat sesi baru dan menyetel cookie-nya. Hanya boleh dipanggil dari Route Handler. */
export async function startSession(userId: string): Promise<void> {
  const db = getDb();
  const token = newSessionToken();
  const expiresAt = isoIn(SESSION_LIFETIME_MS);

  await db.insert(sessions).values({ tokenHash: await hashToken(token), userId, expiresAt });
  await writeSessionCookie(token, expiresAt);

  // Bersihkan sesi kedaluwarsa milik pengguna ini supaya tabelnya tidak tumbuh selamanya.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date().toISOString())));
}

/** Mengakhiri sesi yang sedang dipakai. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
  }
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

/** Mengakhiri SEMUA sesi milik satu pengguna — dipakai setelah kata sandi diganti. */
export async function endAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

async function writeSessionCookie(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    ...cookieOptions(),
    expires: new Date(expiresAt),
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    // `Lax` menolak cookie ikut terkirim pada POST lintas situs, jadi form dari domain lain
    // tidak bisa memakai sesi korban. Pemeriksaan Origin di `assertSameOrigin` menutup sisanya.
    sameSite: "lax" as const,
    secure: true,
    path: "/",
  };
}

export function signInPath(returnTo: string): string {
  return `/masuk?lanjut=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

/**
 * Hanya menerima path relatif di dalam aplikasi ini.
 *
 * Tanpa ini, `?lanjut=https://situs-penipu` mengubah halaman masuk jadi pengalih terbuka yang
 * meyakinkan: pengguna melihat domain yang benar, memasukkan kata sandinya, lalu dilempar keluar.
 */
export function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/app";
    if (["/masuk", "/daftar", "/keluar"].includes(url.pathname)) return "/app";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/app";
  }
}

/**
 * Menolak permintaan tulis yang datang dari situs lain.
 *
 * `SameSite=Lax` sudah menahan sebagian besar kasus, tapi hanya kalau browsernya patuh dan
 * permintaannya benar-benar lintas situs menurut definisi browser. Pemeriksaan Origin di server
 * tidak bergantung pada asumsi itu.
 */
export async function assertSameOrigin(request: Request): Promise<void> {
  const origin = request.headers.get("origin");
  if (!origin) return; // Bukan permintaan dari browser (curl, integrasi server-ke-server).

  const host = request.headers.get("host") ?? (await headers()).get("host");
  if (!host) throw new Error("Host tidak diketahui");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Origin tidak valid");
  }

  if (originHost !== host) throw new Error("Permintaan ditolak: asalnya bukan dari aplikasi ini");
}
