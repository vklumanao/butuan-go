import { z } from "zod";
import {
  FULFILLMENT_TYPES,
  PAYMENT_ARRANGEMENTS,
  PAYMENT_PAYER_TYPES,
  REQUEST_SCENARIO_RULES,
  REQUEST_SCENARIOS,
} from "@/lib/requestConstants";
import {
  getHandoffContact,
  getLocationRequirements,
} from "@/lib/requestScenarioUtils";

const moneySchema = z.coerce
  .number({ message: "Enter a valid amount." })
  .finite("Enter a valid amount.")
  .min(0, "Amount cannot be negative.")
  .max(9999999999.99, "Amount is too large.");

const optionalCoordinateSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}, z.number().finite("Choose a valid map location.").nullable());

const booleanSchema = z.preprocess((value) => {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }
  return value;
}, z.boolean());

const contactNameSchema = z
  .string()
  .trim()
  .max(120, "Contact name must be 120 characters or fewer.");
const contactPhoneSchema = z
  .string()
  .trim()
  .max(30, "Contact phone number must be 30 characters or fewer.");

function addCoordinateIssues(
  values,
  context,
  latitudeKey,
  longitudeKey,
  label,
) {
  const latitude = values[latitudeKey];
  const longitude = values[longitudeKey];
  const hasLatitude = latitude !== null;
  const hasLongitude = longitude !== null;

  if (!hasLatitude && !hasLongitude) {
    context.addIssue({
      code: "custom",
      path: [latitudeKey],
      message: `Choose the exact ${label} point on the map.`,
    });
    return;
  }
  if (hasLatitude !== hasLongitude) {
    context.addIssue({
      code: "custom",
      path: [latitudeKey],
      message: `The exact ${label} point is incomplete. Choose it again.`,
    });
    return;
  }
  if (latitude < -90 || latitude > 90) {
    context.addIssue({
      code: "custom",
      path: [latitudeKey],
      message: "Latitude must be between -90 and 90.",
    });
  }
  if (longitude < -180 || longitude > 180) {
    context.addIssue({
      code: "custom",
      path: [longitudeKey],
      message: "Longitude must be between -180 and 180.",
    });
  }
}

export const requestLocationSchema = z
  .object({
    scenarioType: z.enum(Object.values(REQUEST_SCENARIOS), {
      message: "Choose what kind of request you are creating.",
    }),
    fulfillmentType: z.enum(Object.values(FULFILLMENT_TYPES), {
      message: "Choose how this request will be fulfilled.",
    }),
    area: z
      .string()
      .trim()
      .min(
        2,
        "Choose the primary map location so we can identify its general area.",
      )
      .max(160, "Area must be 160 characters or fewer."),
    pickupAddress: z
      .string()
      .trim()
      .max(300, "Pickup address must be 300 characters or fewer."),
    pickupLandmark: z
      .string()
      .trim()
      .max(200, "Pickup landmark must be 200 characters or fewer."),
    pickupInstructions: z
      .string()
      .trim()
      .max(500, "Pickup instructions must be 500 characters or fewer."),
    deliveryAddress: z
      .string()
      .trim()
      .max(300, "Destination address must be 300 characters or fewer."),
    deliveryLandmark: z
      .string()
      .trim()
      .max(200, "Destination landmark must be 200 characters or fewer."),
    deliveryInstructions: z
      .string()
      .trim()
      .max(500, "Destination instructions must be 500 characters or fewer."),
    pickupContactName: contactNameSchema,
    pickupContactPhone: contactPhoneSchema,
    destinationContactName: contactNameSchema,
    destinationContactPhone: contactPhoneSchema,
    contactIsRequestor: booleanSchema,
    requestorPresentAtHandoff: booleanSchema,
    exactLatitude: optionalCoordinateSchema,
    exactLongitude: optionalCoordinateSchema,
    destinationExactLatitude: optionalCoordinateSchema,
    destinationExactLongitude: optionalCoordinateSchema,
  })
  .superRefine((values, context) => {
    const { needsPickup, needsDestination } = getLocationRequirements(
      values.fulfillmentType,
    );

    if (needsPickup && values.pickupAddress.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["pickupAddress"],
        message: "Enter the exact pickup address.",
      });
    }
    if (needsDestination && values.deliveryAddress.length < 5) {
      context.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Enter the exact delivery or task destination.",
      });
    }
    if (needsPickup && values.pickupContactName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["pickupContactName"],
        message: "Enter the pickup contact name.",
      });
    }
    if (needsPickup && values.pickupContactPhone.length < 7) {
      context.addIssue({
        code: "custom",
        path: ["pickupContactPhone"],
        message: "Enter a valid pickup contact phone number.",
      });
    }
    if (needsDestination && values.destinationContactName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["destinationContactName"],
        message: "Enter the recipient or on-site contact name.",
      });
    }
    if (needsDestination && values.destinationContactPhone.length < 7) {
      context.addIssue({
        code: "custom",
        path: ["destinationContactPhone"],
        message: "Enter a valid recipient or on-site contact phone number.",
      });
    }

    addCoordinateIssues(
      values,
      context,
      "exactLatitude",
      "exactLongitude",
      needsPickup ? "pickup" : "task",
    );
    if (
      needsPickup &&
      needsDestination &&
      values.fulfillmentType !== FULFILLMENT_TYPES.ON_SITE
    ) {
      addCoordinateIssues(
        values,
        context,
        "destinationExactLatitude",
        "destinationExactLongitude",
        "delivery",
      );
    }
  });

const requestDetailsSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a task category."),
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters.")
      .max(120, "Title must be 120 characters or fewer."),
    description: z
      .string()
      .trim()
      .min(10, "Describe the task in at least 10 characters.")
      .max(2000, "Description must be 2,000 characters or fewer."),
    expenseBudget: moneySchema,
    serviceFee: moneySchema.refine((value) => value > 0, {
      message: "Enter a Runner service fee greater than zero.",
    }),
    paymentArrangement: z.enum(Object.values(PAYMENT_ARRANGEMENTS), {
      message: "Choose whether the Runner needs to pay for anything.",
    }),
    payerType: z.enum(Object.values(PAYMENT_PAYER_TYPES), {
      message: "Choose who will pay the Runner.",
    }),
    payerName: contactNameSchema,
    payerPhone: contactPhoneSchema,
    merchantReference: z
      .string()
      .trim()
      .max(160, "Merchant reference must be 160 characters or fewer."),
    dueAt: z.string().refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    }, "Due date and time must be in the future."),
  })
  .superRefine((values, context) => {
    if (
      values.paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE &&
      values.expenseBudget !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["expenseBudget"],
        message: "No purchase is needed, so the expense must remain at zero.",
      });
    }
    if (
      values.paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE &&
      values.expenseBudget <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["expenseBudget"],
        message: "Enter the maximum amount the Runner may spend.",
      });
    }
    if (
      values.paymentArrangement === PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID &&
      values.merchantReference.length < 2
    ) {
      context.addIssue({
        code: "custom",
        path: ["merchantReference"],
        message: "Enter the prepaid merchant or order reference.",
      });
    }
    if (values.payerType === PAYMENT_PAYER_TYPES.RECIPIENT) {
      if (values.payerName.length < 2) {
        context.addIssue({
          code: "custom",
          path: ["payerName"],
          message: "Enter the name of the task contact who will pay.",
        });
      }
      if (values.payerPhone.length < 7) {
        context.addIssue({
          code: "custom",
          path: ["payerPhone"],
          message:
            "Enter a valid phone number for the task contact who will pay.",
        });
      }
    }
  });

export const requestSchema = requestDetailsSchema
  .and(requestLocationSchema)
  .superRefine((values, context) => {
    const rule = REQUEST_SCENARIO_RULES[values.scenarioType];
    if (!rule) return;

    if (
      values.scenarioType !== REQUEST_SCENARIOS.CUSTOM &&
      values.fulfillmentType !== rule.fulfillmentType
    ) {
      context.addIssue({
        code: "custom",
        path: ["fulfillmentType"],
        message: "This location setup does not match the selected scenario.",
      });
    }
    if (!rule.allowedPaymentArrangements.includes(values.paymentArrangement)) {
      context.addIssue({
        code: "custom",
        path: ["paymentArrangement"],
        message: "This payment setup does not match the selected scenario.",
      });
    }
    if (
      values.fulfillmentType === FULFILLMENT_TYPES.PURCHASE_AND_DELIVER &&
      values.paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE
    ) {
      context.addIssue({
        code: "custom",
        path: ["paymentArrangement"],
        message:
          "A buy-and-deliver task needs prepaid purchase or Runner advance.",
      });
    }

    const handoffContact = getHandoffContact(values);
    if (
      values.payerType === PAYMENT_PAYER_TYPES.RECIPIENT &&
      (values.payerName.trim() !== handoffContact.name.trim() ||
        values.payerPhone.trim() !== handoffContact.phone.trim())
    ) {
      context.addIssue({
        code: "custom",
        path: ["payerType"],
        message:
          "The selected task contact must be the person who pays at handoff.",
      });
    }
    if (
      values.payerType === PAYMENT_PAYER_TYPES.REQUESTOR &&
      !values.contactIsRequestor &&
      !values.requestorPresentAtHandoff
    ) {
      context.addIssue({
        code: "custom",
        path: ["requestorPresentAtHandoff"],
        message:
          "Choose the task contact as payer, or confirm that you will be present at handoff.",
      });
    }
  });

export const cancelRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explain the cancellation in at least 5 characters.")
    .max(500, "Reason must be 500 characters or fewer."),
});

export const releaseTaskSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explain why you need to release this task.")
    .max(500, "Reason must be 500 characters or fewer."),
});
