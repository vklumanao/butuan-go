import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";

export const onboardingSchema = z.object({
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
  role: z.enum([USER_ROLES.REQUESTOR, USER_ROLES.RUNNER], {
    message: "Choose the workspace you want to start with.",
  }),
  acceptTerms: z.literal(true, {
    message: "Accept the Terms, Privacy Notice, and Safety guidance to continue.",
  }),
});
