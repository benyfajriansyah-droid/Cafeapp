"use client";

import { Coffee, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Keluar selalu lewat POST.
 *
 * Kalau keluar bisa dipicu oleh GET, tautan `<img src="/keluar">` di halaman mana pun cukup
 * untuk mengeluarkan orang dari akunnya.
 */
export default function SignOutForm() {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setState("working");
      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logout" }),
        });
        if (!response.ok) throw new Error("gagal");
        window.location.href = "/";
      } catch {
        if (active) setState("failed");
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/">
        <Coffee size={20} />
        <b>Famz Coffee OS</b>
      </Link>
      <section className="auth-card">
        <div className="auth-done">
          <span>
            <LogOut size={28} />
          </span>
          <h1>{state === "failed" ? "Belum bisa keluar." : "Mengeluarkan akun…"}</h1>
          <p>
            {state === "failed"
              ? "Koneksi terputus sebelum sesi ditutup. Coba lagi."
              : "Sebentar ya."}
          </p>
          {state === "failed" && (
            <button type="button" onClick={() => window.location.reload()}>
              Coba lagi
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
