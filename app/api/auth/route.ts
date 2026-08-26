/**
 * Endpoint autentikasi.
 *
 * Semuanya lewat satu route supaya pemeriksaan yang wajib — asal permintaan, bentuk masukan,
 * pembatasan percobaan — hanya ditulis sekali dan tidak bisa terlewat di salah satu jalur.
 */

import { env } from "cloudflare:workers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { invitations, members, passwordResets, users, workspaces } from "../../../db/schema";
import { isMailConfigured, passwordResetMail, sendMail } from "../../lib/auth/mail";
import { hashPassword, passwordProblem, verifyPassword } from "../../lib/auth/password";
import {
  assertSameOrigin,
  endAllSessions,
  endSession,
  getSessionUser,
  safeReturnPath,
  startSession,
} from "../../lib/auth/session";
import { RESET_LIFETIME_MS, hashToken, isoIn, newLinkToken } from "../../lib/auth/tokens";
import { UserFacingError, safeErrorMessage } from "../../lib/platform";

/** Setelah sekian kali gagal berturut-turut, akun dikunci sementara. */
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let action = "";
  try {
    await assertSameOrigin(request);

    const body = (await request.json()) as Record<string, unknown>;
    action = String(body.action ?? "");

    switch (action) {
      case "register": return await register(body);
      case "login": return await login(body);
      case "logout": return await logout();
      case "request-reset": return await requestReset(body, request);
      case "reset-password": return await resetPassword(body);
      case "change-password": return await changePassword(body);
      case "accept-invitation": return await acceptInvitation(body);
      default:
        return Response.json({ error: "Aksi tidak dikenali" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof UserFacingError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: safeErrorMessage(error, `auth:${action}`) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------

async function register(body: Record<string, unknown>) {
  const email = readEmail(body.email);
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim().slice(0, 120);
  const invitationToken = String(body.invitationToken ?? "").trim();

  const problem = passwordProblem(password);
  if (problem) throw new UserFacingError(problem);

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new UserFacingError("Email ini sudah terdaftar. Silakan masuk.", 409);
  }

  // Undangannya diperiksa SEBELUM akun dibuat. Kalau tidak, undangan yang ditolak — misalnya
  // karena ditujukan ke email lain — tetap meninggalkan akun yang terlanjur jadi, sementara
  // pendaftarnya cuma melihat pesan gagal dan tidak bisa mendaftar ulang.
  const invitation = invitationToken ? await findRedeemableInvitation(invitationToken, email) : null;

  const userId = `usr_${crypto.randomUUID()}`;
  await db.insert(users).values({ id: userId, email, passwordHash: await hashPassword(password), name });

  if (invitation) await applyInvitation(invitation, email);

  await startSession(userId);
  return Response.json({ ok: true, redirect: safeReturnPath(String(body.lanjut ?? "/app")) });
}

async function login(body: Record<string, unknown>) {
  const email = readEmail(body.email);
  const password = String(body.password ?? "");

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Pesan yang sama untuk email tidak terdaftar maupun kata sandi salah. Membedakannya
  // mengubah halaman masuk jadi alat untuk memeriksa siapa saja yang punya akun di sini.
  const rejected = new UserFacingError("Email atau kata sandi salah.", 401);
  if (!user || user.status !== "active") throw rejected;

  if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
    const minutes = Math.max(1, Math.ceil((Date.parse(user.lockedUntil) - Date.now()) / 60_000));
    throw new UserFacingError(
      `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.`,
      429,
    );
  }

  const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failedAttempts = user.failedAttempts + 1;
    await db
      .update(users)
      .set({
        failedAttempts,
        lockedUntil: failedAttempts >= MAX_FAILED_ATTEMPTS ? isoIn(LOCKOUT_MS) : null,
      })
      .where(eq(users.id, user.id));
    throw rejected;
  }

  await db
    .update(users)
    .set({
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
      // Kata sandi yang masih memakai iterasi lama ditulis ulang saat pemiliknya masuk —
      // satu-satunya saat kata sandi aslinya ada di tangan kita.
      ...(needsRehash ? { passwordHash: await hashPassword(password) } : {}),
    })
    .where(eq(users.id, user.id));

  await startSession(user.id);
  return Response.json({ ok: true, redirect: safeReturnPath(String(body.lanjut ?? "/app")) });
}

async function logout() {
  await endSession();
  return Response.json({ ok: true, redirect: "/" });
}

async function requestReset(body: Record<string, unknown>, request: Request) {
  const email = readEmail(body.email);
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (user && user.status === "active") {
    const token = newLinkToken();
    await db.insert(passwordResets).values({
      tokenHash: await hashToken(token),
      userId: user.id,
      expiresAt: isoIn(RESET_LIFETIME_MS),
    });
    await sendMail(passwordResetMail(email, `${appOrigin(request)}/atur-password?token=${token}`));
  }

  // Jawaban yang sama apa pun hasilnya — kalau tidak, endpoint ini jadi cara memeriksa
  // email mana yang punya akun di sini.
  return Response.json({
    ok: true,
    message: "Kalau email itu terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.",
    mailConfigured: isMailConfigured(),
  });
}

async function resetPassword(body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  const problem = passwordProblem(password);
  if (problem) throw new UserFacingError(problem);

  const db = getDb();
  const reset = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.tokenHash, await hashToken(token)),
      gt(passwordResets.expiresAt, new Date().toISOString()),
      isNull(passwordResets.usedAt),
    ),
  });
  if (!reset) {
    throw new UserFacingError("Tautan ini sudah dipakai atau kedaluwarsa. Minta tautan baru.", 400);
  }

  await db.update(users).set({
    passwordHash: await hashPassword(password),
    failedAttempts: 0,
    lockedUntil: null,
  }).where(eq(users.id, reset.userId));

  await db.update(passwordResets)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(passwordResets.tokenHash, reset.tokenHash));

  // Kalau kata sandi diatur ulang karena akunnya diambil alih, sesi si pengambil alih harus
  // ikut mati — termasuk yang dibuat sebelum permintaan reset ini.
  await endAllSessions(reset.userId);
  await startSession(reset.userId);

  return Response.json({ ok: true, redirect: "/app" });
}

