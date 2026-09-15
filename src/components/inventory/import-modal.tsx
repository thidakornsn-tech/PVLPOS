"use client";
import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/field";
import {
  autoMapHeaders,
  FIELD_LABELS,
  parseNumberLoose,
  rowsToObjects,
  type ImportField,
} from "@/lib/fuzzy-import";
import type { Product } from "@/lib/types";

type Stage = "pick" | "map" | "importing";

export type ImportRow = Partial<Product> & {
  _promotions?: { name: string; price: number }[];
};

export function ImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => Promise<void>;
}) {
  const [stage, setStage] = useState<Stage>("pick");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportField | null>>({});
  const [promoNames, setPromoNames] = useState<Record<number, string>>({});
  const [headerRowIdx, setHeaderRowIdx] = useState(0);
  const [fileName, setFileName] = useState("");

  function reset() {
    setStage("pick");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setPromoNames({});
    setFileName("");
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const isCsv = /\.csv$/i.test(file.name);
    let raw: unknown[][] = [];

    if (isCsv) {
      const text = await file.text();
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
      raw = parsed.data as unknown[][];
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    }

    const { headers: h, rows, headerRowIdx: idx } = rowsToObjects(raw);
    setHeaders(h);
    setDataRows(rows);
    setHeaderRowIdx(idx);
    const { mapping: m, promoNames: pn } = autoMapHeaders(h);
    setMapping(m);
    setPromoNames(pn);
    setStage("map");
  }

  async function confirmImport() {
    setStage("importing");
    const fieldByHeaderIdx = mapping;
    const rows: ImportRow[] = dataRows
      .map((r) => {
        const out: ImportRow = { name: "" };
        const promos: { name: string; price: number }[] = [];
        headers.forEach((h, idx) => {
          const field = fieldByHeaderIdx[idx];
          if (!field) return;
          const val = r[h];
          if (field === "rrpPrice") out.rrp_price = parseNumberLoose(val);
          else if (field === "currentStock") out.current_stock = parseNumberLoose(val);
          else if (field === "name") out.name = String(val ?? "").trim();
          else if (field === "brand") out.brand = String(val ?? "").trim();
          else if (field === "barcode") out.barcode = String(val ?? "").trim();
          else if (field === "sku") out.sku = String(val ?? "").trim();
          else if (field === "category") out.category = String(val ?? "").trim();
          else if (field === "promo") {
            const price = parseNumberLoose(val);
            const promoName = (promoNames[idx] || "").trim();
            if (price > 0 && promoName) promos.push({ name: promoName, price });
          }
        });
        if (promos.length) out._promotions = promos;
        return out;
      })
      .filter((r) => r.name);

    await onImport(rows);
    reset();
    onClose();
  }

  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const nameIsMapped = mappedFields.has("name");
  const promoColumnCount = Object.values(mapping).filter((f) => f === "promo").length;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import Products"
      width="max-w-2xl"
      footer={
        stage === "map" ? (
          <>
            <Button variant="outline" onClick={reset}>
              Back
            </Button>
            <Button disabled={!nameIsMapped} onClick={confirmImport}>
              Import {dataRows.length} rows
            </Button>
          </>
        ) : undefined
      }
    >
      {stage === "pick" && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Upload an Excel (.xlsx) or CSV file. Only <strong>Product Name</strong> is required — every other column
            is optional and auto-matched by header name (Brand, Barcode, Product Code, RRP Price, Current Stock,
            etc.), even if your file uses different wording. Columns named <strong>&quot;Promotion &lt;name&gt;&quot;</strong>{" "}
            (e.g. &quot;Promotion Summer Sale&quot;) are detected automatically — one column per promotion.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-900 file:text-white file:text-sm"
          />
        </div>
      )}

      {stage === "map" && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {fileName} — {dataRows.length} rows detected
            {headerRowIdx > 0 && ` (header row auto-detected at row ${headerRowIdx + 1})`}. Review the column
            mapping below and adjust any that look wrong.
            {promoColumnCount > 0 && ` ${promoColumnCount} promotion column(s) detected.`}
          </p>
          <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
            {headers.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-gray-700 truncate flex-1">{h}</span>
                <Select
                  className="w-48"
                  value={mapping[idx] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [idx]: (e.target.value || null) as ImportField | null }))
                  }
                >
                  <option value="">— Ignore —</option>
                  {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => (
                    <option key={f} value={f}>
                      {FIELD_LABELS[f]}
                    </option>
                  ))}
                </Select>
                {mapping[idx] === "promo" && (
                  <Input
                    className="w-40"
                    placeholder="Promotion name"
                    value={promoNames[idx] ?? ""}
                    onChange={(e) => setPromoNames((pn) => ({ ...pn, [idx]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          {!nameIsMapped && <p className="text-xs text-red-600 mt-2">Map at least one column to Product Name to continue.</p>}
        </div>
      )}

      {stage === "importing" && <p className="text-sm text-gray-600">Importing…</p>}
    </Modal>
  );
}
