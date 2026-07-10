import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number | null | undefined) {
  const v = n ?? 0;
  return "฿" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pad(n: number, len = 4) {
  return String(n).padStart(len, "0");
}

/** EVYYMMDD prefix for today, used to compute the next order number. */
export function orderDatePrefix(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = pad(date.getMonth() + 1, 2);
  const dd = pad(date.getDate(), 2);
  return `EV${yy}${mm}${dd}`;
}
