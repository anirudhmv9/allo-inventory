"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

type ReserveTarget = {
  productId: string;
  warehouseId: string;
  quantity: number;
};

export function ProductListing() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reservingKey, setReservingKey] = useState<string | null>(null);
  const [reserveErrors, setReserveErrors] = useState<Record<string, string>>({});

  const inventoryKey = (productId: string, warehouseId: string) =>
    `${productId}:${warehouseId}`;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data: Product[] = await response.json();
      setProducts(data);

      const initialQuantities: Record<string, number> = {};
      for (const product of data) {
        for (const inventory of product.inventories) {
          initialQuantities[
            inventoryKey(product.id, inventory.warehouse.id)
          ] = 1;
        }
      }
      setQuantities(initialQuantities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleReserve = async ({
    productId,
    warehouseId,
    quantity,
  }: ReserveTarget) => {
    const key = inventoryKey(productId, warehouseId);

    setReservingKey(key);
    setReserveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity }),
      });

      const data = await response.json();

      if (response.status === 409) {
        const message =
          typeof data.error === "string"
            ? data.error
            : "Insufficient stock";
        setReserveErrors((prev) => ({ ...prev, [key]: message }));
        toast.error("Insufficient stock", { description: message });
        return;
      }

      if (!response.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : "Failed to create reservation";
        setReserveErrors((prev) => ({ ...prev, [key]: message }));
        return;
      }

      toast.success("Reservation created", {
        description: "Redirecting to checkout…",
      });
      router.push(`/reservation/${data.id}`);
    } catch (err) {
      setReserveErrors((prev) => ({
        ...prev,
        [key]:
          err instanceof Error ? err.message : "Failed to create reservation",
      }));
    } finally {
      setReservingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-4 h-6 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mb-2 h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-6 space-y-3">
                <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-lg font-medium text-red-800 dark:text-red-200">
          Could not load products
        </p>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => fetchProducts()}
          className="mt-6 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No products yet
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Run the database seed to populate inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <article
          key={product.id}
          className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="border-b border-zinc-100 p-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {product.name}
            </h2>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Warehouse inventory
            </p>

            {product.inventories.map((inventory) => {
              const key = inventoryKey(product.id, inventory.warehouse.id);
              const quantity = quantities[key] ?? 1;
              const isReserving = reservingKey === key;
              const reserveError = reserveErrors[key];
              const canReserve = inventory.availableStock > 0;

              return (
                <div
                  key={inventory.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {inventory.warehouse.name}
                  </p>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-zinc-500">Total</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {inventory.totalUnits}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Reserved</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {inventory.reservedUnits}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Available</dt>
                      <dd
                        className={`mt-0.5 font-semibold tabular-nums ${
                          inventory.availableStock > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }`}
                      >
                        {inventory.availableStock}
                      </dd>
                    </div>
                  </dl>

                  {reserveError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    >
                      {reserveError}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <label className="sr-only" htmlFor={`qty-${key}`}>
                      Quantity for {product.name} at {inventory.warehouse.name}
                    </label>
                    <input
                      id={`qty-${key}`}
                      type="number"
                      min={1}
                      max={inventory.availableStock}
                      value={quantity}
                      disabled={!canReserve || isReserving}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        setQuantities((prev) => ({
                          ...prev,
                          [key]: Number.isNaN(value) ? 1 : value,
                        }));
                        setReserveErrors((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      }}
                      className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <button
                      type="button"
                      disabled={
                        !canReserve ||
                        isReserving ||
                        quantity < 1 ||
                        quantity > inventory.availableStock
                      }
                      onClick={() =>
                        handleReserve({
                          productId: product.id,
                          warehouseId: inventory.warehouse.id,
                          quantity,
                        })
                      }
                      className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      {isReserving ? "Reserving…" : "Reserve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
