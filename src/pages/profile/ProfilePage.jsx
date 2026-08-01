import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { profileSchema } from "@/validation/profileSchema";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/services/profileService";
import { getActiveRole, ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { getProfileAvatarUrl, getProfileInitials } from "@/lib/profileUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";
import { SavedAddressManager } from "@/components/addresses/SavedAddressManager";
import { AccountDeletionPanel } from "@/components/profile/AccountDeletionPanel";

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name,
      phoneNumber: profile.phone_number || "",
    },
  });
  useEffect(() => {
    reset({
      fullName: profile.full_name,
      phoneNumber: profile.phone_number || "",
    });
  }, [profile, reset]);
  async function onSubmit(values) {
    setFormError("");
    const { error } = await updateProfile(user.id, values);
    if (error) {
      devLog("Profile update failed", error);
      setFormError(
        "We could not save your profile. Check your connection and try again.",
      );
      return;
    }
    await refreshProfile();
    toast.success("Your profile has been updated.");
  }

  const created = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
  }).format(new Date(profile.created_at));
  const activeRole = getActiveRole(profile);
  const avatarUrl = getProfileAvatarUrl(profile, user);
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-3xl font-black">Your profile</h1>
      <p className="mt-2 text-slate-600">
        Keep your contact information and reusable addresses up to date.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center p-7 text-center">
            <Avatar className="h-24 w-24">
              {avatarUrl && (
                <AvatarImage
                  src={avatarUrl}
                  alt={`${profile.full_name} profile photo`}
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback className="text-2xl">
                {getProfileInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-5 text-xl font-bold">{profile.full_name}</h2>
            <Badge className="mt-2">{ROLE_LABELS[activeRole]} workspace</Badge>
            <div className="mt-7 w-full space-y-4 text-left text-sm">
              <p className="flex gap-3 text-slate-600">
                <Mail className="h-5 w-5 shrink-0" />
                <span className="break-all">{profile.email}</span>
              </p>
              <p className="flex gap-3 text-slate-600">
                <Phone className="h-5 w-5 shrink-0" />
                {profile.phone_number || "Not provided"}
              </p>
              <p className="flex gap-3 text-slate-600">
                <CalendarDays className="h-5 w-5 shrink-0" />
                Joined {created}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Edit contact details</CardTitle>
            <CardDescription>
              Your contact details are shared by both workspaces. Account email
              and original onboarding choice remain protected.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                id="profileName"
                label="Full name"
                error={errors.fullName?.message}
              >
                <Input
                  id="profileName"
                  autoComplete="name"
                  {...register("fullName")}
                />
              </FormField>
              <FormField
                id="profilePhone"
                label="Phone number"
                error={errors.phoneNumber?.message}
              >
                <Input
                  id="profilePhone"
                  type="tel"
                  autoComplete="tel"
                  {...register("phoneNumber")}
                />
              </FormField>
              <FormField id="profileEmail" label="Email address">
                <Input
                  id="profileEmail"
                  value={profile.email}
                  disabled
                  readOnly
                />
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <LockKeyhole className="h-3 w-3" />
                  Email changes are not available in this milestone.
                </p>
              </FormField>
              <FormField
                id="profileRole"
                label={
                  activeRole === USER_ROLES.ADMIN
                    ? "Account role"
                    : "Starting mode"
                }
              >
                <Input
                  id="profileRole"
                  value={ROLE_LABELS[profile.role]}
                  disabled
                  readOnly
                />
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <LockKeyhole className="h-3 w-3" />
                  {activeRole === USER_ROLES.ADMIN
                    ? "Admin access is never assigned through public onboarding."
                    : "Your onboarding choice is retained for account history."}
                </p>
              </FormField>
              <FormField id="profileActiveRole" label="Current workspace">
                <Input
                  id="profileActiveRole"
                  value={ROLE_LABELS[activeRole]}
                  disabled
                  readOnly
                />
                <p className="text-xs text-slate-500">
                  {activeRole === USER_ROLES.ADMIN
                    ? "Admin access is assigned and managed only through the protected backend."
                    : "Use the workspace switcher in the account navigation to change modes."}
                </p>
              </FormField>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <UserRound className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardContent className="flex gap-5 p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">
                Google account sign-in
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                ButuanGo does not store a separate password. Manage your
                password, recovery methods, and account access directly through
                Google.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {activeRole !== USER_ROLES.ADMIN && (
        <>
          <SavedAddressManager profile={profile} />
          <AccountDeletionPanel />
        </>
      )}
    </div>
  );
}
