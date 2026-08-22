import { requireChatGPTUser } from "../chatgpt-auth";
import ActivationForm from "./activation-form";

export const dynamic = "force-dynamic";

export default async function ActivationPage() {
  const user = await requireChatGPTUser("/aktivasi");
  return <ActivationForm email={user.email} />;
}
