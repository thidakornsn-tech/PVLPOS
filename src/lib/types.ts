// Domain types — field names mirror the Postgres columns (snake_case) in
// supabase/schema.sql so rows can be used directly without a mapping layer.

export type Role = "Administrator" | "Inventory Manager" | "Sales Staff";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface EventRow {
  id: string;
  name: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  brand: string | null;
  name: string;
  barcode: string | null;
  sku: string | null;
  category: string | null;
  rrp_price: number;
  current_stock: number;
  active_promotion_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockHistoryEntry {
  id: string;
  product_id: string;
  action: "Increase" | "Decrease" | "Adjust" | "Sale" | "Refund";
  qty: number;
  remark: string | null;
  resulting_stock: number;
  user_name: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  product_id: string;
  name: string;
  promo_price: number;
  enabled: boolean;
  created_at: string;
}

export interface EventAllocation {
  id: string;
  product_id: string;
  event_id: string;
  allocated: number;
  returned: number;
  created_at: string;
}

export interface SalesPerson {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export type OrderStatus = "completed" | "draft" | "refunded" | "cancelled";

export interface Order {
  id: string;
  order_number: string;
  event_id: string | null;
  event_name: string | null;
  sales_person_id: string | null;
  sales_person_name: string | null;
  payment_method_id: string | null;
  payment_method_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  amount_received: number | null;
  change_amount: number | null;
  status: OrderStatus;
  is_draft: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  brand: string | null;
  qty: number;
  unit_price: number;
  price_label: string | null;
  is_giveaway: boolean;
  line_total: number;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface CartLine {
  productId: string;
  name: string;
  brand: string | null;
  qty: number;
  unitPrice: number;
  priceLabel: string;
  isGiveaway: boolean;
  maxAvailable: number;
}

export function isCountableOrder(o: { is_draft: boolean; status: OrderStatus }) {
  return !o.is_draft && o.status === "completed";
}
