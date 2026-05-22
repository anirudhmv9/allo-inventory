import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const productsWithStock = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      inventories: product.inventories.map((inventory) => ({
        id: inventory.id,
        totalUnits: inventory.totalUnits,
        reservedUnits: inventory.reservedUnits,
        availableStock: inventory.totalUnits - inventory.reservedUnits,
        warehouse: {
          id: inventory.warehouse.id,
          name: inventory.warehouse.name,
        },
      })),
    }));

    return NextResponse.json(productsWithStock);
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
