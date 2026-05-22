import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  acquireReservationLock,
  releaseReservationLock,
  reservationLockKey,
} from "@/lib/reservation-lock";
import { createReservationSchema } from "@/lib/validators";

const RESERVATION_TTL_MS = 10 * 60 * 1000;

class InsufficientStockError extends Error {
  constructor() {
    super("Insufficient stock");
    this.name = "InsufficientStockError";
  }
}

export async function POST(request: Request) {
  let lockKey: string | null = null;
  let lockAcquired = false;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;
    lockKey = reservationLockKey(productId, warehouseId);

    lockAcquired = await acquireReservationLock(lockKey);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Could not acquire lock, please retry" },
        { status: 503 },
      );
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
      });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      const availableStock = inventory.totalUnits - inventory.reservedUnits;
      if (availableStock < quantity) {
        throw new InsufficientStockError();
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedUnits: { increment: quantity } },
      });

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
      });
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "Inventory not found") {
      return NextResponse.json(
        { error: "Inventory not found for product and warehouse" },
        { status: 404 },
      );
    }

    console.error("POST /api/reservations failed:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 },
    );
  } finally {
    if (lockAcquired && lockKey) {
      try {
        await releaseReservationLock(lockKey);
      } catch (error) {
        console.error("Failed to release reservation lock:", error);
      }
    }
  }
}
