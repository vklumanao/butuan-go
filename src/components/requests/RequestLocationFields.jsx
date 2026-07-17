import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole, MapPin, Phone, Store } from "lucide-react";
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
} from "@/lib/requestConstants";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSavedAddresses } from "@/services/addressService";
import { devLog } from "@/lib/errors";

function SavedAddressSelector({
  id,
  label,
  addresses,
  loading,
  value,
  onChange,
}) {
  return (
    <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
      <label htmlFor={id} className="text-sm font-semibold text-brand-900">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={loading}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 flex h-10 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20 disabled:opacity-60"
      >
        <option value="">
          {loading ? "Loading saved addresses…" : "Choose a saved address (optional)"}
        </option>
        {addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label}{address.is_default ? " — Default" : ""}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs leading-5 text-brand-900/70">
        Selecting an address copies a snapshot into this request. You can still
        edit the copied fields below.{" "}
        <Link to="/requestor/profile" className="font-semibold underline">
          Manage saved addresses
        </Link>
      </p>
    </div>
  );
}

export function RequestLocationFields({
  register,
  errors,
  fulfillmentType,
  idPrefix = "location",
  setValue,
  applyDefaultAddress = false,
}) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [pickupSavedId, setPickupSavedId] = useState("");
  const [deliverySavedId, setDeliverySavedId] = useState("");
  const defaultApplied = useRef(false);
  const needsPickup = [
    FULFILLMENT_TYPES.PICKUP_ONLY,
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
  ].includes(fulfillmentType);

  const copyAddress = useCallback((address, target) => {
    setValue(`${target}Address`, address.full_address, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`${target}Landmark`, address.landmark || "", {
      shouldDirty: true,
    });
    setValue(`${target}Instructions`, address.instructions || "", {
      shouldDirty: true,
    });
    if (target === "delivery" || fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY) {
      setValue("contactName", address.recipient_name, { shouldDirty: true });
      setValue("contactPhone", address.phone_number, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [fulfillmentType, setValue]);

  function selectSavedAddress(addressId, target) {
    if (target === "pickup") setPickupSavedId(addressId);
    else setDeliverySavedId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (address) copyAddress(address, target);
  }

  useEffect(() => {
    let active = true;
    getSavedAddresses().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        devLog("Saved address selector retrieval failed", error);
      } else {
        const addresses = data || [];
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((address) => address.is_default);
        if (applyDefaultAddress && defaultAddress && !defaultApplied.current) {
          defaultApplied.current = true;
          const target =
            fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
              ? "pickup"
              : "delivery";
          if (target === "pickup") setPickupSavedId(defaultAddress.id);
          else setDeliverySavedId(defaultAddress.id);
          copyAddress(defaultAddress, target);
        }
      }
      setAddressesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [applyDefaultAddress, copyAddress, fulfillmentType]);
  const needsDelivery = [
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    FULFILLMENT_TYPES.ON_SITE,
  ].includes(fulfillmentType);

  return (
    <div className="space-y-6">
      <Alert className="border-brand-200 bg-brand-50/60">
        <LockKeyhole className="mb-2 h-5 w-5 text-brand-700" />
        <p className="font-semibold text-brand-900">Private location details</p>
        <p className="mt-1 text-sm leading-6 text-brand-900/80">
          Exact addresses and contact details are shown only to you and the
          assigned Runner after acceptance. Never enter passwords, PINs,
          payment credentials, or government identifiers.
        </p>
      </Alert>

      <FormField
        id={`${idPrefix}FulfillmentType`}
        label="How will this request be fulfilled?"
        error={errors.fulfillmentType?.message}
      >
        <select
          id={`${idPrefix}FulfillmentType`}
          className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
          {...register("fulfillmentType")}
        >
          {Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      {needsPickup && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <Store className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Pickup details</h3>
          </div>
          <SavedAddressSelector
            id={`${idPrefix}PickupSavedAddress`}
            label="Use a saved pickup address"
            addresses={savedAddresses}
            loading={addressesLoading}
            value={pickupSavedId}
            onChange={(addressId) => selectSavedAddress(addressId, "pickup")}
          />
          <div className="space-y-5">
            <FormField
              id={`${idPrefix}PickupAddress`}
              label="Exact pickup address"
              error={errors.pickupAddress?.message}
            >
              <Textarea
                id={`${idPrefix}PickupAddress`}
                className="min-h-20"
                placeholder="Store/building, street, barangay, and city"
                maxLength={300}
                {...register("pickupAddress")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}PickupLandmark`}
              label="Pickup landmark (optional)"
              error={errors.pickupLandmark?.message}
            >
              <Input
                id={`${idPrefix}PickupLandmark`}
                placeholder="Example: Beside the public market entrance"
                maxLength={200}
                {...register("pickupLandmark")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}PickupInstructions`}
              label="Pickup instructions (optional)"
              error={errors.pickupInstructions?.message}
            >
              <Textarea
                id={`${idPrefix}PickupInstructions`}
                className="min-h-20"
                placeholder="Who to approach or what to ask for"
                maxLength={500}
                {...register("pickupInstructions")}
              />
            </FormField>
          </div>
        </section>
      )}

      {needsDelivery && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">
              {fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Destination details"
                : "Delivery details"}
            </h3>
          </div>
          <SavedAddressSelector
            id={`${idPrefix}DeliverySavedAddress`}
            label={
              fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Use a saved destination"
                : "Use a saved delivery address"
            }
            addresses={savedAddresses}
            loading={addressesLoading}
            value={deliverySavedId}
            onChange={(addressId) => selectSavedAddress(addressId, "delivery")}
          />
          <div className="space-y-5">
            <FormField
              id={`${idPrefix}DeliveryAddress`}
              label="Exact delivery or destination address"
              error={errors.deliveryAddress?.message}
            >
              <Textarea
                id={`${idPrefix}DeliveryAddress`}
                className="min-h-20"
                placeholder="House/building, street, barangay, and city"
                maxLength={300}
                {...register("deliveryAddress")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}DeliveryLandmark`}
              label="Landmark (optional)"
              error={errors.deliveryLandmark?.message}
            >
              <Input
                id={`${idPrefix}DeliveryLandmark`}
                placeholder="Example: Near the pharmacy"
                maxLength={200}
                {...register("deliveryLandmark")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}DeliveryInstructions`}
              label="Instructions (optional)"
              error={errors.deliveryInstructions?.message}
            >
              <Textarea
                id={`${idPrefix}DeliveryInstructions`}
                className="min-h-20"
                placeholder="Example: Call when you reach the gate"
                maxLength={500}
                {...register("deliveryInstructions")}
              />
            </FormField>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <Phone className="h-5 w-5 text-brand-600" />
          <h3 className="font-bold">Task contact</h3>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id={`${idPrefix}ContactName`}
            label="Contact name"
            error={errors.contactName?.message}
          >
            <Input
              id={`${idPrefix}ContactName`}
              autoComplete="name"
              maxLength={120}
              {...register("contactName")}
            />
          </FormField>
          <FormField
            id={`${idPrefix}ContactPhone`}
            label="Contact phone"
            error={errors.contactPhone?.message}
          >
            <Input
              id={`${idPrefix}ContactPhone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              {...register("contactPhone")}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
