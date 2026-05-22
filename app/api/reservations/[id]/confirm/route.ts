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

class ReservationExpiredError extends Error {
  constructor() {
    super("Reservation has expired");
    this.name = "ReservationExpiredError";
  }
}

class ReservationAlreadyConfirmedError extends Error {
  constructor() {
    super("Reservation is already confirmed");
    this.name = "ReservationAlreadyConfirmedError";
  }
}

function validateReservation(reservation: {
  status: ReservationStatus;
  expiresAt: Date;
}): void {
  if (reservation.status === ReservationStatus.RELEASED) {
    throw new ReservationReleasedError();
  }

  if (reservation.status === ReservationStatus.CONFIRMED) {
    throw new ReservationAlreadyConfirmedError();
  }

  if (reservation.expiresAt < new Date()) {
    throw new ReservationExpiredError();
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
      validateReservation(reservation);
    } catch (error) {
      if (error instanceof ReservationReleasedError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof ReservationAlreadyConfirmedError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof ReservationExpiredError) {
        return NextResponse.json({ error: error.message }, { status: 410 });
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

      validateReservation(current);

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
          totalUnits: { decrement: current.quantity },
          reservedUnits: { decrement: current.quantity },
        },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CONFIRMED },
      });
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ReservationReleasedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReservationAlreadyConfirmedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReservationExpiredError) {
      return NextResponse.json({ error: error.message }, { status: 410 });
    }

    if (error instanceof Error && error.message === "Inventory not found") {
      return NextResponse.json(
        { error: "Inventory not found for reservation" },
        { status: 404 },
      );
    }

    console.error("POST /api/reservations/[id]/confirm failed:", error);
    return NextResponse.json(
      { error: "Failed to confirm reservation" },
      { status: 500 },
    );
  }
}
