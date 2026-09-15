// Smart Excel/CSV header matching — ported from the original demo.
// Only "name" (Product Name) is required; every other column is optional
// and matched via exact / substring / Levenshtein-similarity fuzzy matching.

export type ImportField =
  | "brand"
  | "name"
  | "barcode"
  | "sku"
  | "category"
  | "rrpPrice"
  | "currentStock"
  | "promo";

export const FIELD_LABELS: Record<ImportField, string> = {
  brand: "Brand",
  name: "Product Name",
  barcode: "Barcode",
  sku: "Product Code",
  category: "Category",
  rrpPrice: "RRP Price",
  currentStock: "Current Stock",
  promo: "Promotion Price",
};

const FIELD_SYNONYMS: Record<ImportField, string[]> = {
  brand: ["brand", "vendor", "manufacturer", "make"],
  name: ["product name", "item name", "item description", "description", "name", "product", "item"],
  barcode: ["barcode", "bar code", "ean", "upc", "gtin"],
  sku: ["sku", "product code", "item code", "model", "code", "part number"],
  category: ["category", "type", "product type", "class"],
  rrpPrice: ["rrp", "rrp price", "retail price", "unit price", "unit retail", "price", "msrp", "list price"],
  currentStock: ["current stock", "stock", "qty", "quantity", "on hand", "inventory", "stock qty", "stock on hand"],
  promo: [],
};

export function normalizeHeader(h: string) {
  return String(h || "")
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detects columns named "Promotion <name>" / "Promo <name>" — one column
 * per promotion; each row's cell holds that product's price under that
 * promotion. Returns the promotion name, or null if not a promo column. */
export function detectPromotionHeader(rawHeader: string): string | null {
  const raw = String(rawHeader || "").trim();
  const m = raw.match(/^promo(?:tion)?s?\s*[:\-]?\s+(.+)$/i);
  if (!m) return null;
  let name = m[1].trim();
  name = name.replace(/\s*price\s*$/i, "").trim();
  return name || null;
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

interface Guess {
  field: ImportField;
  confidence: number;
  normLen: number;
}

export function guessFieldForHeader(rawHeader: string): Guess | null {
  const norm = normalizeHeader(rawHeader);
  if (!norm) return null;

  let best: Guess | null = null;

  (Object.keys(FIELD_SYNONYMS) as ImportField[]).forEach((field) => {
    FIELD_SYNONYMS[field].forEach((syn) => {
      let confidence = 0;
      if (norm === syn) confidence = 1;
      else if (norm.includes(syn) && syn.length >= 3) confidence = 0.9;
      else {
        const sim = similarity(norm, syn);
        if (sim >= 0.72) confidence = sim * 0.85;
      }
      if (confidence > 0 && (!best || confidence > best.confidence)) {
        best = { field, confidence, normLen: norm.length };
      }
    });
  });

  return best;
}

export function autoMapHeaders(headers: string[]): {
  mapping: Record<number, ImportField | null>;
  promoNames: Record<number, string>;
} {
  const mapping: Record<number, ImportField | null> = {};
  const promoNames: Record<number, string> = {};
  const claimedByField = new Map<ImportField, { idx: number; confidence: number; normLen: number }>();

  headers.forEach((h, idx) => {
    const promoName = detectPromotionHeader(h);
    if (promoName) {
      mapping[idx] = "promo";
      promoNames[idx] = promoName;
      return;
    }
    mapping[idx] = null;
    const guess = guessFieldForHeader(h);
    if (!guess) return;
    const
