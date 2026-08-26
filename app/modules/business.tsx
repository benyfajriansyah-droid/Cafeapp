"use client";

import { Boxes, Check, Copy, CreditCard, Pencil, ShieldCheck, Store, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import {
  Empty, Field, Modal, SummaryStrip, canManage, isOwner, longDate, money,
  roleAccess, roleLabels, type Branch, type Member, type ModuleProps, type PlanId,
} from "./shared";

/* ------------------------------ Cabang ------------------------------ */

export function Branches({ data, saving, submit, openCreate, onCloseCreate, onManagePlan }: ModuleProps & {
  openCreate: boolean; onCloseCreate: () => void; onManagePlan: () => void;
}) {
  const [editing, setEditing] = useState<Branch | null>(null);
  const owner = isOwner(data);
  const limit = data.limits.branches;

  return (
    <section className="settings-grid">
      <article className="data-panel">
        <div className="panel-header">
          <div><h2>Outlet aktif</h2><p>Penjualan, biaya, stok, dan shift dipisahkan per outlet</p></div>
          <span className="paid-badge">{data.branches.length} dari {limit} outlet</span>
        </div>
        <div className="branch-list">
          {data.branches.map((branch) => (
            <div key={branch.id}>
              <span><Store size={20} /></span>
              <div>
                <b>{branch.name}</b>
                <small>{branch.code} · {branch.address || "Alamat belum diisi"}</small>
              </div>
              {owner ? (
                <button type="button" className="row-action" onClick={() => setEditing(branch)}><Pencil size={14} /> Ubah</button>
              ) : (
                <em>{branch.isActive ? "Aktif" : "Nonaktif"}</em>
              )}
            </div>
          ))}
        </div>
      </article>

      <article className="upgrade-card">
        <Boxes size={24} />
        <h2>Paket {data.entitlement.plan ?? "nonaktif"}</h2>
        <p>
          {data.branches.length >= limit
            ? `Paket ini mencakup ${limit} outlet dan sudah terpakai semua. Naikkan paket untuk menambah outlet.`
            : `Lo masih bisa menambah ${limit - data.branches.length} outlet lagi di paket ini.`}
        </p>
        <button type="button" onClick={onManagePlan}>Kelola paket</button>
      </article>

      {(openCreate || editing) && owner && (
        <Modal
          title={editing ? `Ubah ${editing.name}` : "Tambah outlet"}
          description="Setiap outlet punya kas, stok, dan laporannya sendiri."
          onClose={() => { setEditing(null); onCloseCreate(); }}
        >
          <form onSubmit={async (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            const result = editing
              ? await submit("update-branch", { targetBranchId: editing.id, ...payload })
              : await submit("create-branch", payload);
            if (result) { setEditing(null); onCloseCreate(); }
          }}>
            <div className="form-grid">
              <Field label="Nama outlet"><input name="name" required defaultValue={editing?.name} placeholder="Contoh: Outlet Kedua" /></Field>
              <Field label="Kode"><input name="code" defaultValue={editing?.code} placeholder="Otomatis kalau kosong" /></Field>
              <Field label="Alamat"><input name="address" defaultValue={editing?.address} placeholder="Alamat singkat" /></Field>
              {editing && (
                <Field label="Status">
                  <select name="isActive" defaultValue={editing.isActive ? "true" : "false"}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </Field>
              )}
            </div>
            <button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan outlet"}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}

/* ------------------------------- Tim ------------------------------- */

export function Team({ data, saving, submit, openCreate, onCloseCreate }: ModuleProps & {
  openCreate: boolean; onCloseCreate: () => void;
}) {
  const [editing, setEditing] = useState<Member | null>(null);
  const [invite, setInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const editable = canManage(data);
  const assignable = isOwner(data) ? ["manager", "cashier", "inventory"] : ["cashier", "inventory"];

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Pengguna aktif", value: `${data.members.filter((member) => member.status === "active").length} dari ${data.limits.members}` },
        { label: "Peran tersedia", value: "4" },
        { label: "Peran lo", value: roleLabels[data.currentMember.role] ?? data.currentMember.role },
      ]} />

      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Peran</th><th>Akses</th><th>Status</th>{editable && <th className="right">Aksi</th>}</tr>
          </thead>
          <tbody>
            {data.members.map((member) => (
              <tr key={member.id}>
                <td><b>{member.name || member.email.split("@")[0]}</b></td>
                <td>{member.email}</td>
                <td><span className="category-badge">{roleLabels[member.role] ?? member.role}</span></td>
                <td>{roleAccess[member.role] ?? "–"}</td>
                <td><span className="stock-chip">{member.status === "active" ? "Aktif" : "Ditangguhkan"}</span></td>
                {editable && (
                  <td className="right">
                    {member.role === "owner" ? "–" : (
                      <button type="button" className="row-action" onClick={() => setEditing(member)}><Pencil size={14} /> Ubah</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.invitations.length > 0 && (
        <div className="invitation-list">
          <div className="panel-header">
            <div>
              <h2>Undangan menunggu</h2>
              <p>Anggota tim aktif setelah membuka tautannya dan membuat akun.</p>
            </div>
          </div>
          {data.invitations.map((invitation) => (
            <div className="invitation-row" key={invitation.tokenHash}>
              <div>
                <b>{invitation.name || invitation.email.split("@")[0]}</b>
                <small>
                  {invitation.email} · {roleLabels[invitation.role] ?? invitation.role} · berlaku sampai{" "}
                  {longDate(invitation.expiresAt)}
                </small>
              </div>
              {editable && (
                <button
                  type="button"
                  className="row-action danger"
                  disabled={saving}
                  onClick={() => void submit("revoke-invitation", { tokenHash: invitation.tokenHash })}
                >
                  <Trash2 size={14} /> Cabut
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="role-note">
        <ShieldCheck size={16} />
        <p>
          <b>Akses dijaga di server</b>
          <span>Setiap aksi diperiksa berdasarkan peran sebelum data berubah, bukan hanya menyembunyikan tombol di layar.</span>
        </p>
      </div>

      {invite && (
        <Modal
          title="Undangan siap dikirim"
          description={`Kirim tautan ini ke ${invite.email}. Berlaku 7 hari dan hanya bisa dipakai oleh email tersebut.`}
          onClose={() => setInvite(null)}
        >
          <div className="invite-link">
            <code>{invite.url}</code>
            <button
              type="button"
              className="submit-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite.url);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2200);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? <><Check size={15} /> Tersalin</> : <><Copy size={15} /> Salin tautan</>}
            </button>
          </div>
          <p className="invite-hint">
            Paling gampang kirim lewat WhatsApp. Tautannya cuma bisa dipakai sekali — kalau salah
            kirim, cabut undangannya dari daftar di atas.
          </p>
        </Modal>
      )}

      {(openCreate || editing) && editable && (
        <Modal
          title={editing ? `Ubah ${editing.name || editing.email}` : "Tambah anggota tim"}
          description="Undangan dibuat sebagai tautan. Salin dan kirim ke anggota tim lewat WhatsApp."
          onClose={() => { setEditing(null); onCloseCreate(); }}
        >
          <form onSubmit={async (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            const result = editing
              ? await submit("update-member", { memberId: editing.id, ...payload })
              : await submit("create-member", payload);
            if (result) {
              setEditing(null);
              onCloseCreate();
              const invitation = result as { invitationUrl?: string; invitationEmail?: string };
              if (invitation.invitationUrl && invitation.invitationEmail) {
                setInvite({ url: invitation.invitationUrl, email: invitation.invitationEmail });
                setCopied(false);
              }
            }
          }}>
            <div className="form-grid">
              <Field label="Nama"><input name="name" required defaultValue={editing?.name} placeholder="Nama anggota" /></Field>
              {!editing && <Field label="Email akun"><input name="email" type="email" required placeholder="nama@email.com" /></Field>}
              <Field label="Peran">
                <select name="role" defaultValue={editing?.role ?? "cashier"}>
                  {assignable.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
              </Field>
              {editing && (
                <Field label="Status">
                  <select name="status" defaultValue={editing.status}>
                    <option value="active">Aktif</option>
                    <option value="suspended">Ditangguhkan</option>
                  </select>
                </Field>
              )}
            </div>
            <div className="modal-actions">
              {editing && (
                <button
                  type="button" className="row-action danger" disabled={saving}
                  onClick={async () => {
                    const result = await submit("remove-member", { memberId: editing.id });
                    if (result) setEditing(null);
                  }}
                >
                  <UserMinus size={14} /> Keluarkan
                </button>
              )}
              <button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

/* ---------------------------- Pengaturan ---------------------------- */

export function Settings({ data, saving, submit, onManagePlan }: ModuleProps & { onManagePlan: () => void }) {
  const owner = isOwner(data);
  const { entitlement, workspace } = data;
  const hasDemo = data.products.some((product) => product.isDemo)
    || data.ingredients.some((ingredient) => ingredient.isDemo)
    || data.orders.some((order) => order.orderNo.startsWith("FZ-CONTOH"));

  const statusLabel = entitlement.source === "paid" ? "Berlangganan aktif"
    : entitlement.source === "trial" ? "Masa uji coba" : "Langganan tidak aktif";

  return (
    <section className="account-layout">
      <article className="data-panel">
        <div className="panel-header"><div><h2>Identitas bisnis</h2><p>Dipakai di laporan dan struk</p></div></div>
        <form onSubmit={(event) => {
          event.preventDefault();
          void submit("update-settings", Object.fromEntries(new FormData(event.currentTarget)));
        }}>
          <div className="settings-fields">
            <Field label="Nama bisnis"><input name="businessName" defaultValue={workspace.name} disabled={!owner} /></Field>
            <Field label="Nomor WhatsApp"><input name="phone" defaultValue={workspace.phone} disabled={!owner} /></Field>
            <Field label="Jenis usaha">
              <select name="businessType" defaultValue={workspace.businessType} disabled={!owner}>
                <option value="coffee-home">Kopi rumahan</option>
                <option value="booth">Booth / gerobak</option>
                <option value="coffee-shop">Kedai kopi</option>
                <option value="multi-outlet">Multi-outlet</option>
              </select>
            </Field>
            <Field label="Pajak layanan (%)" hint="Ditambahkan ke total setiap transaksi.">
              <input name="taxPercent" type="number" min="0" max="100" step="0.1" defaultValue={workspace.taxPercent} disabled={!owner} />
            </Field>
            <Field label="Batas diskon kasir (%)" hint="Owner dan manager tetap bisa memberi diskon penuh.">
              <input name="cashierDiscountPercent" type="number" min="0" max="100" defaultValue={workspace.cashierDiscountPercent} disabled={!owner} />
            </Field>
          </div>
          {owner && <button className="settings-save" disabled={saving}>{saving ? "Menyimpan…" : "Simpan perubahan"}</button>}
        </form>
      </article>

      <article className="subscription-card">
        <div>
          <span>PAKET AKTIF</span>
          <b className="capitalize">{entitlement.plan ?? "Tidak aktif"}</b>
          <small className={`subscription-status ${entitlement.locked ? "pending" : ""}`}>{statusLabel}</small>
        </div>
        <CreditCard size={25} />
        <p>
          {entitlement.locked
            ? "Masa aktif sudah berakhir. Data lo tetap tersimpan dan bisa dipakai lagi setelah paket diperpanjang."
            : entitlement.expiresAt
              ? `Berlaku sampai ${longDate(entitlement.expiresAt)}${entitlement.daysLeft != null ? ` · sisa ${entitlement.daysLeft} hari` : ""}.`
              : "Langganan tercatat aktif di workspace ini."}
        </p>
        {owner && <button type="button" onClick={onManagePlan}>Kelola paket</button>}
      </article>

      {owner && hasDemo && (
        <article className="data-panel">
          <div className="panel-header"><div><h2>Data contoh</h2><p>Produk dan transaksi bawaan saat onboarding</p></div></div>
          <p className="panel-note">
            Data contoh ikut terhitung di laporan. Hapus setelah lo selesai mencoba supaya angkanya benar-benar milik usaha lo.
          </p>
          <button
            type="button" className="row-action danger" disabled={saving}
            onClick={() => void submit("clear-demo-data")}
          >
            <Trash2 size={14} /> {saving ? "Menghapus…" : "Bersihkan data contoh"}
          </button>
        </article>
      )}

      <article className="data-panel billing-history">
        <div className="panel-header"><div><h2>Riwayat tagihan</h2><p>Tagihan langganan Famz Coffee OS</p></div></div>
        {!data.billingInvoices.length ? (
          <Empty icon={CreditCard} title="Belum ada tagihan" text="Tagihan muncul setelah lo memilih paket berbayar." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Invoice</th><th>Paket</th><th>Jatuh tempo</th><th>Status</th><th className="right">Total</th></tr></thead>
              <tbody>
                {data.billingInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><b>{invoice.invoiceNo}</b></td>
                    <td className="capitalize">{invoice.plan} · {invoice.interval === "yearly" ? "Tahunan" : "Bulanan"}</td>
                    <td>{invoice.dueDate}</td>
                    <td><span className={invoice.status === "paid" ? "stock-chip" : "stock-chip low"}>{invoice.status === "paid" ? "Lunas" : "Menunggu"}</span></td>
                    <td className="right"><b>{money.format(invoice.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

/* ------------------------- Modal pilih paket ------------------------- */

export function PlanPicker({ data, saving, submit, onClose }: ModuleProps & { onClose: () => void }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">(data.workspace.billingInterval === "yearly" ? "yearly" : "monthly");
  const [plan, setPlan] = useState<PlanId>((data.entitlement.plan ?? "pro") as PlanId);
  const entries = Object.entries(data.plans) as Array<[PlanId, (typeof data.plans)[PlanId]]>;

  return (
    <Modal
      title="Kelola paket"
      description="Pembayaran diproses OrderHero. Paket aktif setelah pembayaran diverifikasi."
      onClose={onClose}
    >
      <div className="checkout-interval">
        <button type="button" className={interval === "monthly" ? "active" : ""} onClick={() => setInterval("monthly")}>Bulanan</button>
        <button type="button" className={interval === "yearly" ? "active" : ""} onClick={() => setInterval("yearly")}>Tahunan · hemat 2 bulan</button>
      </div>

      <div className="plan-picker">
        {entries.map(([key, detail]) => (
          <button key={key} type="button" className={plan === key ? "active" : ""} onClick={() => setPlan(key)}>
            <span>{detail.name}</span>
            <b>{money.format(detail[interval])}<small>/{interval === "monthly" ? "bulan" : "tahun"}</small></b>
            <p>{detail.branches} outlet · {detail.members} pengguna</p>
          </button>
        ))}
      </div>

      <p className="billing-disclaimer">
        Setelah memilih, lo akan dapat tagihan berisi kode checkout. Selesaikan pembayaran di OrderHero,
        lalu hubungkan invoicenya lewat halaman Aktivasi.
      </p>

      <button
        className="submit-button" disabled={saving}
        onClick={async () => {
          const result = await submit("select-plan", { plan, interval });
          if (result) onClose();
        }}
      >
        {saving ? "Menyiapkan…" : `Pilih ${data.plans[plan].name}`}
      </button>
    </Modal>
  );
}
