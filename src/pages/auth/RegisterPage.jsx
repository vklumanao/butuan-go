import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  HandHeart,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MailCheck,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "@/validation/registerSchema";
import { USER_ROLES, getDashboardPath } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { getFriendlyAuthError, devLog } from "@/lib/errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { Brand } from "@/components/layout/Brand";
import {
  PasswordMatchIndicator,
  PasswordRequirements,
} from "@/components/auth/PasswordRequirements";
import { ConfigurationNotice } from "@/components/common/ConfigurationNotice";
import { FormField } from "@/components/common/FormField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function RegisterBrandPanel() {
  return (
    <section className="relative hidden h-screen overflow-hidden bg-brand-900 px-12 py-10 text-white lg:sticky lg:top-0 lg:flex lg:flex-col xl:px-20 xl:py-14">
      <div
        className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute right-12 top-12 h-40 w-40 rounded-full border border-white/10"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <span className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-xl shadow-slate-950/15">
          <Brand />
        </span>
      </div>

      <div className="relative z-10 my-auto max-w-xl py-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-brand-100 backdrop-blur-sm">
          <MapPin className="h-4 w-4" />
          Built for local everyday tasks
        </div>
        <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
          Start with the workspace you need today.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-brand-100 xl:text-lg">
          Create one ButuanGo account, choose your starting workspace, and
          switch between Requestor and Runner whenever needed.
        </p>

        <ul className="mt-8 space-y-4" aria-label="Account benefits">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-400/20 text-brand-100">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold">One account, two workspaces</p>
              <p className="mt-1 text-sm leading-6 text-brand-100/80">
                Your profile, addresses, requests, tasks, and notifications stay
                connected.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-400/20 text-accent-200">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold">Switch when your day changes</p>
              <p className="mt-1 text-sm leading-6 text-brand-100/80">
                Post an errand now, then help with a local task later.
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-accent-300/25 bg-accent-400/10 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-200" />
          <p className="text-sm leading-6 text-brand-50">
            Review every task carefully. Payments happen in person after the
            Requestor and Runner meet.
          </p>
        </div>
      </div>

      <p className="relative z-10 text-xs text-brand-200/70">
        ButuanGo local task marketplace
      </p>
    </section>
  );
}

