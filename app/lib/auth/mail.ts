/**
 * Pengiriman email transaksional.
 *
 * Dipakai untuk satu hal yang benar-benar butuh email: tautan reset kata sandi. Undangan tim
 * sengaja tidak bergantung ke sini — tautannya bisa disalin dari layar dan dikirim lewat
 * WhatsApp, yang justru lebih dekat dengan cara kerja usaha kecil di Indonesia.
 *
 * Driver-nya Resend, dipanggil lewat `fetch` biasa supaya tidak menambah dependensi npm.
 * Kalau `RESEND_API_KEY` belum diisi, email tidak terkirim dan tautannya ditulis ke log server
 * saja — cukup untuk pengembangan lokal, tidak cukup untuk produksi.
 */

import { env } from "cloudflare:workers";

export function isMailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn(
      `[famz] RESEND_API_KEY/MAIL_FROM belum diisi — email ke ${message.to} tidak dikirim.\n` +
      `--- isi email (hanya untuk pengembangan) ---\n${message.text}\n---`,
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      console.error(`[famz] Resend menolak kiriman (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[famz] Gagal menghubungi Resend:", error);
    return false;
  }
}

export function passwordResetMail(to: string, link: string): MailMessage {
  return {
    to,
    subject: "Atur ulang kata sandi Famz Coffee OS",
    text:
      "Ada permintaan untuk mengatur ulang kata sandi akun ini.\n\n" +
      `Buka tautan berikut untuk membuat kata sandi baru:\n${link}\n\n` +
      "Tautan ini berlaku 1 jam dan hanya bisa dipakai sekali.\n\n" +
      "Kalau bukan kamu yang meminta, abaikan email ini — kata sandinya tidak berubah.\n\n" +
      "Kami tidak pernah meminta PIN, OTP, nomor kartu, atau kata sandi lewat email atau chat.",
  };
}
