import { eq } from "drizzle-orm";
import type { getDb } from "../../db";
import { expenses, ingredients, orderItems, orders, products, recipes, shifts } from "../../db/schema";
import { chunkRows } from "./chunk";

type Db = ReturnType<typeof getDb>;

/**
 * Mengisi workspace dengan data contoh supaya pemilik baru bisa langsung mencoba kasir.
 *
 * Semua baris ditandai `isDemo` supaya bisa dibuang bersih lewat aksi `clear-demo-data`.
 * Data ini hanya masuk kalau pemilik memintanya di onboarding — laporan pertama pelanggan
 * tidak boleh tercampur transaksi yang tidak pernah terjadi.
 */
export async function seedDemoWorkspace(db: Db, workspaceId: string, branchId: string) {
  const existing = await db.query.products.findFirst({ where: eq(products.workspaceId, workspaceId) });
  if (existing) return { seeded: false };

  const rowId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
  const today = new Date().toISOString().slice(0, 10);
  const at = (hour: number, minute: number) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  const demoProducts = [
    { id: rowId("prd"), name: "Kopi Susu Gula Aren", sku: "KSA-01", category: "Coffee", price: 18_000, cost: 5_700 },
    { id: rowId("prd"), name: "Americano", sku: "AME-01", category: "Coffee", price: 15_000, cost: 4_200 },
    { id: rowId("prd"), name: "Matcha Latte", sku: "MTC-01", category: "Non Coffee", price: 20_000, cost: 6_900 },
    { id: rowId("prd"), name: "Cokelat Sea Salt", sku: "CSS-01", category: "Non Coffee", price: 21_000, cost: 7_400 },
    { id: rowId("prd"), name: "Croissant Butter", sku: "CRB-01", category: "Pastry", price: 18_000, cost: 8_500 },
    { id: rowId("prd"), name: "Rice Bowl Ayam", sku: "RBA-01", category: "Food", price: 28_000, cost: 13_700 },
  ];

  const demoIngredients = [
    { id: rowId("ing"), name: "Biji kopi house blend", unit: "gram", stockQty: 1_200, minimumStock: 1_500, averageCost: 220, supplier: "Roastery Partner" },
    { id: rowId("ing"), name: "Susu segar", unit: "ml", stockQty: 3_500, minimumStock: 5_000, averageCost: 19, supplier: "Supplier Harian" },
    { id: rowId("ing"), name: "Gula aren cair", unit: "ml", stockQty: 5_200, minimumStock: 2_000, averageCost: 26, supplier: "Dapur Aren" },
    { id: rowId("ing"), name: "Bubuk matcha", unit: "gram", stockQty: 680, minimumStock: 250, averageCost: 540, supplier: "Tea Supply" },
    { id: rowId("ing"), name: "Cup 16 oz", unit: "pcs", stockQty: 42, minimumStock: 150, averageCost: 1_150, supplier: "Packaging Hub" },
    { id: rowId("ing"), name: "Es batu", unit: "gram", stockQty: 18_000, minimumStock: 7_000, averageCost: 2, supplier: "Internal" },
  ];

  const [coffee, milk, aren, matcha, cup] = demoIngredients;

  const demoRecipes = [
    { productId: demoProducts[0].id, ingredientId: coffee.id, quantity: 18 },
    { productId: demoProducts[0].id, ingredientId: milk.id, quantity: 120 },
    { productId: demoProducts[0].id, ingredientId: aren.id, quantity: 25 },
    { productId: demoProducts[0].id, ingredientId: cup.id, quantity: 1 },
    { productId: demoProducts[1].id, ingredientId: coffee.id, quantity: 18 },
    { productId: demoProducts[1].id, ingredientId: aren.id, quantity: 20 },
    { productId: demoProducts[1].id, ingredientId: cup.id, quantity: 1 },
    { productId: demoProducts[2].id, ingredientId: matcha.id, quantity: 8 },
    { productId: demoProducts[2].id, ingredientId: milk.id, quantity: 140 },
    { productId: demoProducts[2].id, ingredientId: cup.id, quantity: 1 },
  ];

  const demoSales = [
    { product: demoProducts[0], quantity: 3, method: "QRIS", hour: 8, minute: 12 },
    { product: demoProducts[1], quantity: 2, method: "Tunai", hour: 8, minute: 44 },
    { product: demoProducts[2], quantity: 2, method: "QRIS", hour: 9, minute: 18 },
    { product: demoProducts[0], quantity: 4, method: "Debit", hour: 9, minute: 52 },
    { product: demoProducts[4], quantity: 3, method: "Tunai", hour: 10, minute: 16 },
    { product: demoProducts[5], quantity: 2, method: "QRIS", hour: 10, minute: 36 },
  ];

  const orderRows = demoSales.map((sale, index) => {
    const total = sale.product.price * sale.quantity;
    return {
      order: {
        id: rowId("ord"), workspaceId, branchId,
        orderNo: `FZ-CONTOH-${String(index + 1).padStart(2, "0")}`,
        channel: index % 3 === 0 ? "Take away" : "Dine in",
        paymentMethod: sale.method, subtotal: total, total,
        createdAt: at(sale.hour, sale.minute), isDemo: true,
      },
      item: { sale, total },
    };
  });

  // Tiap insert dipecah menurut lebar tabelnya supaya tidak melewati batas parameter D1.
  for (const rows of chunkRows(demoProducts.map((product) => ({ ...product, workspaceId, isDemo: true })), 10)) {
    await db.insert(products).values(rows);
  }
  for (const rows of chunkRows(demoIngredients.map((ingredient) => ({ ...ingredient, workspaceId, isDemo: true })), 11)) {
    await db.insert(ingredients).values(rows);
  }
  for (const rows of chunkRows(demoRecipes.map((recipe) => ({ ...recipe, id: rowId("rcp"), workspaceId })), 5)) {
    await db.insert(recipes).values(rows);
  }
  for (const rows of chunkRows(orderRows.map((row) => row.order), 20)) {
    await db.insert(orders).values(rows);
  }
  const demoItems = orderRows.map(({ order, item }) => ({
    id: rowId("itm"), orderId: order.id, productId: item.sale.product.id,
    productName: item.sale.product.name, quantity: item.sale.quantity,
    unitPrice: item.sale.product.price, unitCost: item.sale.product.cost, subtotal: item.total,
  }));
  for (const rows of chunkRows(demoItems, 8)) {
    await db.insert(orderItems).values(rows);
  }
  await db.insert(expenses).values([
    { id: rowId("exp"), workspaceId, branchId, category: "Bahan bakar", amount: 23_000, paymentMethod: "Tunai", note: "Gas LPG", transactionDate: today, isDemo: true },
    { id: rowId("exp"), workspaceId, branchId, category: "Operasional", amount: 85_000, paymentMethod: "Transfer", note: "Air galon & tisu", transactionDate: today, isDemo: true },
    { id: rowId("exp"), workspaceId, branchId, category: "Transportasi", amount: 45_000, paymentMethod: "Tunai", note: "Ongkir bahan", transactionDate: today, isDemo: true },
  ]);
  await db.insert(shifts).values({
    id: rowId("shf"), workspaceId, branchId, cashierName: "Kasir Contoh",
    openingCash: 500_000, openedAt: at(7, 2), isDemo: true,
  });

  return { seeded: true };
}
