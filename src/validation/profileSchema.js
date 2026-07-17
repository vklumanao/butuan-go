import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Name must be 100 characters or fewer."),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long."),
});
