export const SHOPPING_STORAGE_KEY = "tetedeflorette-shopping-v1";

// A queue per label preserves the individual checks of duplicate articles.
export function reconcileShoppingLines(text, previousItems = []) {
  const previousByLabel = new Map();
  for (const item of previousItems) {
    const matches = previousByLabel.get(item.label) || [];
    matches.push(item);
    previousByLabel.set(item.label, matches);
  }
  return text.split(/\r?\n/).map((label) => label.trim()).filter(Boolean).map((label) => {
    const previous = previousByLabel.get(label)?.shift();
    return { label, done: previous?.done === true };
  });
}

export function parseShoppingList(raw) {
  if (raw === null) return { text: "", items: [] };
  const value = JSON.parse(raw);
  if (!value || typeof value.text !== "string" || !Array.isArray(value.items)
    || value.items.some((item) => !item || typeof item.label !== "string" || typeof item.done !== "boolean")) {
    throw new Error("Invalid shopping list");
  }
  return { text: value.text, items: reconcileShoppingLines(value.text, value.items) };
}
