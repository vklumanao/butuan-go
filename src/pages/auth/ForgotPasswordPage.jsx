import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { forgotPasswordSchema } from "@/validation/recoverySchemas";
import { requestPasswordReset } from "@/services/authService";
import { devLog, getFriendlyAuthError } from "@/lib/errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { Brand } from "@/components/layout/Brand";
import { ConfigurationNotice } from "@/components/common/ConfigurationNotice";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }) {
    setFormError("");
    const { error } = await requestPasswordReset(email);
    if (error) {
      devLog("Password reset request failed", error);
      setFormError(getFriendlyAuthError(error, "start password recovery"));
      return;
    }
    setSent(true);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
      <div
        className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-accent-300/20 blur-3xl"
        aria-hidden="true"
      />

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40 sm:p-10">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <Brand />
          <Link
            to="/login"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Login
          </Link>
        </div>

        {sent ? (
          <div className="py-5 text-center sm:py-8">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-8 ring-brand-50/60">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <p className="mt-7 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Request received
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Check your recovery instructions
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
              If an account matches that email, password-reset instructions are
              ready. This generic message protects account privacy.
            </p>

            <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm leading-6 text-slate-600">
                Open only the recovery email you requested. Never share your
                reset link or password with another person.
              </p>
            </div>

            {isDemoMode && (
              <Button asChild className="mt-6 w-full" size="lg">
                <Link to="/reset-password">Continue local demo reset</Link>
              </Button>
            )}
            <Button
              asChild
              variant={isDemoMode ? "outline" : "default"}
              className="mt-3 w-full"
              size="lg"
            >
              <Link to="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <div className="pt-8">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <KeyRound className="h-7 w-7" />
            </span>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Account recovery
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Forgot your password?
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Enter the email connected to your ButuanGo account. We will send
              you a secure link to create a new password.
            </p>

            <div className="mt-7">
              {(isDemoMode || !isSupabaseConfigured) && (
                <div className="mb-5">
                  <ConfigurationNotice />
                </div>
              )}
              {formError && (
                <Alert variant="destructive" className="mb-5">
                  {formError}
                </Alert>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
              >
                <FormField
                  id="recoveryEmail"
                  label="Email address"
                  error={errors.email?.message}
                >
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="recoveryEmail"
                      type="email"
                      autoComplete="email"
                      className="pl-10"
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "recoveryEmail-error" : undefined
                      }
                      {...register("email")}
                    />
                  </div>
                </FormField>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    isSubmitting || (!isDemoMode && !isSupabaseConfigured)
                  }
                >
                  {isSubmitting && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Preparing reset…" : "Send recovery link"}
                </Button>
              </form>
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm leading-6 text-slate-600">
                For privacy, the result will look the same whether or not an
                account exists for the email you enter.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
