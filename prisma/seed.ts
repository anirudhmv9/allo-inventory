import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data...");

  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  console.log("Seeding warehouses...");
  const [eastCoast, midwest] = await prisma.warehouse.createManyAndReturn({
    data: [
      { name: "East Coast Fulfillment Center" },
      { name: "Midwest Distribution Hub" },
    ],
  });

  console.log("Seeding products...");
  const [keyboard, chair, monitor] = await prisma.product.createManyAndReturn({
    data: [
      { name: "Wireless Mechanical Keyboard", price: 129.99 },
      { name: "Ergonomic Office Chair", price: 349.0 },
      { name: '27" 4K Monitor', price: 499.99 },
    ],
  });

  console.log("Seeding inventory...");
  await prisma.inventory.createMany({
    data: [
      {
        productId: keyboard.id,
        warehouseId: eastCoast.id,
        totalUnits: 120,
        reservedUnits: 0,
      },
      {
        productId: keyboard.id,
        warehouseId: midwest.id,
        totalUnits: 85,
        reservedUnits: 0,
      },
      {
        productId: chair.id,
        warehouseId: eastCoast.id,
        totalUnits: 45,
        reservedUnits: 0,
      },
      {
        productId: chair.id,
        warehouseId: midwest.id,
        totalUnits: 32,
        reservedUnits: 0,
      },
      {
        productId: monitor.id,
        warehouseId: eastCoast.id,
        totalUnits: 28,
        reservedUnits: 0,
      },
      {
        productId: monitor.id,
        warehouseId: midwest.id,
        totalUnits: 18,
        reservedUnits: 0,
      },
    ],
  });

  console.log("Seed complete.");
  console.log({
    warehouses: 2,
    products: 3,
    inventoryRecords: 6,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
