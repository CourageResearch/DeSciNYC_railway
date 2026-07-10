import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("authenticated admin pages share reciprocal dashboard navigation", async () => {
  const [navigation, adminPage, adsPage] = await Promise.all([
    readFile("app/admin/components/AdminNav.tsx", "utf8"),
    readFile("app/admin/page.tsx", "utf8"),
    readFile("app/ads/page.tsx", "utf8"),
  ]);

  assert.match(navigation, /aria-label="Admin navigation"/);
  assert.match(navigation, /href: "\/admin"/);
  assert.match(navigation, /label: "Admin dashboard"/);
  assert.match(navigation, /href: "\/ads"/);
  assert.match(navigation, /label: "Ads dashboard"/);
  assert.match(navigation, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(navigation, /<LogoutButton \/>/);

  assert.match(adminPage, /<AdminNav active="admin" \/>/);
  assert.match(adsPage, /<AdminNav active="ads" \/>/);
});
