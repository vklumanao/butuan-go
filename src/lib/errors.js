export function getFriendlyAuthError(error, action = "authenticate") {
  if (!error) return `We could not ${action}. Please try again.`;
  const message = error.message?.toLowerCase() || "";
  if (
    error.code === "email_address_invalid" ||
    (message.includes("email address") && message.includes("invalid"))
  )
    return "That email address could not be accepted. Use a real email inbox that you can access.";
  if (
    error.code === "email_address_not_authorized" ||
    message.includes("email address not authorized")
  )
    return "Supabase cannot send a confirmation to that address yet. Use an email from your Supabase project team or configure custom SMTP.";
  if (
    error.code === "email_provider_disabled" ||
    message.includes("email signups are disabled")
  )
    return "Email registration is currently disabled. Enable the Email provider in Supabase Authentication settings.";
  if (
    error.code === "signup_disabled" ||
    message.includes("signups are disabled")
  )
    return "New account registration is currently disabled in Supabase Authentication settings.";
  if (message.includes("invalid login credentials"))
    return "The email or password you entered is incorrect.";
  if (message.includes("email not confirmed"))
    return "Please verify your email before signing in.";
  if (
    message.includes("already registered") ||
    message.includes("user already exists")
  )
    return "An account with this email already exists. Try signing in instead.";
  if (
    message.includes("password") &&
    (message.includes("weak") || message.includes("least"))
  )
    return "Please choose a stronger password with at least 8 characters.";
  if (message.includes("fetch") || message.includes("network"))
    return "We could not reach the server. Check your connection and try again.";
  return `We could not ${action}. Please try again in a moment.`;
}

export function devLog(label, error) {
  if (import.meta.env.DEV) console.error(label, error);
}
