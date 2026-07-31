import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardList,
  LoaderCircle,
  Mail,
  Phone,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  CURRENT_TERMS_VERSION,
  getActiveRole,
  getDashboardPath,
  hasCompletedOnboarding,
  USER_ROLES,
} from "@/lib/constants";
import { onboardingSchema } from "@/validation/onboardingSchema";
import { completeAccountOnboarding } from "@/services/profileService";
import { devLog } from "@/lib/errors";
import { getProfileAvatarUrl, getProfileInitials } from "@/lib/profileUtils";
import { Brand } from "@/components/layout/Brand";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function OnboardingPage() {
  const { user, profile, profileError, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName:
        profile?.full_name === "New user" ? "" : profile?.full_name || "",
      phoneNumber: profile?.phone_number || "",
      role: undefined,
      acceptTerms: false,
    },
  });

  if (profile && hasCompletedOnboarding(profile)) {
    return (
      <Navigate to={getDashboardPath(getActiveRole(profile))} replace />
    );
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function onSubmit(values) {
    setFormError("");
    const { data, error } = await completeAccountOnboarding({
      ...values,
      termsVersion: CURRENT_TERMS_VERSION,
    });

    if (error) {
      devLog("Google account onboarding failed", error);
      setFormError(
        error.message ||
          "We could not complete your account. Check your connection and try again.",
      );
      return;
    }

    const updatedProfile = (await refreshProfile()) || data;
    toast.success("Your ButuanGo account is ready.");
    navigate(getDashboardPath(getActiveRole(updatedProfile)), {
      replace: true,
    });
  }

  if (profileError || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-black text-slate-950">
            Account setup is unavailable
          </h1>
          <p className="mt-3 leading-6 text-slate-600">
            {profileError || "Your Google profile could not be loaded."}
          </p>
          <Button className="mt-6" onClick={handleLogout}>
            Return to login
          </Button>
        </div>
      </main>
    );
  }

  const avatarUrl = getProfileAvatarUrl(profile, user);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Use another Google account
          </Button>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="border-b border-brand-100 bg-gradient-to-r from-brand-50 via-white to-accent-50 p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-800 ring-1 ring-brand-200">
              <ShieldCheck className="h-4 w-4" />
              One-time account setup
            </span>
            <div className="mt-5 flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-4 ring-white">
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt={`${profile.full_name} Google profile photo`}
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback>
                  {getProfileInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Complete your ButuanGo account
              </h1>
            </div>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Confirm your contact details and choose where you want to start.
              You can switch between Requestor and Runner later.
            </p>
          </div>

          <form
            className="space-y-7 p-6 sm:p-8"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {formError && <Alert variant="destructive">{formError}</Alert>}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="onboardingFullName"
                label="Full name"
                error={errors.fullName?.message}
              >
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="onboardingFullName"
                    className="pl-10"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.fullName)}
                    {...register("fullName")}
                  />
                </div>
              </FormField>

              <FormField
                id="onboardingPhone"
                label="Phone number"
                error={errors.phoneNumber?.message}
              >
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="onboardingPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="pl-10"
                    placeholder="09XX XXX XXXX"
                    aria-invalid={Boolean(errors.phoneNumber)}
                    {...register("phoneNumber")}
                  />
                </div>
              </FormField>
            </div>

            <div>
              <Label htmlFor="googleEmail">Google email</Label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="googleEmail"
                  className="bg-slate-50 pl-10"
                  value={profile.email || user?.email || ""}
                  readOnly
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Sign-in and account recovery are managed by this Google account.
              </p>
            </div>

            <fieldset>
              <legend className="font-bold text-slate-900">
                Choose your starting workspace
              </legend>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                This controls your first dashboard, not a permanent limitation.
              </p>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    className="mt-4 sm:grid-cols-2"
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={Boolean(errors.role)}
                  >
                    <RadioGroupItem
                      value={USER_ROLES.REQUESTOR}
                      className="min-h-32"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <span className="mt-3 block font-bold text-slate-950">
                        Start as Requestor
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        Post an errand and find a local Runner.
                      </span>
                    </RadioGroupItem>
                    <RadioGroupItem
                      value={USER_ROLES.RUNNER}
                      className="min-h-32"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-100 text-accent-800">
                        <Route className="h-5 w-5" />
                      </span>
                      <span className="mt-3 block font-bold text-slate-950">
                        Start as Runner
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        Browse local errands you can complete.
                      </span>
                    </RadioGroupItem>
                  </RadioGroup>
                )}
              />
              {errors.role && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.role.message}
                </p>
              )}
            </fieldset>

            <div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  {...register("acceptTerms")}
                />
                <span>
                  I accept the{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-700 hover:underline"
                  >
                    Terms of Use
                  </Link>
                  , acknowledge the{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-700 hover:underline"
                  >
                    Privacy Notice
                  </Link>
                  , and have reviewed the{" "}
                  <Link
                    to="/safety"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-700 hover:underline"
                  >
                    Community Safety guidance
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Completing account…" : "Complete account"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
