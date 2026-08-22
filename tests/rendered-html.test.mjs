import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("build contains OrderHero checkout and activation routes", async () => {
  const workerSource = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  const assetDirectory = new URL("../dist/client/assets/", import.meta.url);
  const assetNames = await readdir(assetDirectory);
  const checkoutAsset = assetNames.find((name) => name.startsWith("orderhero-checkout-"));
  const activationAsset = assetNames.find((name) => name.startsWith("activation-form-"));
  assert.ok(checkoutAsset);
  assert.ok(activationAsset);
  const checkoutSource = await readFile(new URL(checkoutAsset, assetDirectory), "utf8");
  const activationSource = await readFile(new URL(activationAsset, assetDirectory), "utf8");
  assert.match(workerSource, /\/api\/orderhero/);
  assert.match(checkoutSource, /CHECKOUT AMAN VIA ORDERHERO/);
  assert.match(activationSource, /Kode checkout Famz/);
  assert.match(workerSource, /platform_settings/);
});
