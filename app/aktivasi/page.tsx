import { requireSessionUser } from "../lib/auth/session";
import ActivationForm from "./activation-form";

export const dynamic = "force-dynamic";

export default async function ActivationPage() {
  const user = await requireSessionUser("/aktivasi");
  return <ActivationForm email={user.email} />;
}
