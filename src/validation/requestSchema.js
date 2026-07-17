import { z } from "zod";
import { FULFILLMENT_TYPES } from "@/lib/requestConstants";

const moneySchema = z.coerce
  .number({ message: "Enter a valid amount." })
  .finite("Enter a valid amount.")
  .min(0, "Amount cannot be negative.")
  .max(9999999999.99, "Amount is too large.");

export const requestLocationSchema = z
  .object({
    fulfillmentType: z.enum(Object.values(FULFILLMENT_TYPES), {
      message: "Choose how this request will be fulfilled.",
    }),
    pickupAddress: z.string().trim().max(300, "Pickup address must be 300 characters or fewer."),
    pickupLandmark: z.string().trim().max(200, "Pickup landmark must be 200 characters or fewer."),
    pickupInstructions: z.string().trim().max(500, "Pickup instructions must be 500 characters or fewer."),
    deliveryAddress: z.string().trim().max(300, "Delivery address must be 300 characters or fewer."),
    deliveryLandmark: z.string().trim().max(200, "Delivery landmark must be 200 characters or fewer."),
    deliveryInstructions: z.string().trim().max(500, "Delivery instructions must be 500 characters or fewer."),
    contactName: z.string().trim().min(2, "Enter a contact name.").max(120, "Contact name must be 120 characters or fewer."),
    contactPhone: z.string().trim().min(7, "Enter a valid contact phone number.").max(30, "Contact phone number must be 30 characters or fewer."),
  })
  .superRefine((values, context) => {
    const needsPickup = [
      FULFILLMENT_TYPES.PICKUP_ONLY,
      FULFILLMENT_TYPES.DELIVERY,
      FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    ].includes(values.fulfillmentType);
    const needsDelivery = [
      FULFILLMENT_TYPES.DELIVERY,
      FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
      FULFILLMENT_TYPES.ON_SITE,
    ].includes(values.fulfillmentType);

    if (needsPickup && values.pickupAddress.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["pickupAddress"],
        message: "Enter the exact pickup address.",
      });
    }
    if (needsDelivery && values.deliveryAddress.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Enter the exact delivery or destination address.",
      });
    }
  });

const requestDetailsSchema = z.object({
  categoryId: z.string().min(1, "Choose a task category."),
  title: z.string().trim().min(5, "Title must be at least 5 characters.").max(120, "Title must be 120 characters or fewer."),
  description: z.string().trim().min(10, "Describe the task in at least 10 characters.").max(2000, "Description must be 2,000 characters or fewer."),
  area: z.string().trim().min(2, "Enter the general service area.").max(160, "Area must be 160 characters or fewer."),
  expenseBudget: moneySchema,
  serviceFee: moneySchema,
  dueAt: z.string().refine((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }, "Due date and time must be in the future."),
});

export const requestSchema = requestDetailsSchema.and(requestLocationSchema);

export const cancelRequestSchema = z.object({
  reason: z.string().trim().min(5, "Explain the cancellation in at least 5 characters.").max(500, "Reason must be 500 characters or fewer."),
});

export const releaseTaskSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explain why you need to release this task.")
    .max(500, "Reason must be 500 characters or fewer."),
});
