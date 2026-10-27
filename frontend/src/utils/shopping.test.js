import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShoppingList, reconcileShoppingLines } from "./shopping.js";

test("multiline input trims articles and ignores blank lines", () => {
  assert.deepEqual(reconcileShoppingLines(" Pain\r\n\n Lait \n"), [
    { label: "Pain", done: false }, { label: "Lait", done: false },
  ]);
});

test("editing and reordering preserve checks, including duplicate articles", () => {
  const previous = [
    { label: "Pain", done: true }, { label: "Pain", done: false }, { label: "Lait", done: true },
  ];
  assert.deepEqual(reconcileShoppingLines("Lait\nPain\nPain\nTomates", previous), [
    { label: "Lait", done: true }, { label: "Pain", done: true },
    { label: "Pain", done: false }, { label: "Tomates", done: false },
  ]);
  assert.equal(previous[0].done, true);
});

test("saved list restores text and checks after reopening", () => {
  const stored = { text: "Pain\nLait", items: [{ label: "Pain", done: true }, { label: "Lait", done: false }] };
  assert.deepEqual(parseShoppingList(JSON.stringify(stored)), stored);
  assert.deepEqual(parseShoppingList(null), { text: "", items: [] });
});

test("invalid storage is rejected rather than silently erased", () => {
  for (const raw of ["broken", "null", "{}", '{"text":"Pain","items":[null]}', '{"text":"Pain","items":[{"label":"Pain","done":"false"}]}']) {
    assert.throws(() => parseShoppingList(raw));
  }
});

test("clearing has no residual article to restore", () => {
  assert.deepEqual(reconcileShoppingLines("", [{ label: "Pain", done: true }]), []);
  assert.deepEqual(parseShoppingList('{"text":"","items":[]}'), { text: "", items: [] });
});
