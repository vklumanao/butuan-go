import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LoaderCircle,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { savedAddressSchema } from "@/validation/addressSchema";
import {
  deleteSavedAddress,
  getSavedAddresses,
  saveSavedAddress,
  setDefaultSavedAddress,
} from "@/services/addressService";
import { devLog } from "@/lib/errors";
import { FormField } from "@/components/common/FormField";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function addressDefaults(profile) {
  return {
    label: "Home",
    recipientName: profile.full_name || "",
    phoneNumber: profile.phone_number || "",
    fullAddress: "",
    landmark: "",
    instructions: "",
    isDefault: false,
  };
}

export function SavedAddressManager({ profile }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultingId, setDefaultingId] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: addressDefaults(profile),
  });

  function applyAddressResult({ data, error }) {
    if (error) {
      devLog("Saved address retrieval failed", error);
      setLoadError("We could not load your saved addresses.");
    } else {
      setAddresses(data || []);
      setLoadError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    getSavedAddresses().then((result) => {
      if (active) applyAddressResult(result);
    });
    return () => {
      active = false;
    };
  }, []);

  async function reloadAddresses() {
    setLoading(true);
    applyAddressResult(await getSavedAddresses());
  }

  function openNewAddress() {
    setEditingAddress(null);
    setFormError("");
    reset({ ...addressDefaults(profile), isDefault: addresses.length === 0 });
    setEditorOpen(true);
  }

  function openEditAddress(address) {
    setEditingAddress(address);
    setFormError("");
    reset({
      label: address.label,
      recipientName: address.recipient_name,
      phoneNumber: address.phone_number,
      fullAddress: address.full_address,
      landmark: address.landmark || "",
      instructions: address.instructions || "",
      isDefault: address.is_default,
    });
    setEditorOpen(true);
  }

  async function onSave(values) {
    setFormError("");
    const { error } = await saveSavedAddress(editingAddress?.id, values);
    if (error) {
      devLog("Saved address update failed", error);
      setFormError(
        "We could not save this address. Check the details and try again.",
      );
      return;
    }
    toast.success(
      editingAddress
        ? "Saved address updated."
        : "Address added to your profile.",
    );
    setEditorOpen(false);
    await reloadAddresses();
  }

  async function makeDefault(address) {
    setDefaultingId(address.id);
    const { error } = await setDefaultSavedAddress(address.id);
    setDefaultingId(null);
    if (error) {
      devLog("Default address update failed", error);
      toast.error("We could not set that address as your default.");
      return;
    }
    toast.success(`${address.label} is now your default address.`);
    await reloadAddresses();
  }

  async function confirmDelete() {
    setDeleting(true);
    const { error } = await deleteSavedAddress(deleteTarget.id);
    setDeleting(false);
    if (error) {
      devLog("Saved address deletion failed", error);
      toast.error("We could not delete that address.");
      return;
    }
    toast.success("Saved address deleted. Existing requests were not changed.");
    setDeleteTarget(null);
    await reloadAddresses();
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="max-w-2xl">
          <CardTitle>Saved addresses</CardTitle>
          <CardDescription>
            Your private address book is shared across both workspaces. Use a
            saved address when creating a request; existing requests keep their
            own snapshot if you edit or delete it here.
          </CardDescription>
        </div>
        <Button onClick={openNewAddress} className="w-auto shrink-0 self-start">
          <Plus className="h-4 w-4" />
          <span>Add address</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 p-5"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-4 h-4 w-2/3" />
                <Skeleton className="mt-3 h-12 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <Alert variant="destructive">
            {loadError}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={reloadAddresses}
            >
              Try again
            </Button>
          </Alert>
        )}

        {!loading && !loadError && addresses.length === 0 && (
          <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-5 py-10 text-center">
            <MapPinned className="mx-auto h-10 w-10 text-brand-600" />
            <h3 className="mt-4 text-lg font-bold">No saved addresses yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Add Home, Work, or another place to fill private request details
              faster.
            </p>
          </div>
        )}

        {!loading && !loadError && addresses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-xl border border-slate-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50">
                      <MapPin className="h-5 w-5 text-brand-600" />
                    </span>
                    <h3 className="font-bold text-slate-950">
                      {address.label}
                    </h3>
                  </div>
                  {address.is_default && <Badge>Default</Badge>}
                </div>
                <p className="mt-4 font-semibold text-slate-800">
                  {address.recipient_name}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 shrink-0" />
                  {address.phone_number}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {address.full_address}
                </p>
                {address.landmark && (
                  <p className="mt-2 text-sm text-slate-500">
                    Landmark: {address.landmark}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={defaultingId === address.id}
                      onClick={() => makeDefault(address)}
                    >
                      {defaultingId === address.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditAddress(address)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(address)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit saved address" : "Add saved address"}
            </DialogTitle>
            <DialogDescription>
              This private template is visible only to your account until you
              copy it into a request.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="mb-5">
              {formError}
            </Alert>
          )}
          <form
            onSubmit={handleSubmit(onSave)}
            className="space-y-5"
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="addressLabel"
                label="Address label"
                error={errors.label?.message}
              >
                <Input
                  id="addressLabel"
                  placeholder="Home, Work, Family"
                  maxLength={50}
                  {...register("label")}
                />
              </FormField>
              <FormField
                id="addressPhone"
                label="Phone number"
                error={errors.phoneNumber?.message}
              >
                <Input
                  id="addressPhone"
                  type="tel"
                  inputMode="tel"
                  maxLength={30}
                  {...register("phoneNumber")}
                />
              </FormField>
            </div>
            <FormField
              id="addressRecipient"
              label="Recipient or contact name"
              error={errors.recipientName?.message}
            >
              <Input
                id="addressRecipient"
                autoComplete="name"
                maxLength={120}
                {...register("recipientName")}
              />
            </FormField>
            <FormField
              id="addressFull"
              label="Complete address"
              error={errors.fullAddress?.message}
            >
              <Textarea
                id="addressFull"
                className="min-h-24"
                placeholder="House/building, street, barangay, and city"
                maxLength={300}
                {...register("fullAddress")}
              />
            </FormField>
            <FormField
              id="addressLandmark"
              label="Landmark (optional)"
              error={errors.landmark?.message}
            >
              <Input
                id="addressLandmark"
                maxLength={200}
                {...register("landmark")}
              />
            </FormField>
            <FormField
              id="addressInstructions"
              label="Instructions (optional)"
              error={errors.instructions?.message}
            >
              <Textarea
                id="addressInstructions"
                className="min-h-20"
                maxLength={500}
                {...register("instructions")}
              />
            </FormField>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <input
                id="addressDefault"
                type="checkbox"
                className="mt-1 h-4 w-4 accent-brand-600"
                {...register("isDefault")}
              />
              <Label htmlFor="addressDefault">
                Use as my default destination for new requests
              </Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving…" : "Save address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.label}?</DialogTitle>
            <DialogDescription>
              This removes the reusable template only. Existing and accepted
              requests keep their copied address details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Keep address
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {deleting ? "Deleting…" : "Delete address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
