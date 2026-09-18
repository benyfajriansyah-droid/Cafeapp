import test from "node:test";
import assert from "node:assert/strict";

import { buildSpreadsheetXml } from "../app/lib/spreadsheet.ts";

test("spreadsheet memiliki beberapa tab dan tipe angka", () => {
  const xml = buildSpreadsheetXml([
    { name: "Ringkasan", rows: [["Laporan", "Dkriuk"], ["Penjualan", 125000]] },
    { name: "Pelanggan", rows: [["Nama", "Telepon"], ["Beny", "0812"]] },
  ]);

  assert.match(xml, /Worksheet ss:Name="Ringkasan"/);
  assert.match(xml, /Worksheet ss:Name="Pelanggan"/);
  assert.match(xml, /ss:Type="Number">125000/);
});

test("teks pelanggan di-escape dan tidak menjadi formula", () => {
  const xml = buildSpreadsheetXml([{ name: "Data", rows: [["Nama"], ['=1+1 & <script>']] }]);
  assert.match(xml, /=1\+1 &amp; &lt;script&gt;/);
  assert.doesNotMatch(xml, /<script>/);
  assert.doesNotMatch(xml, /ss:Formula/);
});

