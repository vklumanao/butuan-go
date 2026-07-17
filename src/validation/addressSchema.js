import { z } from "zod";

export const savedAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Enter a label such as Home or Work.")
    .max(50, "Label must be 50 characters or fewer."),
  recipientName: z
    .string()
    .trim()
    .min(2, "Enter the recipient or contact name.")
    .max(120, "Name must be 120 characters or fewer."),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number must be 30 characters or fewer."),
  fullAddress: z
    .string()
    .trim()
    .min(5, "Enter the complete address.")
    .max(300, "Address must be 300 characters or fewer."),
  landmark: z
    .string()
    .trim()
    .max(200, "Landmark must be 200 characters or fewer."),
  instructions: z
    .string()
    .trim()
    .max(500, "Instructions must be 500 characters or fewer."),
  isDefault: z.boolean(),
});
