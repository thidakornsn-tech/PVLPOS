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
    const existing = claimedByField.get(guess.field);
    if (
      !existing ||
      guess.confidence > existing.confidence ||
      (guess.confidence === existing.confidence && guess.normLen > existing.normLen)
    ) {
      claimedByField.set(guess.field, { idx, confidence: guess.confidence, normLen: guess.normLen });
    }
  });

  claimedByField.forEach((v, field) => {
    mapping[v.idx] = field;
  });

  return { mapping, promoNames };
}

export function parseNumberLoose(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function findHeaderRowIndex(rows: unknown[][], maxScan = 20): number {
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(maxScan, rows.length); i++) {
    const row = rows[i] || [];
    const strCells = row.filter((c) => typeof c === "string" && c.trim() !== "");
    if (strCells.length < 2) continue;
    let matches = 0;
    let hasName = false;
    row.forEach((cell) => {
      if (typeof cell !== "string") return;
      const guess = guessFieldForHeader(cell);
      if (guess && guess.confidence >= 0.7) {
        matches++;
        if (guess.field === "name") hasName = true;
      }
    });
    const score = matches + (hasName ? 0.5 : 0);
    if ((matches >= 2 || (matches >= 1 && hasName)) && score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 0 ? bestIdx : 0;
}

export interface RowsToObjectsResult {
  headers: string[];
  rows: Record<string, unknown>[];
  headerRowIdx: number;
}

export function rowsToObjects(rawRows: unknown[][]): RowsToObjectsResult {
  const headerRowIdx = findHeaderRowIndex(rawRows);
  const rawHeaders = (rawRows[headerRowIdx] || []).map((h) => (h == null ? "" : String(h)));
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h, i) => {
    const label = h.trim() || `Column ${i + 1}`;
    const count = seen.get(label) || 0;
    seen.set(label, count + 1);
    return count === 0 ? label : `${label} (${count + 1})`;
  });

  const dataRows = rawRows.slice(headerRowIdx + 1);
  const rows = dataRows
    .filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = r[i];
      });
      return obj;
    });

  return { headers, rows, headerRowIdx };
}
