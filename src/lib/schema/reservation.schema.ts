import { z } from "zod";

// Create Reservations Schema & Type
export const CreateReservationSchema = z.object({
  body: z.object({
    user_ids: z.string().array(),
    time: z.date(),
    restaurant_id: z.string(),
  }),
});
export type CreateReservationSchema = z.infer<
  typeof CreateReservationSchema
>["body"];

// Delete Reservations Schema & Type
export const DeleteReservationSchema = z.object({
  body: z.object({
    user_id: z.string(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
export type DeleteReservationSchema = z.infer<typeof DeleteReservationSchema>;
