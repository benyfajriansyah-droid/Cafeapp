import { requireSessionUser } from "../lib/auth/session";
import CoffeeApp from "../coffee-app";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireSessionUser("/app");
  return <CoffeeApp userName={user.displayName} />;
}
