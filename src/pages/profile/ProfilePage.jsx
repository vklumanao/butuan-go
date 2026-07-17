import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  KeyRound,
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
import { requestPasswordReset } from "@/services/authService";
import { updateProfile } from "@/services/profileService";
import { getActiveRole, ROLE_LABELS } from "@/lib/constants";
import { devLog, getFriendlyAuthError } from "@/lib/errors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function initials(name) {
  return (
    name
      ?.split(" ")
      .map((item) => item[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}
export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [formError, setFormError] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
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

  async function handlePasswordReset() {
    const accountEmail = profile.email || user.email;
    if (!accountEmail) {
      toast.error("Your account email could not be found.");
      return;
    }

    setSendingReset(true);
    const { error } = await requestPasswordReset(accountEmail);
    setSendingReset(false);

    if (error) {
      devLog("Profile password reset request failed", error);
      toast.error(getFriendlyAuthError(error, "send a password reset email"));
      return;
    }

    setResetPasswordOpen(false);
    toast.success("Password reset email sent.", {
      description: `Check ${accountEmail} for the secure recovery link.`,
    });
  }
  const created = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
  }).format(new Date(profile.created_at));
  const activeRole = getActiveRole(profile);
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
              <AvatarFallback className="text-2xl">
                {initials(profile.full_name)}
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
              and original registration choice remain protected.
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
              <FormField id="profileRole" label="Starting mode">
                <Input
                  id="profileRole"
                  value={ROLE_LABELS[profile.role]}
                  disabled
                  readOnly
                />
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <LockKeyhole className="h-3 w-3" />
                  Your registration choice is retained for account history.
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
                  Use the workspace switcher in the account navigation to change
                  modes.
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
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">Password security</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                We will email a secure recovery link to your account address.
                Your current session stays active until you complete the reset.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 self-start sm:self-center"
            onClick={() => setResetPasswordOpen(true)}
          >
            <KeyRound className="h-4 w-4" />
            Reset Password
          </Button>
        </CardContent>
      </Card>
      <SavedAddressManager profile={profile} />

      <Dialog
        open={resetPasswordOpen}
        onOpenChange={(open) => {
          if (!sendingReset) setResetPasswordOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader className="mb-5 pr-8">
            <DialogTitle>Reset your password?</DialogTitle>
            <DialogDescription>
              ButuanGo will send a secure recovery link to your account email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Recovery email
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                {profile.email || user.email}
              </p>
            </div>
            <Alert>
              Open only the latest recovery email you requested. Never share the
              reset link or your password with another person.
            </Alert>
          </div>

          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button variant="outline" disabled={sendingReset}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handlePasswordReset} disabled={sendingReset}>
              {sendingReset && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {sendingReset ? "Sending…" : "Send recovery link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
