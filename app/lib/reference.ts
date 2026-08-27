/**
 * Kode checkout yang menghubungkan pembayaran OrderHero dengan workspace pembeli.
 *
 * Kode ini tidak boleh bisa ditebak: siapa pun yang menebaknya bisa mengaku-ngaku
 * sebagai pembeli. Karena itu seluruh isinya diambil dari `crypto.getRandomValues`,
 * bukan dari waktu pembuatan.
 */

// Crockford base32 tanpa I, L, O, dan U — supaya tidak tertukar saat dibacakan lewat telepon.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BODY_LENGTH = 16;
const PREFIX = "FCO";
const PATTERN = new RegExp(`^${PREFIX}-[${ALPHABET}]{4}-[${ALPHABET}]{4}-[${ALPHABET}]{4}-[${ALPHABET}]{4}$`);

export function createCheckoutReference(randomBytes: Uint8Array = randomFill(BODY_LENGTH)): string {
  const body = Array.from(randomBytes.slice(0, BODY_LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  const groups = body.match(/.{1,4}/g) ?? [body];
  return `${PREFIX}-${groups.join("-")}`;
}

/** Membakukan kode yang diketik ulang oleh pembeli sebelum dicocokkan. */
export function normalizeCheckoutReference(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidCheckoutReference(value: string): boolean {
  return PATTERN.test(value);
}

function randomFill(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
