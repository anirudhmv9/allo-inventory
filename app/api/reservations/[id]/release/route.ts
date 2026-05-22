import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

class ReservationNotFoundError extends Error {
  constructor() {
    super("Reservation not found");
    this.name = "ReservationNotFoundError";
  }
}

class ReservationReleasedError extends Error {
  constructor() {
    super("Reservation has already been released");
    this.name = "ReservationReleasedError";
  }
}

class ReservationAlreadyConfirmedError extends Error {
  constructor() {
    super("Reservation is already confirmed");
    this.name = "ReservationAlreadyConfirmedError";
  }
}

function validateReservationForRelease(reservation: {
  status: ReservationStatus;
}): void {
  if (reservation.status === ReservationStatus.CONFIRMED) {
    throw new ReservationAlreadyConfirmedError();
  }

  if (reservation.status === ReservationStatus.RELEASED) {
    throw new ReservationReleasedError();
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    try {
      validateReservationForRelease(reservation);
    } catch (error) {
      if (error instanceof ReservationAlreadyConfirmedError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof ReservationReleasedError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const updatedReservation = await prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({
        where: { id },
      });

      if (!current) {
        throw new ReservationNotFoundError();
      }

      validateReservationForRelease(current);

      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: current.productId,
            warehouseId: current.warehouseId,
          },
        },
      });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedUnits: { decrement: current.quantity },
        },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.RELEASED },
      });
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ReservationAlreadyConfirmedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReservationReleasedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Inventory not found") {
      return NextResponse.json(
        { error: "Inventory not found for reservation" },
        { status: 404 },
      );
    }

    console.error("POST /api/reservations/[id]/release failed:", error);
    return NextResponse.json(
      { error: "Failed to release reservation" },
      { status: 500 },
    );
  }
}
