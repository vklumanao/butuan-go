import { useEffect, useState } from "react";
import { MapPin, Phone, Store, UserRound, UsersRound } from "lucide-react";
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
} from "@/lib/requestConstants";
import { getLocationRequirements } from "@/lib/requestScenarioUtils";
import { getSavedAddresses } from "@/services/addressService";
import { devLog } from "@/lib/errors";
import {
  ExactLocationPicker,
  SavedAddressSelector,
} from "@/components/requests/RequestLocationFields";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function ContactFields({
  idPrefix,
  register,
  errors,
  nameField,
  phoneField,
  label,
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField
        id={`${idPrefix}Name`}
        label={`${label} name`}
        error={errors[nameField]?.message}
      >
        <Input
          id={`${idPrefix}Name`}
          autoComplete="name"
          maxLength={120}
          {...register(nameField)}
        />
      </FormField>
      <FormField
        id={`${idPrefix}Phone`}
        label={`${label} phone`}
        error={errors[phoneField]?.message}
      >
        <Input
          id={`${idPrefix}Phone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          {...register(phoneField)}
        />
      </FormField>
    </div>
  );
}

function AddressFields({
  idPrefix,
  register,
  errors,
  fieldPrefix,
  destination = false,
}) {
  return (
    <div className="space-y-5">
      <FormField
        id={`${idPrefix}Address`}
        label={
          destination
            ? "Exact delivery or task address"
            : "Exact pickup address"
        }
        error={errors[`${fieldPrefix}Address`]?.message}
      >
        <Textarea
          id={`${idPrefix}Address`}
          className="min-h-20"
          placeholder="Building, street, barangay, and city"
          maxLength={300}
          {...register(`${fieldPrefix}Address`)}
        />
      </FormField>
      <FormField
        id={`${idPrefix}Landmark`}
        label="Landmark (optional)"
        error={errors[`${fieldPrefix}Landmark`]?.message}
      >
        <Input
          id={`${idPrefix}Landmark`}
          placeholder="Example: Near the pharmacy"
          maxLength={200}
          {...register(`${fieldPrefix}Landmark`)}
        />
      </FormField>
      <FormField
        id={`${idPrefix}Instructions`}
        label="Instructions (optional)"
        error={errors[`${fieldPrefix}Instructions`]?.message}
      >
        <Textarea
          id={`${idPrefix}Instructions`}
          className="min-h-20"
          placeholder={
            destination
              ? "Who will receive the item or how to complete the on-site task"
              : "Who to approach or what to ask for"
          }
          maxLength={500}
          {...register(`${fieldPrefix}Instructions`)}
        />
      </FormField>
    </div>
  );
}

export function ScenarioLocationFields({
  control,
  register,
  errors,
  setValue,
  trigger,
  fulfillmentType,
  profile,
  contactIsRequestor,
  requestorPresentAtHandoff = true,
  showFulfillmentSelector = false,
  onFulfillmentChange = null,
  onPrimaryAreaSuggested = null,
  idPrefix = "scenarioLocation",
}) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [pickupSavedId, setPickupSavedId] = useState("");
  const [destinationSavedId, setDestinationSavedId] = useState("");
  const { needsPickup, needsDestination } =
    getLocationRequirements(fulfillmentType);
  const handoffAtPickup = fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY;

  useEffect(() => {
    let active = true;
    getSavedAddresses().then(({ data, error }) => {
      if (!active) return;
      if (error) devLog("Saved address selector retrieval failed", error);
      else setSavedAddresses(data || []);
      setLoadingAddresses(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function copySavedAddress(addressId, target) {
    if (target === "pickup") setPickupSavedId(addressId);
    else setDestinationSavedId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (!address) return;

    const fieldPrefix = target === "pickup" ? "pickup" : "delivery";
    setValue(`${fieldPrefix}Address`, address.full_address, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`${fieldPrefix}Landmark`, address.landmark || "", {
      shouldDirty: true,
    });
    setValue(`${fieldPrefix}Instructions`, address.instructions || "", {
      shouldDirty: true,
    });

    if (address.recipient_name || address.phone_number) {
      const contactPrefix =
        target === "pickup" ? "pickupContact" : "destinationContact";
      setValue(`${contactPrefix}Name`, address.recipient_name || "", {
        shouldDirty: true,
      });
      setValue(`${contactPrefix}Phone`, address.phone_number || "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (
        (handoffAtPickup && target === "pickup") ||
        target === "destination"
      ) {
        setValue("contactIsRequestor", false, { shouldDirty: true });
        setValue("requestorPresentAtHandoff", false, { shouldDirty: true });
      }
    }
  }

  function chooseHandoffContact(isRequestor) {
    setValue("contactIsRequestor", isRequestor, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("requestorPresentAtHandoff", isRequestor, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const prefix = handoffAtPickup ? "pickupContact" : "destinationContact";
    setValue(`${prefix}Name`, isRequestor ? profile.full_name || "" : "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`${prefix}Phone`, isRequestor ? profile.phone_number || "" : "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="space-y-6">
      <input type="hidden" {...register("contactIsRequestor")} />
      <input type="hidden" {...register("requestorPresentAtHandoff")} />
      {!showFulfillmentSelector && (
        <input type="hidden" {...register("fulfillmentType")} />
      )}
      {showFulfillmentSelector ? (
        <FormField
          id={`${idPrefix}FulfillmentType`}
          label="How will this custom request be fulfilled?"
          error={errors.fulfillmentType?.message}
        >
          <select
            id={`${idPrefix}FulfillmentType`}
            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
            {...register("fulfillmentType", {
              onChange: (event) => onFulfillmentChange?.(event.target.value),
            })}
          >
            {Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      ) : (
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Location setup
          </p>
          <p className="mt-1 font-bold text-slate-950">
            {FULFILLMENT_TYPE_LABELS[fulfillmentType]}
          </p>
        </div>
      )}

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
            loading={loadingAddresses}
            value={pickupSavedId}
            onChange={(addressId) => copySavedAddress(addressId, "pickup")}
          />
          <AddressFields
            idPrefix={`${idPrefix}Pickup`}
            register={register}
            errors={errors}
            fieldPrefix="pickup"
          />
          <div className="mt-5">
            <ExactLocationPicker
              control={control}
              register={register}
              setValue={setValue}
              trigger={trigger}
              errors={errors}
              idPrefix={`${idPrefix}PickupPin`}
              title="Exact pickup point"
              description="Place the private pin where the Runner should collect the item. Only an automatically generated shaded area is public before acceptance."
              currentLocationLabel="Use my current location as pickup"
              onAreaSuggested={onPrimaryAreaSuggested}
              onAddressSuggested={(address) =>
                setValue("pickupAddress", address, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              embedded
            />
          </div>
          {!handoffAtPickup && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="mb-4 flex items-start gap-2">
                <Phone className="mt-0.5 h-5 w-5 text-brand-600" />
                <div>
                  <h4 className="font-bold">Pickup contact</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    The person or merchant who will release the item.
                  </p>
                </div>
              </div>
              <ContactFields
                idPrefix={`${idPrefix}PickupContact`}
                register={register}
                errors={errors}
                nameField="pickupContactName"
                phoneField="pickupContactPhone"
                label="Pickup contact"
              />
            </div>
          )}
        </section>
      )}

      {needsDestination && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">
              {fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Task destination"
                : "Delivery details"}
            </h3>
          </div>
          <SavedAddressSelector
            id={`${idPrefix}DestinationSavedAddress`}
            label={
              fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Use a saved task destination"
                : "Use a saved delivery address"
            }
            addresses={savedAddresses}
            loading={loadingAddresses}
            value={destinationSavedId}
            onChange={(addressId) => copySavedAddress(addressId, "destination")}
          />
          <AddressFields
            idPrefix={`${idPrefix}Destination`}
            register={register}
            errors={errors}
            fieldPrefix="delivery"
            destination
          />
          <div className="mt-5">
            <ExactLocationPicker
              control={control}
              register={register}
              setValue={setValue}
              trigger={trigger}
              errors={errors}
              idPrefix={`${idPrefix}DestinationPin`}
              latitudeName={
                needsPickup ? "destinationExactLatitude" : "exactLatitude"
              }
              longitudeName={
                needsPickup ? "destinationExactLongitude" : "exactLongitude"
              }
              title={
                fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                  ? "Exact task point"
                  : "Exact delivery point"
              }
              description="Place the private pin at the real destination. Only an automatically generated shaded area is public before acceptance."
              currentLocationLabel={
                fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                  ? "Use my current location as task point"
                  : "Use my current location as delivery"
              }
              onAreaSuggested={needsPickup ? null : onPrimaryAreaSuggested}
              onAddressSuggested={(address) =>
                setValue("deliveryAddress", address, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              embedded
            />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-2">
          <Phone className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h3 className="font-bold">
              {handoffAtPickup
                ? "Who receives the pickup?"
                : "Who receives the task or delivery?"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              This is the handoff contact and may also be selected as payer.
            </p>
          </div>
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={contactIsRequestor}
            onClick={() => chooseHandoffContact(true)}
            className={`rounded-xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600/30 ${
              contactIsRequestor
                ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                : "border-slate-200 bg-white hover:border-brand-300"
            }`}
          >
            <UserRound className="h-5 w-5 text-brand-700" />
            <span className="mt-2 block font-bold">Me</span>
            <span className="mt-1 block text-xs text-slate-600">
              Use my profile contact details.
            </span>
          </button>
          <button
            type="button"
            aria-pressed={!contactIsRequestor}
            onClick={() => chooseHandoffContact(false)}
            className={`rounded-xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600/30 ${
              !contactIsRequestor
                ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                : "border-slate-200 bg-white hover:border-brand-300"
            }`}
          >
            <UsersRound className="h-5 w-5 text-brand-700" />
            <span className="mt-2 block font-bold">Someone else</span>
            <span className="mt-1 block text-xs text-slate-600">
              Add the recipient or authorized contact.
            </span>
          </button>
        </div>
        <ContactFields
          idPrefix={`${idPrefix}HandoffContact`}
          register={register}
          errors={errors}
          nameField={
            handoffAtPickup ? "pickupContactName" : "destinationContactName"
          }
          phoneField={
            handoffAtPickup ? "pickupContactPhone" : "destinationContactPhone"
          }
          label={handoffAtPickup ? "Pickup recipient" : "Recipient or contact"}
        />
        {!contactIsRequestor && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-amber-400"
              checked={requestorPresentAtHandoff}
              onChange={(event) =>
                setValue("requestorPresentAtHandoff", event.target.checked, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <span>
              <strong className="block">I will also be at the handoff</strong>
              Leave this unchecked if only the task contact will meet the
              Runner. The Payment step will require that person as payer.
            </span>
          </label>
        )}
      </section>
    </div>
  );
}
