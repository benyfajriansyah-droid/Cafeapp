import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { invitations, workspaces } from "../../db/schema";
import { getSessionUser, safeReturnPath } from "../lib/auth/session";
import { hashToken } from "../lib/auth/tokens";
import AuthForm from "../masuk/auth-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lanjut = safeReturnPath(first(params.lanjut) ?? "/app");
  if (await getSessionUser()) redirect(lanjut);

  const token = first(params.undangan)?.trim() ?? "";
  const invitation = token ? await lookupInvitation(token) : null;

  return <AuthForm mode="register" lanjut={lanjut} invitation={invitation} />;
}

/**
 * Undangan yang masih berlaku, kalau ada.
 *
 * Halaman ini hanya menampilkan nama bisnis dan email tujuannya — penerimaannya sendiri
 * tetap diverifikasi ulang di server saat akun dibuat.
 */
async function lookupInvitation(token: string) {
  try {
    const db = getDb();
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.tokenHash, await hashToken(token)),
        gt(invitations.expiresAt, new Date().toISOString()),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    });
    if (!invitation) return null;

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, invitation.workspaceId),
    });
    if (!workspace) return null;

    return {
      token,
      email: invitation.email,
      workspaceName: workspace.name,
      role: invitation.role,
    };
  } catch {
    return null;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
