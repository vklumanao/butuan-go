import { supabase } from "@/lib/supabase";

export async function submitUserFeedback({
  category,
  message,
  pagePath = null,
  pageTitle = null,
}) {
  return supabase.rpc("submit_user_feedback", {
    p_category: category,
    p_message: message.trim(),
    p_page_path: pagePath,
    p_page_title: pageTitle,
  });
}
