import { z } from "zod";

const reservationFieldsSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  warehouseId: z.string().min(1, "warehouseId is required"),
  quantity: z
    .number()
    .int("quantity must be an integer")
    .positive("quantity must be a positive integer"),
});

export const createReservationSchema = reservationFieldsSchema;

export const confirmReservationSchema = reservationFieldsSchema;

export const releaseReservationSchema = reservationFieldsSchema;

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ConfirmReservationInput = z.infer<typeof confirmReservationSchema>;
export type ReleaseReservationInput = z.infer<typeof releaseReservationSchema>;
