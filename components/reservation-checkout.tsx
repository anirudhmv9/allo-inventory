"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReservationDetails } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const statusStyles: Record<
  ReservationDetails["status"],
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  RELEASED: {
    label: "Released",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

type ReservationCheckoutProps = {
  reservationId: string;
};

export function ReservationCheckout({ reservationId }: ReservationCheckoutProps) {
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [action, setAction] = useState<"confirm" | "cancel" | null>(null);
  const expiredToastShown = useRef(false);

  const fetchReservation = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(`/api/reservations/${reservationId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Failed to load reservation",
          );
        }

        setReservation(data);
      } catch (err) {
        if (!options?.silent) {
          setReservation(null);
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [reservationId],
  );

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  useEffect(() => {
    if (!reservation) return;

    const updateTimer = () => {
      const remaining =
        new Date(reservation.expiresAt).getTime() - Date.now();
      setTimeLeftMs(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  useEffect(() => {
    if (reservation?.status !== "PENDING") {
      expiredToastShown.current = false;
      return;
    }

    if (timeLeftMs <= 0 && !expiredToastShown.current) {
      expiredToastShown.current = true;
      toast.warning("Reservation expired", {
        description: "This reservation is no longer valid for checkout.",
      });
    }
  }, [reservation?.status, timeLeftMs]);

  const isExpired =
    reservation?.status === "PENDING" && timeLeftMs <= 0;
  const showActions = reservation?.status === "PENDING" && !isExpired;
  const isConfirming = action === "confirm";
  const isCancelling = action === "cancel";

  const handleConfirm = async () => {
    setAction("confirm");
    setExpiredMessage(null);
    setSuccessMessage(null);
    setConfirmError(null);
    setCancelError(null);

    try {
      const response = await fetch(
        `/api/reservations/${reservationId}/confirm`,
        { method: "POST" },
      );
      const data = await response.json();

      if (response.status === 410) {
        const message =
          typeof data.error === "string"
            ? data.error
            : "Reservation has expired";
        setExpiredMessage(message);
        toast.error("Reservation expired", { description: message });
        await fetchReservation({ silent: true });
        return;
      }

      if (!response.ok) {
        setConfirmError(
          typeof data.error === "string"
            ? data.error
            : "Failed to confirm reservation",
        );
        return;
      }

      await fetchReservation({ silent: true });
      setSuccessMessage("Purchase confirmed. Inventory has been deducted.");
      toast.success("Reservation confirmed", {
        description: "Inventory has been deducted.",
      });
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : "Failed to confirm reservation",
      );
    } finally {
      setAction(null);
    }
  };

  const handleCancel = async () => {
    setAction("cancel");
    setSuccessMessage(null);
    setConfirmError(null);
    setCancelError(null);
    setExpiredMessage(null);

    try {
      const response = await fetch(
        `/api/reservations/${reservationId}/release`,
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        setCancelError(
          typeof data.error === "string"
            ? data.error
            : "Failed to cancel reservation",
        );
        return;
      }

      await fetchReservation({ silent: true });
      setSuccessMessage(
        "Reservation cancelled. Reserved stock has been released.",
      );
      toast.success("Reservation released", {
        description: "Reserved stock has been returned to inventory.",
      });
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Failed to cancel reservation",
      );
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-6 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-6 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-medium text-red-800 dark:text-red-200">
          {error ?? "Reservation not found"}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => fetchReservation()}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/30"
          >
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = statusStyles[reservation.status];
  const lineTotal = reservation.product.price * reservation.quantity;

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">Checkout</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {reservation.product.name}
              </h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle.className}`}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {successMessage && reservation.status === "CONFIRMED" && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {successMessage}
            </div>
          )}

          {successMessage && reservation.status === "RELEASED" && (
            <div
              role="status"
              className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {successMessage}
            </div>
          )}

          {confirmError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {confirmError}
            </div>
          )}

          {cancelError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {cancelError}
            </div>
          )}

          {(expiredMessage || isExpired) && reservation.status === "PENDING" && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {expiredMessage ?? "This reservation has expired. Stock may be released by the system."}
            </div>
          )}

          {reservation.status === "PENDING" && !isExpired && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Time remaining
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                {formatCountdown(timeLeftMs)}
              </p>
              <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Expires {formatDateTime(reservation.expiresAt)}
              </p>
            </div>
          )}

          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Warehouse</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {reservation.warehouse.name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Quantity</dt>
              <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {reservation.quantity}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Unit price</dt>
              <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatPrice(reservation.product.price)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                Total
              </dt>
              <dd className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPrice(lineTotal)}
              </dd>
            </div>
          </dl>

          {reservation.status === "CONFIRMED" && !successMessage && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              Your purchase is confirmed. Inventory has been deducted.
            </p>
          )}

          {reservation.status === "RELEASED" && !successMessage && (
            <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              This reservation was cancelled. Reserved stock has been released.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {showActions && (
              <>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirming || isCancelling}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConfirming ? "Confirming…" : "Confirm purchase"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isConfirming || isCancelling}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {isCancelling ? "Cancelling…" : "Cancel reservation"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Reservation ID{" "}
        <span className="font-mono text-zinc-700 dark:text-zinc-400">
          {reservation.id}
        </span>
      </p>
    </div>
  );
}