async function changePassword(body: Record<string, unknown>) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new UserFacingError("Silakan masuk terlebih dahulu.", 401);

  const currentPassword = String(body.currentPassword ?? "");
  const password = String(body.password ?? "");
  const problem = passwordProblem(password);
  if (problem) throw new UserFacingError(problem);

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, sessionUser.id) });
  if (!user) throw new UserFacingError("Akun tidak ditemukan.", 404);

  const { valid } = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new UserFacingError("Kata sandi lama salah.", 401);

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
  await endAllSessions(user.id);
  await startSession(user.id);

  return Response.json({ ok: true, message: "Kata sandi diperbarui. Perangkat lain sudah dikeluarkan." });
}

async function acceptInvitation(body: Record<string, unknown>) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new UserFacingError("Silakan masuk terlebih dahulu.", 401);

  const token = String(body.token ?? "").trim();
  const invitation = await findRedeemableInvitation(token, sessionUser.email);
  await applyInvitation(invitation, sessionUser.email);
  return Response.json({ ok: true, redirect: "/app" });
}

type Invitation = typeof invitations.$inferSelect;

/**
 * Memeriksa undangan tanpa mengubah apa pun.
 *
 * Undangan terikat ke satu alamat email. Tanpa ikatan itu, siapa pun yang tautannya diteruskan
 * ke grup WhatsApp bisa ikut masuk ke workspace orang.
 */
async function findRedeemableInvitation(token: string, email: string): Promise<Invitation> {
  if (!token) throw new UserFacingError("Tautan undangan tidak lengkap.", 400);

  const db = getDb();
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.tokenHash, await hashToken(token)),
      gt(invitations.expiresAt, new Date().toISOString()),
      isNull(invitations.acceptedAt),
      isNull(invitations.revokedAt),
    ),
  });
  if (!invitation) {
    throw new UserFacingError("Undangan ini sudah dipakai, dibatalkan, atau kedaluwarsa.", 400);
  }
  if (invitation.email !== email) {
    throw new UserFacingError(
      `Undangan ini ditujukan untuk ${invitation.email}. Masuk memakai email tersebut.`,
      403,
    );
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, invitation.workspaceId),
  });
  if (!workspace) throw new UserFacingError("Bisnis yang mengundang sudah tidak ada.", 404);

  return invitation;
}

/** Menjadikan undangan yang sudah diverifikasi sebagai keanggotaan aktif. */
async function applyInvitation(invitation: Invitation, email: string): Promise<void> {
  const db = getDb();
  const existing = await db.query.members.findFirst({
    where: and(eq(members.workspaceId, invitation.workspaceId), eq(members.email, email)),
  });

  if (existing) {
    await db.update(members)
      .set({ role: invitation.role, status: "active", name: existing.name || invitation.name })
      .where(eq(members.id, existing.id));
  } else {
    await db.insert(members).values({
      id: `mem_${crypto.randomUUID()}`,
      workspaceId: invitation.workspaceId,
      email,
      name: invitation.name,
      role: invitation.role,
      status: "active",
      invitedBy: invitation.invitedBy,
    });
  }

  await db.update(invitations)
    .set({ acceptedAt: new Date().toISOString() })
    .where(eq(invitations.tokenHash, invitation.tokenHash));
}

// ---------------------------------------------------------------------------

function readEmail(value: unknown): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email.includes("@") || email.length < 5 || email.length > 254) {
    throw new UserFacingError("Alamat email tidak valid.");
  }
  return email;
}

/**
 * Alamat dasar untuk tautan yang dikirim lewat email.
 *
 * Tidak boleh diambil dari body permintaan: siapa pun bisa meminta reset untuk email orang
 * lain sambil menyisipkan domainnya sendiri, dan korban menerima email berisi token yang sah
 * menuju situs penyerang. `APP_URL` mengunci nilainya di sisi server; kalau belum diisi,
 * dipakai origin permintaan, yang di Workers dibatasi route yang terdaftar.
 */
function appOrigin(request: Request): string {
  const configured = typeof env.APP_URL === "string" ? env.APP_URL.trim() : "";
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      console.error(`[famz] APP_URL bukan URL yang valid: ${configured}`);
    }
  }
  return new URL(request.url).origin;
}
