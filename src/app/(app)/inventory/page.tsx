"use client";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Search, Plus, Upload, Download, Trash2, MoreVertical, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-current-user";
import { useEvents } from "@/lib/queries/master-data";
import {
  activePromotion,
  allocatedEventStock,
  availableStock,
  useAdjustStock,
  useBulkInsertProducts,
  useCreateProduct,
  useDeleteProducts,
  useDeletePromotion,
  useProductExtras,
  useProducts,
  useSaveAllocation,
  useSavePromotion,
  useSetActivePromotion,
  useUpdateProduct,
} from "@/lib/queries/products";
import type { Product } from "@/lib/types";
import { ProductFormModal } from "@/components/inventory/product-form-modal";
import { StockModal } from "@/components/inventory/stock-modal";
import { PromotionModal } from "@/components/inventory/promotion-modal";
import { EventAllocationModal } from "@/components/inventory/event-modal";
import { ImportModal } from "@/components/inventory/import-modal";
import { exportCsv, exportPdf, exportXlsx } from "@/lib/export";

type FilterKey = "all" | "in-stock" | "out-of-stock" | "low-stock" | "with-promo" | "allocated";
const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: extras } = useProductExtras();
  const { data: events = [] } = useEvents();
  const user = useCurrentUser();
  const toast = useToast();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProducts = useDeleteProducts();
  const bulkInsert = useBulkInsertProducts();
  const adjustStock = useAdjustStock();
  const savePromotion = useSavePromotion();
  const deletePromotion = useDeletePromotion();
  const setActivePromotion = useSetActivePromotion();
  const saveAllocation = useSaveAllocation();

  const promotions = extras?.promotions ?? [];
  const history = extras?.history ?? [];
  const allocations = extras?.allocations ?? [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [promoProductId, setPromoProductId] = useState<string | null>(null);
  const [eventProductId, setEventProductId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "all" | Product | null>(null);
  const [menuForId, setMenuForId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filter === "in-stock" && p.current_stock <= 0) return false;
      if (filter === "out-of-stock" && p.current_stock > 0) return false;
      if (filter === "low-stock" && !(p.current_stock > 0 && p.current_stock <= LOW_STOCK_THRESHOLD)) return false;
      if (filter === "with-promo" && !activePromotion(p, promotions)) return false;
      if (filter === "allocated" && allocatedEventStock(p.id, allocations) <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.name} ${p.brand ?? ""} ${p.barcode ?? ""} ${p.sku ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, filter, search, promotions, allocations]);

  const columnHelper = createColumnHelper<Product>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("brand", { header: "Brand", cell: (c) => c.getValue() || "-" }),
      columnHelper.accessor("name", { header: "Product Name" }),
      columnHelper.accessor("barcode", { header: "Barcode", cell: (c) => c.getValue() || "-" }),
      columnHelper.accessor("sku", { header: "Product Code", cell: (c) => c.getValue() || "-" }),
      columnHelper.accessor("rrp_price", {
        header: "RRP Price",
        cell: (c) => formatCurrency(c.getValue()),
      }),
      columnHelper.display({
        id: "promo_price",
        header: "Promotion Price",
        cell: (c) => {
          const promo = activePromotion(c.row.original, promotions);
          return promo ? (
            <span className="text-green-700 font-medium">
              {formatCurrency(promo.promo_price)} <span className="text-gray-400 font-normal">({promo.name})</span>
            </span>
          ) : (
            "-"
          );
        },
      }),
      columnHelper.accessor("current_stock", { header: "Current Stock" }),
      columnHelper.display({
        id: "allocated",
        header: "Allocated Event Stock",
        cell: (c) => allocatedEventStock(c.row.original.id, allocations),
      }),
      columnHelper.display({
        id: "available",
        header: "Available Stock",
        cell: (c) => {
          const avail = availableStock(c.row.original, allocations);
          const p = c.row.original;
          return (
            <span
              className={
                p.current_stock <= 0 ? "text-red-600" : p.current_stock <= LOW_STOCK_THRESHOLD ? "text-amber-600" : "text-gray-700"
              }
            >
              {avail}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (c) => {
          const p = c.row.original;
          const open = menuForId === p.id;
          return (
            <div className="relative">
              <button className="text-gray-400 hover:text-gray-700" onClick={() => setMenuForId(open ? null : p.id)}>
                <MoreVertical className="w-4 h-4" />
              </button>
              {open && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 text-sm">
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      setEditingProduct(p);
                      setFormOpen(true);
                      setMenuForId(null);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      createProduct.mutate(
                        { ...p, id: undefined, name: `${p.name} (Copy)` } as Partial<Product>,
                        { onSuccess: () => toast.push("Product duplicated") }
                      );
                      setMenuForId(null);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      setStockProductId(p.id);
                      setMenuForId(null);
                    }}
                  >
                    Adjust Stock
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      setPromoProductId(p.id);
                      setMenuForId(null);
                    }}
                  >
                    Promotions
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => {
                      setEventProductId(p.id);
                      setMenuForId(null);
                    }}
                  >
                    Event Allocation
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-red-600"
                    onClick={() => {
                      setDeleteTarget(p);
                      setMenuForId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        },
      }),
    ],
    [columnHelper, promotions, allocations, menuForId, createProduct, toast]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const stockProduct = products.find((p) => p.id === stockProductId) ?? null;
  const promoProduct = products.find((p) => p.id === promoProductId) ?? null;
  const eventProduct = products.find((p) => p.id === eventProductId) ?? null;

  function userName() {
    return user?.name ?? "Unknown";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setExportMenuOpen((v) => !v)}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 text-sm">
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={() => { exportCsv(filtered); setExportMenuOpen(false); }}>
                  CSV (filtered)
                </button>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={() => { exportXlsx(filtered); setExportMenuOpen(false); }}>
                  Excel (filtered)
                </button>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={() => { exportPdf(filtered); setExportMenuOpen(false); }}>
                  PDF (filtered)
                </button>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50 border-t border-gray-100" onClick={() => { exportCsv(products, "inventory-all.csv"); setExportMenuOpen(false); }}>
                  CSV (entire inventory)
                </button>
              </div>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, barcode, code…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(
            [
              ["all", "All"],
              ["in-stock", "In Stock"],
              ["out-of-stock", "Out of Stock"],
              ["low-stock", "Low Stock"],
              ["with-promo", "With Promo"],
              ["allocated", "Allocated"],
            ] as [FilterKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-2.5 py-1.5 rounded-md border ${
                filter === key ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget("selected")}>
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-red-600 ml-auto" onClick={() => setDeleteTarget("all")}>
          Delete Entire Inventory
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const next: Record<string, boolean> = {};
                        filtered.forEach((p) => (next[p.id] = true));
                        setRowSelection(next);
                      } else {
                        setRowSelection({});
                      }
                    }}
                  />
                </th>
                {table.getHeaderGroups()[0].headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left px-3 py-2 font-medium text-gray-500 text-xs cursor-pointer select-none whitespace-nowrap"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                    No products found.
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!rowSelection[row.id]}
                      onChange={(e) => setRowSelection((s) => ({ ...s, [row.id]: e.target.checked }))}
                    />
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editingProduct}
        onSave={(patch) => {
          if (editingProduct) {
            updateProduct.mutate(
              { id: editingProduct.id, patch },
              { onSuccess: () => { toast.push("Product updated"); setFormOpen(false); } }
            );
          } else {
            createProduct.mutate(patch, {
              onSuccess: () => { toast.push("Product added"); setFormOpen(false); },
            });
          }
        }}
      />

      <StockModal
        open={!!stockProductId}
        onClose={() => setStockProductId(null)}
        product={stockProduct}
        history={history.filter((h) => h.product_id === stockProductId)}
        onSubmit={(action, qty, remark) => {
          if (!stockProduct) return;
          adjustStock.mutate(
            { product: stockProduct, action, qty, remark, userName: userName() },
            { onSuccess: () => toast.push("Stock updated") }
          );
        }}
      />

      <PromotionModal
        open={!!promoProductId}
        onClose={() => setPromoProductId(null)}
        product={promoProduct}
        promotions={promotions.filter((p) => p.product_id === promoProductId)}
        onAdd={(name, price) => {
          if (!promoProductId) return;
          savePromotion.mutate({ product_id: promoProductId, name, promo_price: price, enabled: true });
        }}
        onDelete={(id) => deletePromotion.mutate(id)}
        onToggleEnabled={(id, enabled) => savePromotion.mutate({ id, product_id: promoProductId!, enabled })}
        onSetActive={(promotionId) => {
          if (!promoProductId) return;
          setActivePromotion.mutate({ productId: promoProductId, promotionId });
        }}
      />

      <EventAllocationModal
        open={!!eventProductId}
        onClose={() => setEventProductId(null)}
        product={eventProduct}
        events={events}
        allocations={allocations}
        onSave={(eventId, allocated, returned) => {
          if (!eventProductId) return;
          saveAllocation.mutate(
            { productId: eventProductId, eventId, allocated, returned },
            { onSuccess: () => toast.push("Allocation saved") }
          );
        }}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (rows) => {
          await bulkInsert.mutateAsync(rows);
          toast.push(`Imported ${rows.length} products`);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget === "all" ? "Delete Entire Inventory" : deleteTarget === "selected" ? "Delete Selected Products" : "Delete Product"
        }
        message={
          deleteTarget === "all"
            ? `This permanently deletes all ${products.length} products. This cannot be undone.`
            : deleteTarget === "selected"
            ? `Delete ${selectedIds.length} selected product(s)? This cannot be undone.`
            : `Delete "${deleteTarget && typeof deleteTarget === "object" ? deleteTarget.name : ""}"? This cannot be undone.`
        }
        onConfirm={() => {
          if (deleteTarget === "all") {
            deleteProducts.mutate(products.map((p) => p.id), { onSuccess: () => toast.push("Inventory cleared") });
          } else if (deleteTarget === "selected") {
            deleteProducts.mutate(selectedIds, {
              onSuccess: () => {
                toast.push("Products deleted");
                setRowSelection({});
              },
            });
          } else if (deleteTarget) {
            deleteProducts.mutate([deleteTarget.id], { onSuccess: () => toast.push("Product deleted") });
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