function MobileRegisterHeader() {
  return (
    <div className="mb-10 flex items-center justify-between lg:hidden">
      <Brand />
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>
    </div>
  );
}

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      acceptTerms: false,
    },
  });
  const password = useWatch({ control, name: "password" }) || "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) || "";

  async function onSubmit(values) {
    setFormError("");
    const { data, error } = await signUp(values);
    if (error) {
      devLog("Registration failed", error);
      setFormError(getFriendlyAuthError(error, "create your account"));
      return;
    }
    if (data.session) {
      navigate(getDashboardPath(values.role), { replace: true });
      return;
    }
    setConfirmationEmail(values.email.trim().toLowerCase());
  }

  if (confirmationEmail) {
    return (
      <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
        <RegisterBrandPanel />
        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-md">
            <MobileRegisterHeader />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/50 sm:p-8">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-8 ring-brand-50/60">
                <MailCheck className="h-8 w-8" />
              </span>
              <h1 className="mt-7 text-3xl font-black tracking-tight text-slate-950">
                Check your inbox
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                We sent a confirmation link to
                <span className="mt-1 block break-all font-bold text-slate-900">
                  {confirmationEmail}
                </span>
              </p>
              <Alert className="mt-6 text-left">
                <AlertTitle>One more step</AlertTitle>
                <AlertDescription>
                  Verify your email, then return to ButuanGo and log in. If you
                  do not see the message, check your spam folder.
                </AlertDescription>
              </Alert>
              <Button asChild className="mt-6 w-full" size="lg">
                <Link to="/login">Go to login</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(38rem,1.15fr)]">
      <RegisterBrandPanel />

      <section className="flex min-h-screen justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        <div className="w-full max-w-2xl">
          <MobileRegisterHeader />

          <Link
            to="/"
            className="mb-8 hidden w-fit items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4 lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Join ButuanGo
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter your details and choose which workspace you want to open
              first.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
            {(isDemoMode || !isSupabaseConfigured) && (
              <div className="mb-6">
                <ConfigurationNotice />
              </div>
            )}
            {formError && (
              <Alert variant="destructive" className="mb-6">
                {formError}
              </Alert>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  id="fullName"
                  label="Full name"
                  error={errors.fullName?.message}
                >
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="fullName"
                      autoComplete="name"
                      className="pl-10"
                      placeholder="Juan Dela Cruz"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={
                        errors.fullName ? "fullName-error" : undefined
                      }
                      {...register("fullName")}
                    />
                  </div>
                </FormField>

                <FormField
                  id="phoneNumber"
                  label="Phone number"
                  error={errors.phoneNumber?.message}
                >
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      className="pl-10"
                      placeholder="09XX XXX XXXX"
                      aria-invalid={Boolean(errors.phoneNumber)}
                      aria-describedby={
                        errors.phoneNumber ? "phoneNumber-error" : undefined
                      }
                      {...register("phoneNumber")}
                    />
                  </div>
                </FormField>
              </div>

              <FormField
                id="registerEmail"
                label="Email address"
                error={errors.email?.message}
              >
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="registerEmail"
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? "registerEmail-error" : undefined
                    }
                    {...register("email")}
                  />
                </div>
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  id="registerPassword"
                  label="Password"
                  error={errors.password?.message}
                >
                  <>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <Input
                        id="registerPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="px-10"
                        placeholder="Create a password"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={
                          [
                            password ? "registerPassword-requirements" : null,
                            errors.password ? "registerPassword-error" : null,
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
                      id="registerPassword-requirements"
                      password={password}
                    />
                  </>
                </FormField>

                <FormField
                  id="confirmPassword"
                  label="Confirm password"
                  error={errors.confirmPassword?.message}
                >
                  <>
                    <div className="relative">
                      <LockKeyhole
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pl-10"
                        placeholder="Repeat your password"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={
                          [
                            confirmPassword ? "confirmPassword-match" : null,
                            errors.confirmPassword
                              ? "confirmPassword-error"
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        {...register("confirmPassword")}
                      />
                    </div>
                    <PasswordMatchIndicator
                      id="confirmPassword-match"
                      password={password}
                      confirmPassword={confirmPassword}
                    />
                  </>
                </FormField>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-800">
                  Choose your starting workspace
                </legend>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This only determines where you start. You can switch between
                  Requestor and Runner anytime after signing in.
                </p>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      className="mt-3 sm:grid-cols-2"
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={Boolean(errors.role)}
                      aria-describedby={errors.role ? "role-error" : undefined}
                    >
                      <RadioGroupItem
                        value={USER_ROLES.REQUESTOR}
                        className="min-h-36"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                          <ClipboardList className="h-5 w-5" />
                        </span>
                        <span className="mt-4 block font-bold text-slate-950">
                          Requestor
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                          Post errands and find someone who can help complete
                          them.
                        </span>
                      </RadioGroupItem>
                      <RadioGroupItem
                        value={USER_ROLES.RUNNER}
                        className="min-h-36"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-100 text-accent-700">
                          <HandHeart className="h-5 w-5" />
                        </span>
                        <span className="mt-4 block font-bold text-slate-950">
                          Runner
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                          Browse local tasks and earn by completing errands.
                        </span>
                      </RadioGroupItem>
                    </RadioGroup>
                  )}
                />
                {errors.role && (
                  <p id="role-error" className="mt-2 text-sm text-red-600">
                    {errors.role.message}
                  </p>
                )}
              </fieldset>

              <div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                    aria-invalid={Boolean(errors.acceptTerms)}
                    aria-describedby={
                      errors.acceptTerms ? "acceptTerms-error" : undefined
                    }
                    {...register("acceptTerms")}
                  />
                  <Label
                    htmlFor="acceptTerms"
                    className="font-normal leading-6 text-slate-600"
                  >
                    I accept the{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      terms of use
                    </Link>{" "}
                    and acknowledge the{" "}
                    <Link
                      to="/safety"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      community safety reminder
                    </Link>
                    .
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p
                    id="acceptTerms-error"
                    className="mt-2 text-sm text-red-600"
                  >
                    {errors.acceptTerms.message}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                type="submit"
                disabled={
                  isSubmitting || (!isDemoMode && !isSupabaseConfigured)
                }
              >
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </div>

          <p className="mt-7 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              className="rounded font-bold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              to="/login"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
