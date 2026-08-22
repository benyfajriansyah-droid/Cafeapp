import { requireChatGPTUser } from "../chatgpt-auth";
import CoffeeApp from "../coffee-app";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireChatGPTUser("/app");
  return <CoffeeApp userName={user.displayName} />;
}
