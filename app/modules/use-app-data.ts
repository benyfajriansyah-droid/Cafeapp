"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppData } from "./shared";

export type Range = { from: string | null; to: string | null };

/**
 * Satu sumber data untuk seluruh aplikasi.
 *
 * Cabang dan rentang tanggal ikut dikirim ke server supaya angka ringkasan dihitung di sana
 * atas rentang yang sama — bukan dijumlahkan ulang di browser dari daftar yang sudah dipotong.
 */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [range, setRange] = useState<Range>({ from: null, to: null });

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branch", branchId);
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);

      const response = await fetch(`/api/app?${params}`, { cache: "no-store" });
      const result = await response.json() as AppData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Data gagal dimuat");
      setData(result);
      setLocked(result.entitlement.locked);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, [branchId, range.from, range.to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, branchId: branchId || undefined, ...payload }),
      });
      const result = await response.json() as Record<string, unknown> & { error?: string; message?: string; locked?: boolean };
      if (!response.ok) {
        if (result.locked) setLocked(true);
        throw new Error(result.error || "Data gagal disimpan");
      }
      setToast(result.message ?? "Data berhasil disimpan");
      window.setTimeout(() => setToast(""), 2600);
      await load();
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data gagal disimpan");
      return false as const;
    } finally {
      setSaving(false);
    }
  }, [branchId, load]);

  return {
    data, loading, saving, error, locked, toast, branchId, range,
    setBranchId, setRange, setError, setToast,
    reload: load, submit,
  };
}
