import { z } from "zod";
import { FEEDBACK_CATEGORIES } from "@/lib/feedbackConstants";

export const feedbackSchema = z.object({
  category: z.enum(Object.values(FEEDBACK_CATEGORIES), {
    message: "Choose the type of feedback you want to send.",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Describe your experience using at least 10 characters.")
    .max(2000, "Feedback must be 2,000 characters or fewer."),
  includePageContext: z.boolean(),
});
