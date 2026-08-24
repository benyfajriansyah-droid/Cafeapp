import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

/**
 * Identitas pengguna berasal dari header yang disuntikkan proxy ChatGPT Sites.
 *
 * Header itu hanya bisa dipercaya kalau memang ada proxy di depan aplikasi yang menghapus
 * versi palsunya dari permintaan luar. Kalau aplikasi ini dijalankan langsung — domain sendiri,
 * VPS, Workers tanpa proxy, atau deployment preview — siapa pun bisa mengirim header itu dan
 * langsung menjadi pemilik atau admin.
 *
 * Karena itu mode ini harus dinyatakan secara eksplisit lewat `AUTH_TRUSTED_PROXY=chatgpt-sites`.
 * Kalau variabelnya belum diisi, aplikasi menolak mengenali siapa pun. Salah konfigurasi yang
 * terlihat jelas jauh lebih murah daripada pengambilalihan akun yang tidak terlihat sama sekali.
 */
export function authMode(): "chatgpt-sites" | "unconfigured" {
  return env.AUTH_TRUSTED_PROXY === "chatgpt-sites" ? "chatgpt-sites" : "unconfigured";
}

export function isAuthConfigured(): boolean {
  return authMode() !== "unconfigured";
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  if (!isAuthConfigured()) {
    console.error(
      "[famz] AUTH_TRUSTED_PROXY belum diisi, jadi header identitas tidak dipercaya. " +
      "Set AUTH_TRUSTED_PROXY=chatgpt-sites kalau aplikasi berjalan di belakang proxy Sites.",
    );
    return null;
  }

  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email || !email.includes("@")) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return { displayName: fullName ?? email, email: email.trim().toLowerCase(), fullName };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname === SIGN_OUT_PATH || pathname === CALLBACK_PATH;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
