import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "@/validation/loginSchema";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/services/profileService";
import { getActiveRole, getDashboardPath } from "@/lib/constants";
import { getFriendlyAuthError, devLog } from "@/lib/errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { Brand } from "@/components/layout/Brand";
import { ConfigurationNotice } from "@/components/common/ConfigurationNotice";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    setFormError("");
    const { data, error } = await signIn(values);
    if (error) {
      devLog("Login failed", error);
      setFormError(getFriendlyAuthError(error, "sign you in"));
      return;
    }

    const { data: userProfile, error: profileError } = await getProfile(
      data.user.id,
    );
    if (profileError || !userProfile) {
      devLog("Profile missing after login", profileError);
      setFormError(
        "You're signed in, but your profile could not be loaded. Please contact support.",
      );
      return;
    }

    const requestedPath = location.state?.from?.pathname;
    const activeRole = getActiveRole(userProfile);
    const ownPrefix = `/${activeRole}/`;
    navigate(
      requestedPath?.startsWith(ownPrefix)
        ? requestedPath
        : getDashboardPath(activeRole),
      { replace: true },
    );
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-900 px-12 py-10 text-white lg:flex lg:flex-col xl:px-20 xl:py-14">
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

        <div className="relative z-10 my-auto max-w-xl py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-brand-100 backdrop-blur-sm">
            <MapPin className="h-4 w-4" />
            Local help around Butuan
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            One account for getting help and helping others.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-brand-100 xl:text-lg">
            Post everyday errands or switch to Runner mode when you are ready to
            complete local tasks.
          </p>

          <ul className="mt-8 grid gap-3" aria-label="ButuanGo benefits">
            <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-400/20 text-brand-100">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold">Manage local requests</p>
                <p className="mt-0.5 text-sm text-brand-100/80">
                  Keep request details and progress in one place.
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-400/20 text-accent-200">
                <ArrowLeftRight className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold">Switch workspaces anytime</p>
                <p className="mt-0.5 text-sm text-brand-100/80">
                  Use ButuanGo as a Requestor or Runner with one account.
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-300/25 bg-accent-400/10 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-200" />
            <p className="text-sm leading-6 text-brand-50">
              Review task details carefully and complete payments in person only
              after meeting your task participant.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-brand-200/70">
          ButuanGo local task marketplace
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
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

          <Link
            to="/"
            className="mb-8 hidden w-fit items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4 lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Log in to Butuan<span className="text-brand-600">Go</span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Continue to your last active Requestor or Runner workspace.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
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
            {location.state?.passwordReset && (
              <Alert className="mb-5 border-brand-200 bg-brand-50 text-brand-900">
                Your password was updated. You can now log in with the new
                password.
              </Alert>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <FormField
                id="email"
                label="Email address"
                error={errors.email?.message}
              >
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                  />
                </div>
              </FormField>

              <FormField
                id="password"
                label="Password"
                error={errors.password?.message}
              >
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="px-10"
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
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
              </FormField>

              <div className="flex justify-end">
                <Link
                  className="rounded text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
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
                {isSubmitting ? "Signing in…" : "Log in"}
              </Button>
            </form>
          </div>

          <p className="mt-7 text-center text-sm text-slate-600">
            New to ButuanGo?{" "}
            <Link
              className="rounded font-bold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              to="/register"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
