import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { resetPasswordSchema } from "@/validation/recoverySchemas";
import { changePassword } from "@/services/authService";
import { hasDemoRecoverySession } from "@/services/demoService";
import { useAuth } from "@/hooks/useAuth";
import { devLog, getFriendlyAuthError } from "@/lib/errors";
import { isDemoMode } from "@/lib/supabase";
import { Brand } from "@/components/layout/Brand";
import {
  PasswordMatchIndicator,
  PasswordRequirements,
} from "@/components/auth/PasswordRequirements";
import { FormField } from "@/components/common/FormField";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const { user, loading, signOut, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const password = useWatch({ control, name: "password" }) || "";
  const confirmPassword =
    useWatch({ control, name: "confirmPassword" }) || "";

  if (loading) return <FullPageLoader message="Checking recovery session…" />;

  const canReset = isDemoMode
    ? hasDemoRecoverySession()
    : Boolean(user && isPasswordRecovery);

  async function onSubmit({ password }) {
    setFormError("");
    const { error } = await changePassword(password);
    if (error) {
      devLog("Password update failed", error);
      setFormError(getFriendlyAuthError(error, "update your password"));
      return;
    }
    await signOut();
    navigate("/login", { replace: true, state: { passwordReset: true } });
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

        {!canReset ? (
          <div className="py-5 text-center sm:py-8">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/60">
              <CircleAlert className="h-8 w-8" />
            </span>
            <p className="mt-7 text-sm font-bold uppercase tracking-[0.14em] text-red-600">
              Recovery unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              This reset link cannot be used
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
              The recovery link may be missing, invalid, expired, or already
              used. Request a new link to continue safely.
            </p>
            <Alert variant="destructive" className="mt-6 text-left">
              Password-reset links are temporary. Use only the most recent link
              sent to your account email.
            </Alert>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/forgot-password">Request another recovery link</Link>
            </Button>
            <Button asChild variant="outline" className="mt-3 w-full" size="lg">
              <Link to="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <div className="pt-8">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <KeyRound className="h-7 w-7" />
            </span>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Secure your account
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Create a new password
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Use at least eight characters with uppercase and lowercase
              letters and a number. Choose a password you do not use for
              another account.
            </p>

            <div className="mt-7">
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
                  id="newPassword"
                  label="New password"
                  error={errors.password?.message}
                >
                  <>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="px-10"
                        placeholder="Enter a new password"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={
                          [
                            password ? "newPassword-requirements" : null,
                            errors.password ? "newPassword-error" : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                        aria-label={
                          showPassword ? "Hide passwords" : "Show passwords"
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <PasswordRequirements
                      id="newPassword-requirements"
                      password={password}
                    />
                  </>
                </FormField>

                <FormField
                  id="confirmNewPassword"
                  label="Confirm new password"
                  error={errors.confirmPassword?.message}
                >
                  <>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <Input
                        id="confirmNewPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pl-10"
                        placeholder="Repeat your new password"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={
                          [
                            confirmPassword
                              ? "confirmNewPassword-match"
                              : null,
                            errors.confirmPassword
                              ? "confirmNewPassword-error"
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        {...register("confirmPassword")}
                      />
                    </div>
                    <PasswordMatchIndicator
                      id="confirmNewPassword-match"
                      password={password}
                      confirmPassword={confirmPassword}
                    />
                  </>
                </FormField>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Updating password…" : "Update password"}
                </Button>
              </form>
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm leading-6 text-slate-600">
                After updating your password, you will be signed out and asked
                to log in again with the new password.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
