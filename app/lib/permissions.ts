export const MODULE_PERMISSIONS = [
  { key: "dashboard", label: "Ringkasan" },
  { key: "pos", label: "Kasir" },
  { key: "sales", label: "Penjualan harian" },
  { key: "products", label: "Produk" },
  { key: "inventory", label: "Stok barang" },
  { key: "purchases", label: "Pembelian / stok masuk" },
  { key: "expenses", label: "Biaya operasional" },
  { key: "shifts", label: "Shift kas" },
  { key: "reports", label: "Laporan keuangan" },
  { key: "branches", label: "Cabang" },
  { key: "team", label: "Akun & hak akses" },
  { key: "settings", label: "Pengaturan" },
] as const;

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number]["key"];

const ALL_PERMISSIONS = MODULE_PERMISSIONS.map((item) => item.key);

const ROLE_DEFAULTS: Record<string, ModulePermission[]> = {
  owner: ALL_PERMISSIONS,
  manager: ["dashboard", "pos", "sales", "products", "inventory", "purchases", "expenses", "shifts", "reports"],
  cashier: ["pos", "sales", "products", "inventory"],
  inventory: ["products", "inventory", "purchases"],
};

export function permissionsFor(member: { role: string; permissions?: string | null }): ModulePermission[] {
  if (member.role === "owner") return [...ALL_PERMISSIONS];
  const stored = String(member.permissions ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!stored.length) return [...(ROLE_DEFAULTS[member.role] ?? [])];
  return ALL_PERMISSIONS.filter((key) => stored.includes(key));
}

export function normalizePermissions(value: unknown, role: string): string {
  if (role === "owner") return ALL_PERMISSIONS.join(",");
  const submitted = Array.isArray(value) ? value.map(String) : String(value ?? "").split(",");
  const clean = ALL_PERMISSIONS.filter((key) => submitted.includes(key));
  return clean.join(",");
}

export function hasPermission(member: { role: string; permissions?: string | null }, permission: ModulePermission): boolean {
  return permissionsFor(member).includes(permission);
}
