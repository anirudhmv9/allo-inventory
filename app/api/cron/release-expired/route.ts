import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const releasedCount = await prisma.$transaction(async (tx) => {
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: ReservationStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
      });

      for (const reservation of expiredReservations) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
        });

        if (!inventory) {
          throw new Error(
            `Inventory not found for reservation ${reservation.id}`,
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedUnits: { decrement: reservation.quantity },
          },
        });

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.RELEASED },
        });
      }

      return expiredReservations.length;
    });

    return NextResponse.json({ released: releasedCount });
  } catch (error) {
    console.error("GET /api/cron/release-expired failed:", error);
    return NextResponse.json(
      { error: "Failed to release expired reservations" },
      { status: 500 },
    );
  }
}
