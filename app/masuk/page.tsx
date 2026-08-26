import { redirect } from "next/navigation";
import { getSessionUser, safeReturnPath } from "../lib/auth/session";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lanjut = safeReturnPath(first(params.lanjut) ?? "/app");
  if (await getSessionUser()) redirect(lanjut);
  return <AuthForm mode="login" lanjut={lanjut} />;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
