import { redis } from "@/lib/redis";

const LOCK_TTL_SECONDS = 30;

export function reservationLockKey(
  productId: string,
  warehouseId: string,
): string {
  return `reservation:${productId}:${warehouseId}`;
}

export async function acquireReservationLock(
  lockKey: string,
): Promise<boolean> {
  const result = await redis.set(lockKey, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });
  return result === "OK";
}

export async function releaseReservationLock(lockKey: string): Promise<void> {
  await redis.del(lockKey);
}
