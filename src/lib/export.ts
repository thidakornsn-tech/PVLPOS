import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Product } from "@/lib/types";

function toRows(products: Product[]) {
  return products.map((p) => ({
    Brand: p.brand ?? "",
    "Product Name": p.name,
    Barcode: p.barcode ?? "",
    "Product Code": p.sku ?? "",
    Category: p.category ?? "",
    "RRP Price": p.rrp_price,
    "Current Stock": p.current_stock,
  }));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(products: Product[], filename = "inventory.csv") {
  const csv = Papa.unparse(toRows(products));
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportXlsx(products: Product[], filename = "inventory.xlsx") {
  const ws = XLSX.utils.json_to_sheet(toRows(products));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  XLSX.writeFile(wb, filename);
}

export function exportPdf(products: Product[], filename = "inventory.pdf") {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(12);
  doc.text("Powerlife Inventory Export", 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [["Brand", "Product Name", "Barcode", "Product Code", "Category", "RRP Price", "Current Stock"]],
    body: products.map((p) => [
      p.brand ?? "",
      p.name,
      p.barcode ?? "",
      p.sku ?? "",
      p.category ?? "",
      p.rrp_price.toFixed(2),
      String(p.current_stock),
    ]),
    styles: { fontSize: 8 },
  });
  doc.save(filename);
}
