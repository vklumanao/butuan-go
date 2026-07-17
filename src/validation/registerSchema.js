import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";
import { passwordSchema } from "@/validation/passwordRules";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Name must be 100 characters or fewer."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number.")
      .max(30, "Phone number is too long."),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum([USER_ROLES.REQUESTOR, USER_ROLES.RUNNER], {
      message: "Choose the workspace you want to start with.",
    }),
    acceptTerms: z.literal(true, {
      message: "You must accept the terms to continue.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
